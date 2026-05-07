// shared/types.ts
// Role: Single source of truth for all JSON shapes shared between FastAPI backend
//       and React/TypeScript frontend.

export interface ColourScaleConfig {
  vmin: number;
  vcenter: number;   // always 0.0, not user-editable
  vmax: number;
}

export interface SurfaceVariant {
  key: string;
  label: string;
}

export interface SurfaceGroup {
  key: string;    // internal identifier, never changes
  name: string;   // display label, editable
  variants: SurfaceVariant[];
}

export interface EquationLabelEntry {
  key: string;          // "J(alpha,beta)" or "I(alpha)" — never changes
  label: string;        // display name in the dropdown
  description: string;  // optional text shown below the dropdown
}

export interface SurfaceCatalogue {
  groups: SurfaceGroup[];
  equation_labels: EquationLabelEntry[];
}

export type EquationName = "J(alpha,beta)" | "I(alpha)";

export interface AxisSpec {
  vector: "alpha" | "beta";
  k: number;
}

export interface ComputeRequest {
  rays: [number, number][];
  equation: EquationName;
  alpha: number[];
  beta: number[];
  x_axis: AxisSpec;
  y_axis: AxisSpec;
  resolution: number;
}

export interface ComputeResult {
  sign_matrix: (number | null)[][];
  div_matrix: number[][];
  x_values: number[];
  y_values: number[];
}

export interface HomepageContent {
  title: string;
  body: string;
}

export interface SurfaceInfo {
  n_rays: number;
  n_pic: number;
  intersection_matrix: number[][];
  inequality_coefficients: number[][];
  inequality_strings: string[];
  cone_labels: string[];
  ray_labels: string[];
  valid_blowdown_indices: number[];
}

export interface BlowResult {
  rays: [number, number][];
}

export interface SurfaceLabelEntry {
  key: string;
  label: string;
}

export interface VariantLabelEntry {
  key: string;
  group_key: string;
  label: string;
}

export interface SurfaceLabelsResult {
  groups: SurfaceLabelEntry[];
  variants: VariantLabelEntry[];
  equations: EquationLabelEntry[];
}
