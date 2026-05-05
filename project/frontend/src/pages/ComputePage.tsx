// frontend/src/pages/ComputePage.tsx
import React, { useState, useMemo, useEffect } from "react";
import { useSurfaces }     from "../hooks/useSurfaces";
import { useCompute }      from "../hooks/useCompute";
import { useSurfaceInfo }  from "../hooks/useSurfaceInfo";
import { DynamicHeatmap }      from "../components/viz/DynamicHeatmap";
import { ColourScaleControls } from "../components/viz/ColourScaleControls";
import { FanPlot }             from "../components/viz/FanPlot";
import { IntersectionMatrix }  from "../components/viz/IntersectionMatrix";
import { KaehlerConditions }   from "../components/viz/KaehlerConditions";
import { GeometryControls }    from "../components/viz/GeometryControls";
import { Toggle }              from "../components/ui/Toggle";
import type {
  ComputeRequest,
  EquationName,
  ColourScaleConfig,
  BlowResult,
} from "../types/index";

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const SURFACE_RAYS: Record<string, [number, number][]> = {
  P2Sigma0:     [[0,1],[1,1],[1,0],[-1,-1]],
  P2Sigma1:     [[0,1],[1,0],[0,-1],[-1,-1]],
  P2Sigma2:     [[0,1],[1,0],[-1,-1],[-1,0]],
  P1xP1:        [[0,1],[1,0],[0,-1],[-1,0]],
  Hirzebruch_1: [[0,1],[1,0],[0,-1],[-1,1]],
  Hirzebruch_2: [[0,1],[1,0],[0,-1],[-1,2]],
  Hirzebruch_3: [[0,1],[1,0],[0,-1],[-1,3]],
  Hirzebruch_4: [[0,1],[1,0],[0,-1],[-1,4]],
};

const EQUATIONS: { value: EquationName; label: string }[] = [
  { value: "J(alpha,beta)", label: "J(α,β) — J-equation" },
  { value: "I(alpha)",      label: "I(α)   — cscK quantity" },
];

const DEFAULT_COLOUR: ColourScaleConfig = { vmin: -5.0, vcenter: 0.0, vmax: 1.0 };
const AXIS_LETTERS = "abcdefghijklmnopqrstuvwxyz";

// ---------------------------------------------------------------------------
// Axis helpers
// ---------------------------------------------------------------------------

