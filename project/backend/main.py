# backend/main.py
# Role: FastAPI application for dynamic toric surface computation.

import os
import json
import secrets
import logging
from functools import lru_cache
from pathlib import Path
from typing import Literal, Optional

import sys
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from core.geometry_manager import GeometryManager
from core.geometry import GeometryBuilder
from core.evaluator import compute_grid, AxisSpec

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

try:
    from scipy.optimize import linprog as _linprog
    _HAS_SCIPY = True
except ImportError:
    _HAS_SCIPY = False

HOMEPAGE_FILE       = os.environ.get("HOMEPAGE_FILE",       "data/homepage.json")
SURFACE_LABELS_FILE = os.environ.get("SURFACE_LABELS_FILE", "data/surface_labels.json")
HOMEPAGE_PASSWORD   = os.environ.get("HOMEPAGE_PASSWORD",   "changeme")

# ---------------------------------------------------------------------------
# Default equation metadata — keys are fixed, labels/descriptions are editable
# ---------------------------------------------------------------------------

_DEFAULT_EQUATION_LABELS: dict[str, dict[str, str]] = {
    "J(alpha,beta)": {"label": "J(α,β) — J-equation",   "description": ""},
    "I(alpha)":      {"label": "I(α)   — cscK quantity", "description": ""},
}

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class SurfaceVariant(BaseModel):
    key: str
    label: str

class SurfaceGroup(BaseModel):
    key: str      # internal identifier, never changes
    name: str     # display label, editable
    variants: list[SurfaceVariant]

class EquationLabelEntry(BaseModel):
    key: str          # "J(alpha,beta)" or "I(alpha)" — never changes
    label: str        # display name shown in the dropdown
    description: str  # optional description shown below the dropdown

class SurfaceCatalogue(BaseModel):
    groups: list[SurfaceGroup]
    equation_labels: list[EquationLabelEntry]

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

class SurfaceLabelEntry(BaseModel):
    key: str
    label: str

class VariantLabelEntry(BaseModel):
    key: str
    group_key: str
    label: str

class SurfaceLabelsResult(BaseModel):
    groups: list[SurfaceLabelEntry]
    variants: list[VariantLabelEntry]
    equations: list[EquationLabelEntry]

class SurfaceLabelsUpdateRequest(BaseModel):
    password: str
    groups: dict[str, str]                # key -> label
    variants: dict[str, str]              # key -> label
    equations: dict[str, dict[str, str]]  # key -> {label, description}

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
# Surface labels persistence
# ---------------------------------------------------------------------------

def _load_surface_labels() -> dict:
    path = Path(SURFACE_LABELS_FILE)
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            logger.warning("Could not read surface labels file: %s", exc)
    return {"groups": {}, "variants": {}, "equations": {}}

def _save_surface_labels(data: dict) -> None:
    path = Path(SURFACE_LABELS_FILE)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

def _resolve_equation_labels(eq_ov: dict) -> list[EquationLabelEntry]:
    return [
        EquationLabelEntry(
            key=k,
            label=eq_ov.get(k, {}).get("label", defaults["label"]),
            description=eq_ov.get(k, {}).get("description", defaults["description"]),
        )
        for k, defaults in _DEFAULT_EQUATION_LABELS.items()
    ]

# ---------------------------------------------------------------------------
# Geometry cache
# ---------------------------------------------------------------------------

def _rays_key(rays: list) -> tuple:
    return tuple(tuple(map(float, r)) for r in rays)

@lru_cache(maxsize=64)
def _build_surface_cached(rays_key: tuple):
    return GeometryBuilder([list(r) for r in rays_key]).build()

# ---------------------------------------------------------------------------
# Kahler inequality helpers
# ---------------------------------------------------------------------------

_PIC_LETTERS = "abcdefghijklmnopqrstuvwxyz"


def _format_inequality(coeffs: np.ndarray) -> str:
    pos, neg = [], []
    for k, c in enumerate(coeffs):
        if abs(c) < 1e-9:
            continue
        letter = _PIC_LETTERS[k] if k < len(_PIC_LETTERS) else f"x{k}"
        mag    = abs(c)
        prefix = "" if abs(mag - 1.0) < 1e-9 else str(int(round(mag)))
        term   = f"{prefix}{letter}"
        (pos if c > 0 else neg).append(term)
    lhs = " + ".join(pos) or "0"
    rhs = " + ".join(neg) or "0"
    return f"{lhs} > {rhs}"


