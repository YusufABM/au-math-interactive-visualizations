// shared/types.ts
// Role: Single source of truth for all JSON shapes shared between FastAPI backend
//       and React/TypeScript frontend.

export interface ColourScaleConfig {
  vmin: number;
  vcenter: number;   // always 0.0, not user-editable
  vmax: number;
}

export interface SurfaceVariant {
  key: string;    // e.g. "P2Sigma0"
  label: string;  // e.g. "Cone 0:  ([0,1], [1,0])"
}

export interface SurfaceGroup {
  name: string;
  variants: SurfaceVariant[];
}

export interface SurfaceCatalogue {
  groups: SurfaceGroup[];
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
  /** Each row c: constraint sum_k c[k]*alpha_k > 0 */
  inequality_coefficients: number[][];
  inequality_strings: string[];
  cone_labels: string[];
  ray_labels: string[];
  valid_blowdown_indices: number[];
}

export interface BlowResult {
  rays: [number, number][];
}
