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

// Valid equation keys — used only for type narrowing
const EQUATION_KEYS: EquationName[] = ["J(alpha,beta)", "I(alpha)"];

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
  const { catalogue, loading: catLoading, error: catError } = useSurfaces();

  // ── Surface selection state ───────────────────────────────────────────────
  const [groupKey,        setGroupKey]        = useState("P2");
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

  // ── Hooks ─────────────────────────────────────────────────────────────────
  const { info } = useSurfaceInfo(currentRays);

  // ── Derived values ────────────────────────────────────────────────────────
  const nPic      = info?.n_pic ?? alpha.length;
  const allowBeta = equation === "J(alpha,beta)";

  const currentGroup = useMemo(
    () => catalogue?.groups.find((g) => g.key === groupKey) ?? null,
    [catalogue, groupKey]
  );

  const currentVariant = useMemo(
    () => currentGroup?.variants.find((v) => v.key === variantKey) ?? null,
    [currentGroup, variantKey]
  );

  // equation_labels from catalogue (falls back to the fixed key as label if not loaded yet)
  const equationLabels = catalogue?.equation_labels ?? EQUATION_KEYS.map((k) => ({
    key: k, label: k, description: "",
  }));

  const currentEquationEntry = useMemo(
    () => equationLabels.find((e) => e.key === equation) ?? null,
    [equationLabels, equation]
  );

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
    if (candidate === safeX) {
      const xp = parseAxisKey(safeX);
      if (xp.vector === "alpha") {
        return nPic > 1 ? axisKey("alpha", xp.k === 0 ? 1 : 0) : axisKey("beta", 0);
      }
      return axisKey("alpha", 0);
    }
    return candidate;
  }, [yAxisKey, nPic, allowBeta, safeX]);

  const xAxis        = parseAxisKey(safeX);
  const yAxis        = parseAxisKey(safeY);
  const axesConflict = xAxis.vector === yAxis.vector && xAxis.k === yAxis.k;

  const request = useMemo((): ComputeRequest | null => {
    if (currentRays.length < 3 || axesConflict) return null;
    if (alpha.length !== nPic || beta.length !== nPic) return null;
    return {
      rays: currentRays, equation,
      alpha: [...alpha], beta: [...beta],
      x_axis: { vector: xAxis.vector, k: xAxis.k },
      y_axis: { vector: yAxis.vector, k: yAxis.k },
      resolution,
    };
  }, [currentRays, equation, alpha, beta, xAxis.vector, xAxis.k, yAxis.vector, yAxis.k, resolution, axesConflict, nPic]);

  const { result, loading, error } = useCompute(request);

  useEffect(() => {
    if (!info) return;
    const n = info.n_pic;
    setAlpha((prev) => prev.length === n ? prev : Array.from({ length: n }, (_, i) => prev[i] ?? 0.5));
    setBeta((prev)  => prev.length === n ? prev : Array.from({ length: n }, (_, i) => prev[i] ?? 0.5));
  }, [info?.n_pic]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleGroupChange(key: string): void {
    setGroupKey(key);
    const group = catalogue?.groups.find((g) => g.key === key);
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
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rays: currentRays, cone_index: coneIndex }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail ?? res.statusText);
      const data: BlowResult = await res.json();
      setCurrentRays(data.rays as [number, number][]);
    } catch (e) { setGeoError(e instanceof Error ? e.message : String(e)); }
  }

  async function handleBlowdown(rayIndex: number): Promise<void> {
    setGeoError(null);
    try {
      const res = await fetch("/api/blowdown", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rays: currentRays, ray_index: rayIndex, base_rays: baseSurfaceRays }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail ?? res.statusText);
      const data: BlowResult = await res.json();
      setCurrentRays(data.rays as [number, number][]);
    } catch (e) { setGeoError(e instanceof Error ? e.message : String(e)); }
  }

  function handleAlpha(k: number, v: number): void {
    setAlpha((prev) => prev.map((x, i) => (i === k ? v : x)));
  }
  function handleBeta(k: number, v: number): void {
    setBeta((prev) => prev.map((x, i) => (i === k ? v : x)));
  }

  const opts             = useMemo(() => axisOptions(nPic, allowBeta), [nPic, allowBeta]);
  const validBlowdownSet = useMemo(() => new Set(info?.valid_blowdown_indices ?? []), [info?.valid_blowdown_indices]);

  const blownUp      = currentRays.length > (SURFACE_RAYS[variantKey]?.length ?? 4);
  const variantLabel = currentVariant?.label ?? variantKey;
  const heatmapTitle = `${currentEquationEntry?.label ?? equation} — ${variantLabel}${blownUp ? " (blown up)" : ""}`;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      <aside style={styles.sidebar}>

        {catLoading && <p style={styles.statusText}>Loading surfaces…</p>}
        {catError   && <p style={styles.errorText}>Error: {catError}</p>}

        {/* Surface family + variant */}
        {catalogue && (
          <section style={styles.section}>
            <label style={styles.label}>Surface family</label>
            <select value={groupKey} onChange={(e) => handleGroupChange(e.target.value)} style={styles.select}>
              {catalogue.groups.map((g) => (
                <option key={g.key} value={g.key}>{g.name}</option>
              ))}
            </select>
            {currentGroup && (
              <>
                <label style={{ ...styles.label, marginTop: 6 }}>Surface</label>
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

        {/* Equation — uses catalogue labels */}
        <section style={styles.section}>
          <label style={styles.label}>Equation</label>
          <select
            value={equation}
            onChange={(e) => setEquation(e.target.value as EquationName)}
            style={styles.select}
          >
            {equationLabels.map((eq) => (
              <option key={eq.key} value={eq.key}>{eq.label}</option>
            ))}
          </select>
          {currentEquationEntry?.description && (
            <p style={styles.equationDesc}>{currentEquationEntry.description}</p>
          )}
        </section>

        <Divider />

        {/* α coefficients */}
        <section style={styles.section}>
          <label style={styles.label}>α coefficients</label>
          {alpha.map((v, k) => {
            const isAxis = (xAxis.vector === "alpha" && xAxis.k === k)
                        || (yAxis.vector === "alpha" && yAxis.k === k);
            if (isAxis) return null;
            return (
              <CoeffSliderRow key={k} label={`α[${AXIS_LETTERS[k] ?? k}]`} value={v}
                onChange={(nv) => handleAlpha(k, nv)} />
            );
          })}
        </section>

        {/* β coefficients */}
        {allowBeta && (
          <>
            <Divider />
            <section style={styles.section}>
              <label style={styles.label}>β coefficients</label>
              {beta.map((v, k) => {
                const isAxis = (xAxis.vector === "beta" && xAxis.k === k)
                            || (yAxis.vector === "beta" && yAxis.k === k);
                if (isAxis) return null;
                return (
                  <CoeffSliderRow key={k} label={`β[${AXIS_LETTERS[k] ?? k}]`} value={v}
                    onChange={(nv) => handleBeta(k, nv)} />
                );
              })}
            </section>
          </>
        )}

        {/* Kähler conditions */}
        {info && info.inequality_strings.length > 0 && (
          <>
            <Divider />
            <section style={styles.section}>
              <label style={styles.label}>Kähler cone conditions</label>
              <KaehlerConditions
                strings={info.inequality_strings}
                coefficients={info.inequality_coefficients}
                alpha={alpha} beta={beta} equation={equation}
              />
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
          <input type="range" min={20} max={200} step={10} value={resolution}
            onChange={(e) => setResolution(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#555" }} />
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
                coneLabels={info.cone_labels} rayLabels={info.ray_labels}
                validBlowdownIndices={validBlowdownSet}
                onBlowup={handleBlowup} onBlowdown={handleBlowdown} error={geoError}
              />
            </section>
          </>
        )}

        {error && <p style={{ ...styles.errorText, marginTop: 12 }}>Compute error: {error}</p>}

      </aside>

      <section style={styles.heatmapPanel}>
        <DynamicHeatmap
          result={result} xVector={xAxis.vector} xK={xAxis.k}
          yVector={yAxis.vector} yK={yAxis.k}
          title={heatmapTitle} colourConfig={colourConfig}
          showDivisors={showDivisors} showZeroLocus={showZeroLocus} loading={loading}
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

interface CoeffSliderRowProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
}

function CoeffSliderRow({ label, value, onChange }: CoeffSliderRowProps): React.ReactElement {
  return (
    <div style={styles.coeffRow}>
      <span style={styles.coeffLabel}>{label}</span>
      <input type="range" min={0.000001} max={1.0} step={0.01} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={styles.coeffSlider} />
      <input type="number" min={0.000001} max={1.0} step={0.05} value={value}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v) && v > 0) onChange(Math.min(1.0, v));
        }}
        style={styles.coeffNumber} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = {
  page:         { display: "flex", flexWrap: "wrap" as const, gap: "0", flex: 1, minHeight: 0 },
  sidebar:      { width: "30%", minWidth: "260px", padding: "24px 20px", borderRight: "1px solid #e8e8e8", display: "flex", flexDirection: "column" as const, gap: "0", overflowY: "auto" as const },
  heatmapPanel: { flex: 1, minWidth: "300px", padding: "24px", display: "flex", alignItems: "flex-start", justifyContent: "center" },
  section:      { display: "flex", flexDirection: "column" as const, gap: "6px" },
  label:        { fontSize: "0.75rem", fontWeight: 600 as const, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "#888" },
  select:       { width: "100%", padding: "5px 8px", fontSize: "0.85rem", border: "1px solid #ccc", borderRadius: "3px", background: "#fff", color: "#222", cursor: "pointer" },
  equationDesc: { fontSize: "0.80rem", color: "#666", margin: "2px 0 0 0", lineHeight: 1.45, fontStyle: "italic" as const },
  coeffRow:     { display: "flex", alignItems: "center", gap: "8px" },
  coeffLabel:   { fontSize: "0.82rem", color: "#555", width: "36px", flexShrink: 0, fontFamily: "ui-monospace, monospace" },
  coeffSlider:  { flex: 1, accentColor: "#555", cursor: "pointer" },
  coeffNumber:  { width: "58px", flexShrink: 0, padding: "2px 4px", fontSize: "0.80rem", border: "1px solid #ccc", borderRadius: "3px", fontFamily: "ui-monospace, monospace", textAlign: "right" as const },
  divider:      { border: "none", borderTop: "1px solid #efefef", margin: "14px 0" },
  statusText:   { fontSize: "0.85rem", color: "#888", margin: "0 0 12px 0" },
  errorText:    { fontSize: "0.82rem", color: "#c00", margin: "4px 0 0 0" },
} as const;