def _remove_duplicate_constraints(rows: list) -> list:
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
    n = len(constraints[0])
    A_ub, b_ub = [], []
    for j, c in enumerate(constraints):
        if j == i:
            A_ub.append(c.tolist())
            b_ub.append(-1e-6)
        else:
            A_ub.append((-c).tolist())
            b_ub.append(0.0)
    res = _linprog([0.0] * n, A_ub=A_ub, b_ub=b_ub, method="highs")
    return not res.success


def _compute_kaehler_inequalities(surface) -> tuple[list, list]:
    P  = np.array(surface.picard_generators, dtype=float)
    IM = np.array(surface.intersection_matrix, dtype=float)
    B  = P @ IM

    raw         = [B[:, i] for i in range(B.shape[1])]
    constraints = _remove_duplicate_constraints(raw)

    if _HAS_SCIPY and len(constraints) > 1:
        redundant   = {i for i in range(len(constraints)) if _is_redundant_lp(constraints, i)}
        constraints = [c for i, c in enumerate(constraints) if i not in redundant]

    strings = [_format_inequality(c) for c in constraints]
    coeffs  = [c.tolist() for c in constraints]
    return coeffs, strings


@lru_cache(maxsize=64)
def _kaehler_inequalities_cached(rays_key: tuple) -> tuple:
    surface = _build_surface_cached(rays_key)
    return _compute_kaehler_inequalities(surface)

# ---------------------------------------------------------------------------
# Blow-down validity — vectorised
# ---------------------------------------------------------------------------

def _valid_blowdown_indices(surface) -> list[int]:
    IM       = np.array(surface.intersection_matrix)
    self_int = np.diag(IM)
    anti_int = IM.sum(axis=1)
    return [i for i in range(len(surface.rays))
            if self_int[i] == -1 and anti_int[i] == 1]

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
    overrides = _load_surface_labels()
    g_ov  = overrides.get("groups",    {})
    v_ov  = overrides.get("variants",  {})
    eq_ov = overrides.get("equations", {})
    groups = [
        SurfaceGroup(
            key=gk,
            name=g_ov.get(gk, gk),
            variants=[SurfaceVariant(key=vk, label=v_ov.get(vk, vl)) for vk, vl in vs],
        )
        for gk, vs in GeometryManager.SURFACE_GROUPS.items()
    ]
    return SurfaceCatalogue(groups=groups, equation_labels=_resolve_equation_labels(eq_ov))

@app.get("/api/surface_labels", response_model=SurfaceLabelsResult)
def get_surface_labels() -> SurfaceLabelsResult:
    overrides = _load_surface_labels()
    g_ov  = overrides.get("groups",    {})
    v_ov  = overrides.get("variants",  {})
    eq_ov = overrides.get("equations", {})
    groups = [
        SurfaceLabelEntry(key=gk, label=g_ov.get(gk, gk))
        for gk in GeometryManager.SURFACE_GROUPS
    ]
    variants = [
        VariantLabelEntry(key=vk, group_key=gk, label=v_ov.get(vk, vl))
        for gk, vs in GeometryManager.SURFACE_GROUPS.items()
        for vk, vl in vs
    ]
    return SurfaceLabelsResult(
        groups=groups,
        variants=variants,
        equations=_resolve_equation_labels(eq_ov),
    )

@app.post("/api/surface_labels", response_model=SurfaceLabelsResult)
def update_surface_labels(req: SurfaceLabelsUpdateRequest) -> SurfaceLabelsResult:
    if not secrets.compare_digest(req.password, HOMEPAGE_PASSWORD):
        raise HTTPException(status_code=401, detail="Incorrect password")
    _save_surface_labels({
        "groups":    req.groups,
        "variants":  req.variants,
        "equations": req.equations,
    })
    return get_surface_labels()

