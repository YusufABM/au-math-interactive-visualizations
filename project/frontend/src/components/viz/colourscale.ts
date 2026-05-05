// frontend/src/components/viz/colourscale.ts
// Shared colour-scale helpers used by DynamicHeatmap.

import type { ColourScaleConfig } from "../../types/index";

export function buildColorscale(cfg: ColourScaleConfig): [number, string][] {
  const range = cfg.vmax - cfg.vmin;
  const zp = range === 0 ? 0.5 : Math.max(0, Math.min(1, (0 - cfg.vmin) / range));
  return [
    [0.0, "rgb(165,0,38)"],
    [zp,  "rgb(255,255,0)"],
    [1.0, "rgb(0,104,55)"],
  ];
}

export function buildColourbarTicks(cfg: ColourScaleConfig): number[] {
  const step = (cfg.vmax - cfg.vmin) / 9;
  return Array.from({ length: 10 }, (_, i) => cfg.vmax - i * step);
}
