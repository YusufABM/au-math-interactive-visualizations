# scripts/prepare_data.py
# Role: Validation, inspection, and manifest-building script for .npy experiment data.
#       Run once after Jupyter notebook output is complete.
#       Scans a single flat directory for all SignData, DivData, and Info files.
# Assumptions:
#   - All .npy files live in one flat directory (--data-dir).
#   - SignData:  <stem>.SignData.npy
#   - DivData:   <stem>.DivData.npy
#   - Info:      <stem>  (the bare stem, e.g. CSCKBlP22PointsInfo2.npy)
#   - numpy types must not appear in final JSON output.

import argparse
import json
import re
import sys
from pathlib import Path

import numpy as np

SENTINELS = {50000.0, 1000.0}

_ID_RE = re.compile(
    r"^(?P<type>CSCK|Jeq)"
    r"(?P<surface>BlP1xP1|BlHirzebruch2|BlP2)"
    r"(?P<num_points>\d+)PointsInfo(?P<file_index>\d+)$"
)

_SURFACE_ORDER = {"BlP2": 0, "BlP1xP1": 1, "BlHirzebruch2": 2}
_TYPE_ORDER = {"CSCK": 0, "Jeq": 1}


def parse_id(exp_id: str) -> dict | None:
    m = _ID_RE.match(exp_id)
    if not m:
        return None
    return {
        "type": m.group("type"),
        "surface": m.group("surface"),
        "num_points": int(m.group("num_points")),
        "file_index": int(m.group("file_index")),
    }


def build_latex_label(exp_type: str, surface: str, num_points: int, file_index: int) -> str:
    surface_latex = {
        "BlP2": r"\mathbb{P}^2",
        "BlP1xP1": r"\mathbb{P}^1 \times \mathbb{P}^1",
        "BlHirzebruch2": r"\mathbb{F}_2",
    }.get(surface, surface)
    prefix = r"\mathrm{cscK}" if exp_type == "CSCK" else r"J\text{-eq}"
    return (
        rf"{prefix}\ \mathrm{{Bl}}_{{{num_points}}}\,{surface_latex}"
        rf"\;[\#{file_index}]"
    )


def count_sentinels(arr: np.ndarray) -> tuple[int, int]:
    c50000 = int(np.sum(arr == 50000.0))
    c1000 = int(np.sum(arr == 1000.0))
    return c50000, c1000


def check_unexpected_sentinels(arr: np.ndarray) -> list[float]:
    unique_vals = set(np.unique(arr).tolist())
    return [v for v in unique_vals if v != 50000.0 and v != 1000.0 and (v > 999.0 or v < -1e6)]


