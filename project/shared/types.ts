// shared/types.ts
// Role: Single source of truth for all JSON shapes shared between FastAPI backend
//       and React/TypeScript frontend. Both Pydantic models and React components
//       must conform to these interfaces exactly.
// Assumptions: All arrays are plain JSON-serialisable types (no numpy types leak through).

export interface ExperimentMeta {
  id: string;                  // e.g. "CSCKBlP22PointsInfo2"
  type: "CSCK" | "Jeq";
  surface: string;             // e.g. "BlP2" | "BlP1xP1" | "BlHirzebruch2"
  num_points: number;
  file_index: number;
  latex_label: string;         // full LaTeX string for display
  beta_coeffs: number[];       // Info[1] — [β_H, β_E1, β_E2, …]
  grid_size: number;           // M — steps per axis
  num_dimensions: number;      // N — total axes in SignData
  axis_values: number[][];     // shape [N][M] — actual stored α values per axis
}

export interface SliceRequest {
  experiment_id: string;
  slider_indices: number[];    // length = num_dimensions − 2; one index per slider axis
}

export interface HeatmapSlice {
  sign_matrix: (number | null)[][];  // [M][M], null where sentinel values were
  div_matrix: number[][];            // [M][M], 0 = no annotation
  title_alpha: number[];             // actual α values for slider axes at this slice
  stats: SliceStats;
}

export interface SliceStats {
  beta_coeffs: number[];
  antican_value: number;
  antican_position: number[];        // [α_b, α_c] coordinates of antican_value cell
  min_value: number;
  min_position: number[];
  max_value: number;
  max_position: number[];
  unique_divisors: DivisorCount[];
}

export interface DivisorCount {
  divisor: number;
  count: number;
}

export interface ExperimentList {
  experiments: ExperimentMeta[];
}

export interface ColourScaleConfig {
  vmin: number;
  vcenter: number;             // always 0.0, not user-editable
  vmax: number;
}