type AxisVector = "alpha" | "beta";
function axisKey(v: AxisVector, k: number): string { return `${v}:${k}`; }
function parseAxisKey(key: string): { vector: AxisVector; k: number } {
  const [v, ks] = key.split(":");
  return { vector: v as AxisVector, k: Number(ks) };
}
function axisOptions(nPic: number, allowBeta: boolean): { key: string; label: string }[] {
  const opts: { key: string; label: string }[] = [];
  for (let k = 0; k < nPic; k++)
    opts.push({ key: axisKey("alpha", k), label: `α[${AXIS_LETTERS[k] ?? k}]` });
  if (allowBeta)
    for (let k = 0; k < nPic; k++)
      opts.push({ key: axisKey("beta", k), label: `β[${AXIS_LETTERS[k] ?? k}]` });
  return opts;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ComputePage(): React.ReactElement {
  // ── Surface catalogue ─────────────────────────────────────────────────────
  const { catalogue, loading: catLoading, error: catError } = useSurfaces();

  // ── Surface selection state ───────────────────────────────────────────────
  const [groupName,       setGroupName]       = useState("P2");
  const [variantKey,      setVariantKey]      = useState("P2Sigma0");
  const [currentRays,     setCurrentRays]     = useState<[number,number][]>(SURFACE_RAYS["P2Sigma0"]);
  const [baseSurfaceRays, setBaseSurfaceRays] = useState<[number,number][]>(SURFACE_RAYS["P2Sigma0"]);

  // ── Equation + coefficients ───────────────────────────────────────────────
  const [equation, setEquation] = useState<EquationName>("J(alpha,beta)");
  const [alpha,    setAlpha]    = useState<number[]>([0.5, 0.5]);
  const [beta,     setBeta]     = useState<number[]>([0.3, 0.3]);

  // ── Axis assignment ───────────────────────────────────────────────────────
  const [xAxisKey, setXAxisKey] = useState("alpha:0");
  const [yAxisKey, setYAxisKey] = useState("beta:0");

  // ── Resolution + display ──────────────────────────────────────────────────
  const [resolution,    setResolution]    = useState(80);
  const [colourConfig,  setColourConfig]  = useState<ColourScaleConfig>(DEFAULT_COLOUR);
  const [showDivisors,  setShowDivisors]  = useState(false);
  const [showZeroLocus, setShowZeroLocus] = useState(true);

  // ── Geometry error ────────────────────────────────────────────────────────
  const [geoError, setGeoError] = useState<string | null>(null);

  // ── Hooks (called at top level before any derived values) ─────────────────
  const { info } = useSurfaceInfo(currentRays);

  // ── Derived values (after hooks) ──────────────────────────────────────────
  const nPic      = info?.n_pic ?? alpha.length;
  const allowBeta = equation === "J(alpha,beta)";

  const currentGroup = useMemo(
    () => catalogue?.groups.find((g) => g.name === groupName) ?? null,
    [catalogue, groupName]
  );

  // Clamp axis keys when nPic or equation changes
  const safeX = useMemo(() => {
    const { vector, k } = parseAxisKey(xAxisKey);
    if (!allowBeta && vector === "beta") return axisKey("alpha", 0);
    return axisKey(vector, Math.min(k, nPic - 1));
  }, [xAxisKey, nPic, allowBeta]);

  const safeY = useMemo(() => {
    const { vector, k } = parseAxisKey(yAxisKey);
    let v: AxisVector = vector;
    let ki = k;
    if (!allowBeta && v === "beta") { v = "alpha"; ki = 1; }
    ki = Math.min(ki, nPic - 1);
    const candidate = axisKey(v, ki);
    // Avoid conflict with X axis
    if (candidate === safeX) {
      const xp = parseAxisKey(safeX);
      if (xp.vector === "alpha") {
        return nPic > 1 ? axisKey("alpha", xp.k === 0 ? 1 : 0)
                        : axisKey("beta", 0);
      }
      return axisKey("alpha", 0);
    }
    return candidate;
  }, [yAxisKey, nPic, allowBeta, safeX]);

  const xAxis       = parseAxisKey(safeX);
  const yAxis       = parseAxisKey(safeY);
  const axesConflict = xAxis.vector === yAxis.vector && xAxis.k === yAxis.k;

  // Build compute request (memoised to avoid re-triggering useCompute on each render)
  const request = useMemo((): ComputeRequest | null => {
    if (currentRays.length < 3 || axesConflict) return null;
    if (alpha.length !== nPic || beta.length !== nPic) return null;
    return {
      rays:      currentRays,
      equation,
      alpha:     [...alpha],
      beta:      [...beta],
      x_axis:    { vector: xAxis.vector, k: xAxis.k },
      y_axis:    { vector: yAxis.vector, k: yAxis.k },
      resolution,
    };
  }, [currentRays, equation, alpha, beta, xAxis.vector, xAxis.k, yAxis.vector, yAxis.k, resolution, axesConflict, nPic]);

  const { result, loading, error } = useCompute(request);

  // ── Resize alpha/beta when n_pic changes due to blow-up/down ──────────────
  useEffect(() => {
    if (!info) return;
    const n = info.n_pic;
    setAlpha((prev) =>
      prev.length === n ? prev : Array.from({ length: n }, (_, i) => prev[i] ?? 0.5)
    );
    setBeta((prev) =>
      prev.length === n ? prev : Array.from({ length: n }, (_, i) => prev[i] ?? 0.5)
    );
  }, [info?.n_pic]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleGroupChange(name: string): void {
    setGroupName(name);
    const group = catalogue?.groups.find((g) => g.name === name);
    if (group?.variants[0]) handleVariantChange(group.variants[0].key);
  }

  function handleVariantChange(key: string): void {
    setVariantKey(key);
    const rays = (SURFACE_RAYS[key] ?? []) as [number, number][];
    setCurrentRays(rays);
    setBaseSurfaceRays(rays);
    setGeoError(null);
  }

  async function handleBlowup(coneIndex: number): Promise<void> {
    setGeoError(null);
    try {
      const res = await fetch("/api/blowup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rays: currentRays, cone_index: coneIndex }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail ?? res.statusText);
      const data: BlowResult = await res.json();
      setCurrentRays(data.rays as [number, number][]);
    } catch (e) {
      setGeoError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleBlowdown(rayIndex: number): Promise<void> {
    setGeoError(null);
    try {
      const res = await fetch("/api/blowdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rays: currentRays, ray_index: rayIndex, base_rays: baseSurfaceRays }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail ?? res.statusText);
      const data: BlowResult = await res.json();
      setCurrentRays(data.rays as [number, number][]);
    } catch (e) {
      setGeoError(e instanceof Error ? e.message : String(e));
    }
  }

  function handleAlpha(k: number, v: number): void {
    setAlpha((prev) => prev.map((x, i) => (i === k ? v : x)));
  }
  function handleBeta(k: number, v: number): void {
    setBeta((prev) => prev.map((x, i) => (i === k ? v : x)));
  }

  // ── Axis options for dropdowns ─────────────────────────────────────────────
  const opts = axisOptions(nPic, allowBeta);

  const blownUp = currentRays.length > (SURFACE_RAYS[variantKey]?.length ?? 4);
  const heatmapTitle = `${equation} — ${variantKey}${blownUp ? " (blown up)" : ""}`;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>

      {/* ── Left sidebar ─────────────────────────────────────────────── */}
      <aside style={styles.sidebar}>

        {catLoading && <p style={styles.statusText}>Loading surfaces…</p>}
        {catError   && <p style={styles.errorText}>Error: {catError}</p>}

        {/* Surface family + variant */}
        {catalogue && (
          <section style={styles.section}>
            <label style={styles.label}>Surface family</label>
            <select value={groupName} onChange={(e) => handleGroupChange(e.target.value)} style={styles.select}>
              {catalogue.groups.map((g) => (
                <option key={g.name} value={g.name}>{g.name}</option>
              ))}
            </select>
            {currentGroup && (
              <>
                <label style={{ ...styles.label, marginTop: 6 }}>Variant</label>
                <select value={variantKey} onChange={(e) => handleVariantChange(e.target.value)} style={styles.select}>
                  {currentGroup.variants.map((v) => (
                    <option key={v.key} value={v.key}>{v.label}</option>
                  ))}
                </select>
              </>
            )}
          </section>
        )}

        {/* Fan plot */}
        {currentRays.length > 0 && (
          <>
            <Divider />
            <section style={styles.section}>
              <label style={styles.label}>Toric fan  ({currentRays.length} rays, n_pic = {nPic})</label>
              <FanPlot rays={currentRays} />
            </section>
          </>
        )}

        <Divider />

        {/* Equation */}
        <section style={styles.section}>
          <label style={styles.label}>Equation</label>
          <select value={equation} onChange={(e) => setEquation(e.target.value as EquationName)} style={styles.select}>
            {EQUATIONS.map((eq) => (
              <option key={eq.value} value={eq.value}>{eq.label}</option>
            ))}
          </select>
        </section>

        <Divider />

        {/* α coefficients — axis-aware */}
        <section style={styles.section}>
          <label style={styles.label}>α coefficients</label>
          {alpha.map((v, k) => (
            <CoeffRowAxAware
              key={k}
              label={`α[${AXIS_LETTERS[k] ?? k}]`}
              value={v}
              onChange={(nv) => handleAlpha(k, nv)}
              axisNote={
                xAxis.vector === "alpha" && xAxis.k === k ? "→ x-axis" :
                yAxis.vector === "alpha" && yAxis.k === k ? "→ y-axis" : null
              }
            />
          ))}
        </section>

        {/* β coefficients — only for J(α,β), axis-aware */}
        {allowBeta && (
          <>
            <Divider />
            <section style={styles.section}>
              <label style={styles.label}>β coefficients</label>
              {beta.map((v, k) => (
                <CoeffRowAxAware
                  key={k}
                  label={`β[${AXIS_LETTERS[k] ?? k}]`}
                  value={v}
                  onChange={(nv) => handleBeta(k, nv)}
                  axisNote={
                    xAxis.vector === "beta" && xAxis.k === k ? "→ x-axis" :
                    yAxis.vector === "beta" && yAxis.k === k ? "→ y-axis" : null
                  }
                />
              ))}
            </section>
          </>
        )}

        <Divider />

        {/* Axis assignment */}
        <section style={styles.section}>
          <label style={styles.label}>X axis</label>
          <select value={safeX} onChange={(e) => setXAxisKey(e.target.value)} style={styles.select}>
            {opts.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
          <label style={{ ...styles.label, marginTop: 6 }}>Y axis</label>
          <select value={safeY} onChange={(e) => setYAxisKey(e.target.value)} style={styles.select}>
            {opts.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
          {axesConflict && <p style={styles.errorText}>X and Y axes must differ.</p>}
        </section>

        <Divider />

        {/* Resolution */}
        <section style={styles.section}>
          <label style={styles.label}>Resolution — {resolution} × {resolution}</label>
          <input
            type="range" min={20} max={200} step={10}
            value={resolution}
            onChange={(e) => setResolution(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#555" }}
          />
        </section>

        <Divider />

        {/* Overlays */}
        <section style={styles.section}>
          <label style={styles.label}>Overlays</label>
          <Toggle label="Divisor regions"  checked={showDivisors}  onChange={setShowDivisors} />
          <Toggle label="Zero locus (J=0)" checked={showZeroLocus} onChange={setShowZeroLocus} />
        </section>

        <Divider />
        <ColourScaleControls config={colourConfig} onChange={setColourConfig} />

        {/* Kähler conditions */}
        {info && info.inequality_strings.length > 0 && (
          <>
            <Divider />
            <section style={styles.section}>
              <label style={styles.label}>Kähler cone conditions</label>
              <KaehlerConditions
                strings={info.inequality_strings}
                coefficients={info.inequality_coefficients}
                alpha={alpha}
                beta={beta}
                equation={equation}
              />
            </section>
          </>
        )}

        {/* Intersection matrix */}
        {info && info.intersection_matrix.length > 0 && (
          <>
            <Divider />
            <section style={styles.section}>
              <label style={styles.label}>Intersection matrix</label>
              <IntersectionMatrix matrix={info.intersection_matrix} />
            </section>
          </>
        )}

        {/* Geometry controls */}
        {info && (
          <>
            <Divider />
            <section style={styles.section}>
              <label style={styles.label}>Blow-up / Blow-down</label>
              <GeometryControls
                coneLabels={info.cone_labels}
                rayLabels={info.ray_labels}
                validBlowdownIndices={new Set(info.valid_blowdown_indices)}
                onBlowup={handleBlowup}
                onBlowdown={handleBlowdown}
                error={geoError}
              />
            </section>
          </>
        )}

        {error && <p style={{ ...styles.errorText, marginTop: 12 }}>Compute error: {error}</p>}

      </aside>

      {/* ── Right panel ────────────────────────────────────────────────── */}
      <section style={styles.heatmapPanel}>
        <DynamicHeatmap
          result={result}
          xVector={xAxis.vector}
          xK={xAxis.k}
          yVector={yAxis.vector}
          yK={yAxis.k}
          title={heatmapTitle}
          colourConfig={colourConfig}
          showDivisors={showDivisors}
          showZeroLocus={showZeroLocus}
          loading={loading}
        />
      </section>

    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Divider(): React.ReactElement {
  return <hr style={styles.divider} />;
}

interface CoeffRowAxAwareProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  axisNote: string | null;
}

function CoeffRowAxAware({ label, value, onChange, axisNote }: CoeffRowAxAwareProps): React.ReactElement {
  return (
    <div style={styles.coeffRow}>
      <span style={styles.coeffLabel}>{label}</span>
      {axisNote ? (
        <span style={styles.coeffAxisNote}>{axisNote}</span>
      ) : (
        <input
          type="number"
          step="0.05"
          value={value}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) onChange(v);
          }}
          style={styles.coeffInput}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = {
  page: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0",
    flex: 1,
    minHeight: 0,
  },
  sidebar: {
    width: "30%",
    minWidth: "260px",
    padding: "24px 20px",
    borderRight: "1px solid #e8e8e8",
    display: "flex",
    flexDirection: "column" as const,
    gap: "0",
    overflowY: "auto" as const,
  },
  heatmapPanel: {
    flex: 1,
    minWidth: "300px",
    padding: "24px",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
  },
  section: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px",
  },
  label: {
    fontSize: "0.75rem",
    fontWeight: 600 as const,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    color: "#888",
  },
  select: {
    width: "100%",
    padding: "5px 8px",
    fontSize: "0.85rem",
    border: "1px solid #ccc",
    borderRadius: "3px",
    background: "#fff",
    color: "#222",
    cursor: "pointer",
  },
  coeffRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  coeffLabel: {
    fontSize: "0.82rem",
    color: "#555",
    width: "40px",
    flexShrink: 0,
    fontFamily: "ui-monospace, monospace",
  },
  coeffInput: {
    flex: 1,
    padding: "3px 6px",
    fontSize: "0.85rem",
    border: "1px solid #ccc",
    borderRadius: "3px",
    fontFamily: "ui-monospace, monospace",
  },
  coeffAxisNote: {
    flex: 1,
    fontSize: "0.78rem",
    color: "#aaa",
    fontStyle: "italic" as const,
    fontFamily: "ui-monospace, monospace",
  },
  divider: {
    border: "none",
    borderTop: "1px solid #efefef",
    margin: "14px 0",
  },
  statusText: {
    fontSize: "0.85rem",
    color: "#888",
    margin: "0 0 12px 0",
  },
  errorText: {
    fontSize: "0.82rem",
    color: "#c00",
    margin: "4px 0 0 0",
  },
} as const;
