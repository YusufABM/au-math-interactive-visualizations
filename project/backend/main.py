# backend/main.py
# Role: FastAPI application for dynamic toric surface computation.
#       Computes heatmap slices on-request using core geometry and evaluator.

import os
import json
import secrets
import logging
from pathlib import Path
from typing import Literal, Optional

import sys

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from core.geometry_manager import GeometryManager
from core.geometry import GeometryBuilder
from core.evaluator import compute_grid, AxisSpec, intersection_calculator, compute_anti_canonical

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

try:
    from scipy.optimize import linprog as _linprog
    _HAS_SCIPY = True
except ImportError:
    _HAS_SCIPY = False

HOMEPAGE_FILE     = os.environ.get("HOMEPAGE_FILE",     "data/homepage.json")
HOMEPAGE_PASSWORD = os.environ.get("HOMEPAGE_PASSWORD", "changeme")

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class SurfaceVariant(BaseModel):
    key: str
    label: str

class SurfaceGroup(BaseModel):
    name: str
    variants: list[SurfaceVariant]

class SurfaceCatalogue(BaseModel):
    groups: list[SurfaceGroup]

class AxisSpecModel(BaseModel):
    vector: Literal["alpha", "beta"]
    k: int = Field(ge=0)

class ComputeRequest(BaseModel):
    rays: list[list[float]]
    equation: Literal["J(alpha,beta)", "I(alpha)"]
    alpha: list[float]
    beta: list[float]
    x_axis: AxisSpecModel
    y_axis: AxisSpecModel
    resolution: int = Field(default=100, ge=10, le=500)

class ComputeResult(BaseModel):
    sign_matrix: list[list[Optional[float]]]
    div_matrix: list[list[int]]
    x_values: list[float]
    y_values: list[float]

class SurfaceInfoRequest(BaseModel):
    rays: list[list[float]]

class SurfaceInfoResult(BaseModel):
    n_rays: int
    n_pic: int
    intersection_matrix: list[list[int]]
    inequality_coefficients: list[list[float]]
    inequality_strings: list[str]
    cone_labels: list[str]
    ray_labels: list[str]
    valid_blowdown_indices: list[int]

class BlowupRequest(BaseModel):
    rays: list[list[float]]
    cone_index: int

class BlowdownRequest(BaseModel):
    rays: list[list[float]]
    ray_index: int
    base_rays: list[list[float]]

class BlowResult(BaseModel):
    rays: list[list[float]]

class HomepageContent(BaseModel):
    title: str
    body: str

class HomepageUpdateRequest(BaseModel):
    password: str
    title: str
    body: str

# ---------------------------------------------------------------------------
# Homepage persistence
# ---------------------------------------------------------------------------

_DEFAULT_HOMEPAGE = HomepageContent(
    title="cscK Metrics and the $J$-equation on Toric Blowups",
    body=(
        "This site presents interactive visualisations of results "
        "from a research project on the existence of constant scalar curvature "
        "Kahler (cscK) metrics and solutions to the $J$-equation on blowups of "
        "toric surfaces."
    ),
)

def _load_homepage() -> HomepageContent:
    path = Path(HOMEPAGE_FILE)
    if path.exists():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            return HomepageContent(**data)
        except Exception as exc:
            logger.warning("Could not read homepage file %s: %s", HOMEPAGE_FILE, exc)
    return _DEFAULT_HOMEPAGE