def sort_key(entry: dict) -> tuple:
    return (
        _TYPE_ORDER.get(entry["type"], 99),
        _SURFACE_ORDER.get(entry["surface"], 99),
        entry["num_points"],
        entry["file_index"],
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Validate and build manifest for CSCK/J-eq .npy experiment data."
    )
    parser.add_argument(
        "--data-dir",
        default="project/data/ResultsOfInterest",
        help="Directory containing SignData and DivData files (default: project/data/ResultsOfInterest)",
    )
    parser.add_argument(
        "--info-dir",
        default=None,
        help=(
            "Directory containing Info .npy files named {id}.npy "
            "(default: same as --data-dir). "
            "Set to 'project/data/Info' if using the notebook output layout."
        ),
    )
    parser.add_argument(
        "--output",
        default="project/data/experiments.json",
        help="Output path for the experiments.json manifest (default: project/data/experiments.json)",
    )
    args = parser.parse_args()

    data_dir = Path(args.data_dir)
    info_dir = Path(args.info_dir) if args.info_dir else data_dir

    if not data_dir.exists():
        print(f"ERROR: --data-dir {data_dir} does not exist", file=sys.stderr)
        sys.exit(1)

    if not info_dir.exists():
        print(
            f"WARNING: --info-dir {info_dir} does not exist — "
            "experiments will be loaded without beta_coeffs",
            file=sys.stderr,
        )

    sign_files = sorted(data_dir.glob("*.SignData.npy"))
    if not sign_files:
        print(f"No *.SignData.npy files found in {data_dir}", file=sys.stderr)
        sys.exit(1)

    print(f"\nScanning {len(sign_files)} SignData files in {data_dir}")
    print(f"Info directory: {info_dir}\n")
    header = f"{'id':<40} {'shape':<18} {'dtype':<10} {'s50000':>8} {'s1000':>8} {'info_beta'}"
    print(header)
    print("-" * len(header))

    manifest: list[dict] = []
    errors: list[tuple[str, str]] = []
    ok = 0

    for sign_path in sign_files:
        name = sign_path.name
        stem = name[: -len(".SignData.npy")]
        exp_id = stem[: -len(".npy")] if stem.endswith(".npy") else stem

        parsed = parse_id(exp_id)
        if parsed is None:
            errors.append((name, "Cannot parse experiment id"))
            continue

        div_path = data_dir / f"{stem}.DivData.npy"
        # Info file: {info_dir}/{exp_id}.npy  (matching notebook convention)
        info_path = info_dir / f"{exp_id}.npy"

        if not div_path.exists():
            errors.append((exp_id, "Missing DivData file"))
            continue

        try:
            sign_data: np.ndarray = np.load(str(sign_path), allow_pickle=True)
            div_data: np.ndarray = np.load(str(div_path), allow_pickle=True)
        except Exception as exc:
            errors.append((exp_id, f"SignData/DivData load error: {exc}"))
            continue

        N = sign_data.ndim
        M = sign_data.shape[0]

        # Validate shapes match
        if div_data.shape != sign_data.shape:
            errors.append((exp_id, f"DivData shape {div_data.shape} != SignData shape {sign_data.shape}"))
            continue

        # Load Info[1] — warn if missing, continue with empty beta_coeffs.
        beta_coeffs: list[float] = []
        if info_path.exists():
            try:
                info: np.ndarray = np.load(str(info_path), allow_pickle=True)
                beta_raw = info[1]
                beta_coeffs = [float(v) for v in beta_raw]
                if len(beta_coeffs) != N:
                    print(f"  WARNING: Info[1] length {len(beta_coeffs)} != N={N} for {exp_id}")
            except Exception as exc:
                print(f"  WARNING: Info[1] error for {exp_id}: {exc}")
        else:
            print(f"  INFO: No Info file for {exp_id} — beta_coeffs will be empty")

        s50000, s1000 = count_sentinels(sign_data)
        beta_str = "[" + ", ".join(f"{v:.4f}" for v in beta_coeffs[:4]) + ("…" if len(beta_coeffs) > 4 else "") + "]"

        print(f"{exp_id:<40} {str(sign_data.shape):<18} {str(sign_data.dtype):<10} {s50000:>8} {s1000:>8} {beta_str}")

        # Check for unexpected sentinel-like values
        unexpected = check_unexpected_sentinels(sign_data)
        if unexpected:
            print(f"  WARNING: Unexpected large/sentinel values: {unexpected[:5]}")

        axis_values = [
            [float(v) for v in np.linspace(0.0, 1.0, M)]
            for _ in range(N)
        ]

        entry: dict = {
            "id": exp_id,
            "type": parsed["type"],
            "surface": parsed["surface"],
            "num_points": parsed["num_points"],
            "file_index": parsed["file_index"],
            "latex_label": build_latex_label(
                parsed["type"], parsed["surface"],
                parsed["num_points"], parsed["file_index"]
            ),
            "beta_coeffs": beta_coeffs,
            "grid_size": M,
            "num_dimensions": N,
            "axis_values": axis_values,
        }
        manifest.append(entry)
        ok += 1

    print(f"\nTotal: {ok} ok, {len(errors)} errors\n")

    if errors:
        print("ERRORS:")
        for name, reason in errors:
            print(f"  {name}: {reason}")
        print()

    manifest.sort(key=sort_key)

    # Verify no numpy types leak
    try:
        json_str = json.dumps({"experiments": manifest})
    except TypeError as exc:
        print(f"ERROR: numpy type leaked into manifest: {exc}", file=sys.stderr)
        sys.exit(1)

    out_path = Path(args.output).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json_str, encoding="utf-8")
    print(f"Manifest written to {out_path} ({len(manifest)} experiments)")


if __name__ == "__main__":
    main()
