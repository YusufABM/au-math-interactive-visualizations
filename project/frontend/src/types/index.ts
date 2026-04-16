// frontend/src/types/index.ts
// Role: Re-exports all shared types so frontend components import from one place.
// Assumptions: shared/types.ts is the canonical source; this file is a thin re-export.

export type {
  ExperimentMeta,
  SliceRequest,
  HeatmapSlice,
  SliceStats,
  DivisorCount,
  ExperimentList,
  ColourScaleConfig,
} from "../../../shared/types";