@app.post("/api/compute", response_model=ComputeResult)
def compute_heatmap(req: ComputeRequest) -> ComputeResult:
    if len(req.rays) < 3:
        raise HTTPException(status_code=422, detail="rays must have at least 3 entries")

    rk      = _rays_key(req.rays)
    surface = _build_surface_cached(rk)
    n_pic   = len(surface.picard_generators)

    if len(req.alpha) != n_pic:
        raise HTTPException(status_code=422,
            detail=f"alpha has {len(req.alpha)} coefficients; surface has {n_pic} Picard generators")
    if len(req.beta) != n_pic:
        raise HTTPException(status_code=422,
            detail=f"beta has {len(req.beta)} coefficients; surface has {n_pic} Picard generators")
    for name, ax in [("x_axis", req.x_axis), ("y_axis", req.y_axis)]:
        if ax.k >= n_pic:
            raise HTTPException(status_code=422,
                detail=f"{name}.k={ax.k} out of range for n_pic={n_pic}")
    if req.x_axis.vector == req.y_axis.vector and req.x_axis.k == req.y_axis.k:
        raise HTTPException(status_code=422, detail="x_axis and y_axis must differ")

    axis_values = np.linspace(np.finfo(float).eps, 1.0, req.resolution)

    _, _, J, _, div_grid = compute_grid(
        equation_name=req.equation,
        base_alpha=np.array(req.alpha, dtype=float),
        base_beta=np.array(req.beta,  dtype=float),
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
    vals       = [float(v) for v in axis_values]

    return ComputeResult(sign_matrix=sign_matrix, div_matrix=div_matrix,
                         x_values=vals, y_values=vals)

@app.post("/api/surface_info", response_model=SurfaceInfoResult)
def surface_info(req: SurfaceInfoRequest) -> SurfaceInfoResult:
    if len(req.rays) < 3:
        raise HTTPException(status_code=422, detail="rays must have at least 3 entries")

    rk      = _rays_key(req.rays)
    surface = _build_surface_cached(rk)
    n_rays  = len(rk)

    cone_labels = [
        f"Cone {i}: {list(map(int, rk[i]))} ^ {list(map(int, rk[(i+1) % n_rays]))}"
        for i in range(n_rays)
    ]

    valid_bd   = _valid_blowdown_indices(surface)
    ray_labels = [
        f"Ray {i}: {list(map(int, rk[i]))}{'  (-1)' if i in valid_bd else ''}"
        for i in range(n_rays)
    ]

    coefficients, strings = _kaehler_inequalities_cached(rk)

    return SurfaceInfoResult(
        n_rays=n_rays,
        n_pic=len(surface.picard_generators),
        intersection_matrix=surface.intersection_matrix.tolist(),
        inequality_coefficients=list(coefficients),
        inequality_strings=list(strings),
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
    rays      = list(rays)
    rays.insert(insert_at, new_ray)
    return BlowResult(rays=[list(r) for r in rays])

@app.post("/api/blowdown", response_model=BlowResult)
def blowdown(req: BlowdownRequest) -> BlowResult:
    if len(req.rays) < 4:
        raise HTTPException(status_code=422, detail="Cannot blow down: need at least 4 rays")
    rk    = _rays_key(req.rays)
    idx   = req.ray_index % len(rk)
    base  = {tuple(map(float, r)) for r in req.base_rays}

    if rk[idx] in base:
        raise HTTPException(status_code=422,
            detail="This ray belongs to the base fan and cannot be blown down.")

    surface  = _build_surface_cached(rk)
    valid_bd = _valid_blowdown_indices(surface)
    if idx not in valid_bd:
        raise HTTPException(status_code=422,
            detail="This ray is not a (-1)-curve and cannot be blown down.")

    new_rays = [list(rk[k]) for k in range(len(rk)) if k != idx]
    return BlowResult(rays=new_rays)

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

# ---------------------------------------------------------------------------
# Static frontend (production)
# StaticFiles html=True only serves index.html at "/" — it does NOT fall back
# to index.html for unknown paths like "/compute".  React Router requires that
# every non-API route returns index.html so the client-side router takes over.
# Solution: mount /assets for Vite bundles, then a catch-all route for the SPA.
# ---------------------------------------------------------------------------

_STATIC_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"

if _STATIC_DIR.exists():
    _assets_dir = _STATIC_DIR / "assets"
    if _assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(_assets_dir)), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def _serve_spa(full_path: str) -> FileResponse:
        # Serve the real file if it exists (favicon, robots.txt, etc.)
        candidate = _STATIC_DIR / full_path
        if candidate.is_file():
            return FileResponse(str(candidate))
        # Everything else goes to index.html — React Router handles routing
        return FileResponse(str(_STATIC_DIR / "index.html"))

else:
    logger.info("No frontend build found at %s -- running in API-only mode", _STATIC_DIR)