def _save_homepage(content: HomepageContent) -> None:
    path = Path(HOMEPAGE_FILE)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps({"title": content.title, "body": content.body}, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

# ---------------------------------------------------------------------------
# Kahler inequality helpers (numpy-only, no sympy/scipy dependency)
# ---------------------------------------------------------------------------

_PIC_LETTERS = "abcdefghijklmnopqrstuvwxyz"


def _format_inequality(coeffs: np.ndarray) -> str:
    """Format constraint sum_k c_k * alpha_k > 0 as a human-readable string."""
    pos, neg = [], []
    for k, c in enumerate(coeffs):
        if abs(c) < 1e-9:
            continue
        letter = _PIC_LETTERS[k] if k < len(_PIC_LETTERS) else f"x{k}"
        mag = abs(c)
        prefix = "" if abs(mag - 1.0) < 1e-9 else str(int(round(mag)))
        term = f"{prefix}{letter}"
        (pos if c > 0 else neg).append(term)
    lhs = " + ".join(pos) or "0"
    rhs = " + ".join(neg) or "0"
    return f"{lhs} > {rhs}"


def _remove_duplicate_constraints(rows: list) -> list:
    """Remove constraint vectors that are positive scalar multiples of an existing one."""
    unique = []
    for c in rows:
        norm = np.linalg.norm(c)
        if norm < 1e-9:
            continue
        c_hat = c / norm
        if not any(np.dot(c_hat, u / np.linalg.norm(u)) > 1 - 1e-9 for u in unique):
            unique.append(c)
    return unique


def _is_redundant_lp(constraints: list, i: int) -> bool:
    """Return True if constraint i is implied by all others (requires scipy)."""
    n = len(constraints[0])
    A_ub, b_ub = [], []
    for j, c in enumerate(constraints):
        if j == i:
            A_ub.append(c.tolist())       # c_i . x <= -eps  (find a violating point)
            b_ub.append(-1e-6)
        else:
            A_ub.append((-c).tolist())    # -c_j . x <= 0  (c_j . x >= 0)
            b_ub.append(0.0)
    res = _linprog([0.0] * n, A_ub=A_ub, b_ub=b_ub, method="highs")
    return not res.success


def _compute_kaehler_inequalities(surface) -> tuple[list, list]:
    P  = np.array(surface.picard_generators, dtype=float)   # (n_pic, n_rays)
    IM = np.array(surface.intersection_matrix, dtype=float)  # (n_rays, n_rays)
    B  = P @ IM                                              # (n_pic, n_rays)

    raw = [B[:, i] for i in range(B.shape[1])]
    constraints = _remove_duplicate_constraints(raw)

    if _HAS_SCIPY and len(constraints) > 1:
        redundant = {i for i in range(len(constraints)) if _is_redundant_lp(constraints, i)}
        constraints = [c for i, c in enumerate(constraints) if i not in redundant]

    strings = [_format_inequality(c) for c in constraints]
    coeffs  = [c.tolist() for c in constraints]
    return coeffs, strings

# ---------------------------------------------------------------------------
# Blow-down validity
# ---------------------------------------------------------------------------

def _is_minus_one_curve(surface, ray_index: int) -> bool:
    n   = len(surface.rays)
    div = [0] * n
    div[ray_index % n] = 1
    if intersection_calculator(div, div, surface) != -1:
        return False
    antican = compute_anti_canonical(surface)
    return intersection_calculator(div, antican, surface) == 1

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(title="cscK / J-eq Toric Surface API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/surfaces", response_model=SurfaceCatalogue)
def list_surfaces() -> SurfaceCatalogue:
    groups = [
        SurfaceGroup(
            name=group_name,
            variants=[SurfaceVariant(key=key, label=label) for key, label in variants],
        )
        for group_name, variants in GeometryManager.SURFACE_GROUPS.items()
    ]
    return SurfaceCatalogue(groups=groups)

@app.post("/api/compute", response_model=ComputeResult)
def compute_heatmap(req: ComputeRequest) -> ComputeResult:
    if len(req.rays) < 3:
        raise HTTPException(status_code=422, detail="rays must have at least 3 entries")

    surface = GeometryBuilder([tuple(r) for r in req.rays]).build()
    n_pic   = len(surface.picard_generators)

    if len(req.alpha) != n_pic:
        raise HTTPException(
            status_code=422,
            detail=f"alpha has {len(req.alpha)} coefficients; surface has {n_pic} Picard generators",
        )
    if len(req.beta) != n_pic:
        raise HTTPException(
            status_code=422,
            detail=f"beta has {len(req.beta)} coefficients; surface has {n_pic} Picard generators",
        )
    for name, ax in [("x_axis", req.x_axis), ("y_axis", req.y_axis)]:
        if ax.k >= n_pic:
            raise HTTPException(
                status_code=422,
                detail=f"{name}.k={ax.k} out of range for n_pic={n_pic}",
            )
    if req.x_axis.vector == req.y_axis.vector and req.x_axis.k == req.y_axis.k:
        raise HTTPException(status_code=422, detail="x_axis and y_axis must differ")

    axis_values = np.linspace(np.finfo(float).eps, 1.0, req.resolution)

    _, _, J, _, div_grid = compute_grid(
        equation_name=req.equation,
        base_alpha=np.array(req.alpha, dtype=float),
        base_beta=np.array(req.beta, dtype=float),
        x_axis=AxisSpec(req.x_axis.vector, req.x_axis.k),
        y_axis=AxisSpec(req.y_axis.vector, req.y_axis.k),
        surface=surface,
        axis_values=axis_values,
    )

    sign_matrix = [
        [None if not np.isfinite(v) else float(v) for v in row]
        for row in J
    ]
    div_matrix = [[int(v) for v in row] for row in div_grid]
    vals = [float(v) for v in axis_values]

    return ComputeResult(
        sign_matrix=sign_matrix,
        div_matrix=div_matrix,
        x_values=vals,
        y_values=vals,
    )

@app.post("/api/surface_info", response_model=SurfaceInfoResult)
def surface_info(req: SurfaceInfoRequest) -> SurfaceInfoResult:
    if len(req.rays) < 3:
        raise HTTPException(status_code=422, detail="rays must have at least 3 entries")

    rays    = [tuple(map(float, r)) for r in req.rays]
    surface = GeometryBuilder(rays).build()
    n_rays  = len(rays)

    cone_labels = [
        f"Cone {i}: {list(map(int, rays[i]))} ^ {list(map(int, rays[(i+1) % n_rays]))}"
        for i in range(n_rays)
    ]

    valid_bd  = [i for i in range(n_rays) if _is_minus_one_curve(surface, i)]
    ray_labels = [
        f"Ray {i}: {list(map(int, rays[i]))}{'  (-1)' if i in valid_bd else ''}"
        for i in range(n_rays)
    ]

    coefficients, strings = _compute_kaehler_inequalities(surface)

    return SurfaceInfoResult(
        n_rays=n_rays,
        n_pic=len(surface.picard_generators),
        intersection_matrix=surface.intersection_matrix.tolist(),
        inequality_coefficients=coefficients,
        inequality_strings=strings,
        cone_labels=cone_labels,
        ray_labels=ray_labels,
        valid_blowdown_indices=valid_bd,
    )

@app.post("/api/blowup", response_model=BlowResult)
def blowup(req: BlowupRequest) -> BlowResult:
    if len(req.rays) < 3:
        raise HTTPException(status_code=422, detail="rays must have at least 3 entries")
    rays = [tuple(map(float, r)) for r in req.rays]
    n    = len(rays)
    i    = req.cone_index % n
    j    = (req.cone_index + 1) % n
    new_ray   = (rays[i][0] + rays[j][0], rays[i][1] + rays[j][1])
    insert_at = j if j > i else i + 1
    rays = list(rays)
    rays.insert(insert_at, new_ray)
    return BlowResult(rays=[list(r) for r in rays])

@app.post("/api/blowdown", response_model=BlowResult)
def blowdown(req: BlowdownRequest) -> BlowResult:
    if len(req.rays) < 4:
        raise HTTPException(status_code=422, detail="Cannot blow down: need at least 4 rays")
    rays  = [tuple(map(float, r)) for r in req.rays]
    idx   = req.ray_index % len(rays)
    base  = {tuple(map(float, r)) for r in req.base_rays}

    if rays[idx] in base:
        raise HTTPException(
            status_code=422, detail="This ray belongs to the base fan and cannot be blown down."
        )

    surface = GeometryBuilder(rays).build()
    if not _is_minus_one_curve(surface, idx):
        raise HTTPException(
            status_code=422, detail="This ray is not a (-1)-curve and cannot be blown down."
        )

    new_rays = [r for k, r in enumerate(rays) if k != idx]
    return BlowResult(rays=[list(r) for r in new_rays])

@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}

@app.get("/api/homepage", response_model=HomepageContent)
def get_homepage() -> HomepageContent:
    return _load_homepage()

@app.post("/api/homepage", response_model=HomepageContent)
def update_homepage(req: HomepageUpdateRequest) -> HomepageContent:
    if not secrets.compare_digest(req.password, HOMEPAGE_PASSWORD):
        raise HTTPException(status_code=401, detail="Incorrect password")
    content = HomepageContent(title=req.title, body=req.body)
    _save_homepage(content)
    return content
