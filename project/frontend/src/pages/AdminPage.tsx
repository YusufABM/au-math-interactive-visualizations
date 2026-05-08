// frontend/src/pages/AdminPage.tsx
// Password-protected editor for homepage content, surface names, and equation labels.
// Route: /admin  (not linked from the public nav)

import React, { useEffect, useState } from "react";
import { LatexText, LatexLine } from "../components/ui/LatexText";
import { bustSurfaceCache } from "../hooks/useSurfaces";
import type { SurfaceLabelsResult, EquationLabelEntry } from "../types/index";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HomepageContent {
  title: string;
  body: string;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";
type AuthStage = "locked" | "checking" | "unlocked";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AdminPage(): React.ReactElement {
  // ── Auth gate ──────────────────────────────────────────────────────────────
  const [stage,         setStage]         = useState<AuthStage>("locked");
  const [gatePassword,  setGatePassword]  = useState("");
  const [gateError,     setGateError]     = useState("");

  // ── Homepage state ─────────────────────────────────────────────────────────
  const [hpLoaded, setHpLoaded] = useState(false);
  const [hpTitle,  setHpTitle]  = useState("");
  const [hpBody,   setHpBody]   = useState("");
  const [hpStatus, setHpStatus] = useState<SaveStatus>("idle");
  const [hpError,  setHpError]  = useState("");

  // ── Surface labels state ───────────────────────────────────────────────────
  const [labelsLoaded,  setLabelsLoaded]  = useState(false);
  const [labelsData,    setLabelsData]    = useState<SurfaceLabelsResult | null>(null);
  const [groupLabels,   setGroupLabels]   = useState<Record<string, string>>({});
  const [variantLabels, setVariantLabels] = useState<Record<string, string>>({});
  const [labelsStatus,  setLabelsStatus]  = useState<SaveStatus>("idle");
  const [labelsError,   setLabelsError]   = useState("");

  // ── Equation labels state ──────────────────────────────────────────────────
  const [eqLabels, setEqLabels] = useState<Record<string, { label: string; description: string }>>({});

  // ── Load data once unlocked ────────────────────────────────────────────────
  useEffect(() => {
    if (stage !== "unlocked") return;

    fetch("/api/homepage")
      .then((r) => r.json())
      .then((d: HomepageContent) => { setHpTitle(d.title); setHpBody(d.body); setHpLoaded(true); });

    fetch("/api/surface_labels")
      .then((r) => r.json())
      .then((d: SurfaceLabelsResult) => {
        setLabelsData(d);
        const gl: Record<string, string> = {};
        const vl: Record<string, string> = {};
        const el: Record<string, { label: string; description: string }> = {};
        d.groups.forEach((g)   => { gl[g.key] = g.label; });
        d.variants.forEach((v) => { vl[v.key] = v.label; });
        d.equations.forEach((e: EquationLabelEntry) => {
          el[e.key] = { label: e.label, description: e.description };
        });
        setGroupLabels(gl);
        setVariantLabels(vl);
        setEqLabels(el);
        setLabelsLoaded(true);
      });
  }, [stage]);

  // ── Auto-dismiss "saved" status after 4 seconds ────────────────────────────
  useEffect(() => {
    if (hpStatus !== "saved") return;
    const t = setTimeout(() => setHpStatus("idle"), 4000);
    return () => clearTimeout(t);
  }, [hpStatus]);

  useEffect(() => {
    if (labelsStatus !== "saved") return;
    const t = setTimeout(() => setLabelsStatus("idle"), 4000);
    return () => clearTimeout(t);
  }, [labelsStatus]);

  // ── Gate submit ────────────────────────────────────────────────────────────
  async function submitGate(e: React.FormEvent) {
    e.preventDefault();
    if (!gatePassword) return;
    setStage("checking");
    setGateError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: gatePassword }),
      });
      if (res.ok) {
        setStage("unlocked");
      } else {
        setGateError("Incorrect password");
        setStage("locked");
      }
    } catch {
      setGateError("Network error");
      setStage("locked");
    }
  }

  // ── Homepage save ──────────────────────────────────────────────────────────
  async function saveHomepage(e: React.FormEvent) {
    e.preventDefault();
    setHpStatus("saving"); setHpError("");
    try {
      const res = await fetch("/api/homepage", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: gatePassword, title: hpTitle, body: hpBody }),
      });
      if (res.ok) { setHpStatus("saved"); }
      else { setHpError((await res.json()).detail ?? "Save failed"); setHpStatus("error"); }
    } catch { setHpError("Network error"); setHpStatus("error"); }
  }

  // ── Surface labels + equation labels save (one request) ───────────────────
  async function saveLabels(e: React.FormEvent) {
    e.preventDefault();
    setLabelsStatus("saving"); setLabelsError("");
    try {
      const res = await fetch("/api/surface_labels", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: gatePassword, groups: groupLabels, variants: variantLabels, equations: eqLabels }),
      });
      if (res.ok) {
        bustSurfaceCache();
        setLabelsStatus("saved");
      } else {
        setLabelsError((await res.json()).detail ?? "Save failed");
        setLabelsStatus("error");
      }
    } catch { setLabelsError("Network error"); setLabelsStatus("error"); }
  }

  // ── Password gate ──────────────────────────────────────────────────────────
  if (stage === "locked" || stage === "checking") {
    return (
      <main style={s.gateMain}>
        <div style={s.gateBox}>
          <h2 style={s.gateHeading}>Admin</h2>
          <form onSubmit={submitGate} style={s.gateForm}>
            <input
              style={s.input}
              type="password"
              value={gatePassword}
              onChange={(e) => { setGatePassword(e.target.value); setGateError(""); }}
              placeholder="Password"
              autoComplete="current-password"
              autoFocus
              disabled={stage === "checking"}
            />
            <button type="submit" style={s.button} disabled={stage === "checking" || !gatePassword}>
              {stage === "checking" ? "Checking…" : "Enter"}
            </button>
            {gateError && <span style={s.error}>{gateError}</span>}
          </form>
        </div>
      </main>
    );
  }

  // ── Full admin UI (only rendered after successful auth) ────────────────────
  return (
    <main style={s.main}>
      <div style={s.container}>
        <h2 style={s.pageHeading}>Admin</h2>
        <p style={s.pageSubtitle}>
          Changes take effect immediately. Navigate to the relevant page to see them.
        </p>

        <hr style={s.sectionDivider} />

        {/* ── Homepage ─────────────────────────────────────────────────── */}
        <section style={s.section}>
          <h3 style={s.sectionHeading}>Homepage text</h3>
          <p style={s.sectionNote}>
            Text shown on the front page. Use $…$ for inline maths, $$…$$ for display maths.
          </p>

          <form onSubmit={saveHomepage} style={s.form}>
            <label style={s.fieldLabel}>
              Title
              <input style={s.input} value={hpTitle} disabled={!hpLoaded}
                onChange={(e) => { setHpTitle(e.target.value); setHpStatus("idle"); }}
                placeholder="Page title — use $…$ for inline maths" />
            </label>

            <label style={s.fieldLabel}>
              Body text
              <textarea style={s.textarea} value={hpBody} disabled={!hpLoaded} rows={8}
                onChange={(e) => { setHpBody(e.target.value); setHpStatus("idle"); }}
                placeholder={"Write your text here.\n\nLeave a blank line to start a new paragraph."} />
            </label>

            <SaveRow
              status={hpStatus} error={hpError} disabled={!hpLoaded} label="Save homepage"
              successMessage="Saved — navigate to the homepage to see the changes"
            />
          </form>

          <div style={s.preview}>
            <p style={s.previewLabel}>Preview</p>
            <div style={s.previewBox}>
              <h1 style={s.previewH1}><LatexLine text={hpTitle || " "} /></h1>
              <LatexText text={hpBody} paragraphStyle={s.previewP} />
            </div>
          </div>
        </section>

        <hr style={s.sectionDivider} />

        {/* ── Surface names + Equation labels ──────────────────────────── */}
        <section style={s.section}>
          <h3 style={s.sectionHeading}>Surface names &amp; equations</h3>
          <p style={s.sectionNote}>
            Names shown in the dropdown menus on the Compute page.
            The grey ID on the left is fixed — only edit the field on the right.
            A description for an equation appears as small text below its dropdown.
          </p>

          {!labelsLoaded && <p style={s.loadingText}>Loading…</p>}

          {labelsLoaded && labelsData && (
            <form onSubmit={saveLabels} style={s.form}>

              {/* Surface families + variants */}
              <p style={s.subHeading}>Surface families</p>
              {labelsData.groups.map((group) => {
                const groupVariants = labelsData.variants.filter((v) => v.group_key === group.key);
                return (
                  <div key={group.key} style={s.groupBlock}>
                    <LabelRow
                      badge="Family" id={group.key}
                      value={groupLabels[group.key] ?? group.label}
                      placeholder={group.key}
                      onChange={(v) => { setGroupLabels((p) => ({ ...p, [group.key]: v })); setLabelsStatus("idle"); }}
                    />
                    {groupVariants.map((v) => (
                      <LabelRow
                        key={v.key} badge="Surface" id={v.key}
                        value={variantLabels[v.key] ?? v.label}
                        placeholder={v.label}
                        indent
                        onChange={(nv) => { setVariantLabels((p) => ({ ...p, [v.key]: nv })); setLabelsStatus("idle"); }}
                      />
                    ))}
                  </div>
                );
              })}

              {/* Equations */}
              <p style={{ ...s.subHeading, marginTop: 20 }}>Equations</p>
              {labelsData.equations.map((eq: EquationLabelEntry) => (
                <div key={eq.key} style={s.groupBlock}>
                  <LabelRow
                    badge="Equation" id={eq.key}
                    value={eqLabels[eq.key]?.label ?? eq.label}
                    placeholder={eq.label}
                    onChange={(v) => {
                      setEqLabels((p) => ({ ...p, [eq.key]: { ...p[eq.key], label: v } }));
                      setLabelsStatus("idle");
                    }}
                  />
                  <div style={s.descRow}>
                    <span style={s.descBadge}>Description</span>
                    <textarea
                      rows={2}
                      style={s.descTextarea}
                      value={eqLabels[eq.key]?.description ?? eq.description}
                      placeholder="Optional: a short description shown below the dropdown"
                      onChange={(e) => {
                        setEqLabels((p) => ({ ...p, [eq.key]: { ...p[eq.key], description: e.target.value } }));
                        setLabelsStatus("idle");
                      }}
                    />
                  </div>
                </div>
              ))}

              <SaveRow
                status={labelsStatus} error={labelsError} disabled={false}
                label="Save surface names &amp; equations"
                successMessage="Saved — go to the Compute page to see the updated names"
              />
            </form>
          )}
        </section>

      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

interface LabelRowProps {
  badge: string;
  id: string;
  value: string;
  placeholder: string;
  indent?: boolean;
  onChange: (v: string) => void;
}

function LabelRow({ badge, id, value, placeholder, indent = false, onChange }: LabelRowProps) {
  return (
    <div style={{ ...s.labelRow, paddingLeft: indent ? 20 : 0 }}>
      <span style={s.idBadge}>{badge}</span>
      <span style={s.internalKey}>{id}</span>
      <span style={s.arrow}>→</span>
      <input style={s.labelInput} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

interface SaveRowProps {
  status: SaveStatus;
  error: string;
  disabled: boolean;
  label: string;
  successMessage?: string;
}

function SaveRow({ status, error, disabled, label, successMessage }: SaveRowProps) {
  return (
    <div style={s.actions}>
      <button type="submit" style={s.button} disabled={status === "saving" || disabled}
        dangerouslySetInnerHTML={{ __html: status === "saving" ? "Saving…" : label }} />
      {status === "saved" && (
        <span style={s.success}>{successMessage ?? "Saved successfully."}</span>
      )}
      {status === "error" && <span style={s.error}>{error}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = {
  // Gate screen
  gateMain:      { flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" },
  gateBox:       { width: "320px", padding: "40px 32px", border: "1px solid #e0e0e0", borderRadius: "6px", background: "#fafafa" },
  gateHeading:   { fontSize: "1.2rem", fontWeight: 700, color: "#111", marginBottom: "20px", textAlign: "center" as const },
  gateForm:      { display: "flex", flexDirection: "column" as const, gap: "12px" },
  // Admin screen
  main:          { flexGrow: 1, padding: "48px 24px", background: "#fff" },
  container:     { maxWidth: "860px", margin: "0 auto" },
  pageHeading:   { fontSize: "1.4rem", fontWeight: 700, color: "#111", marginBottom: "6px" },
  pageSubtitle:  { fontSize: "0.88rem", color: "#666", marginBottom: "28px" },
  sectionDivider:{ border: "none", borderTop: "1px solid #e0e0e0", margin: "36px 0" },
  section:       { marginBottom: "8px" },
  sectionHeading:{ fontSize: "1.05rem", fontWeight: 600, color: "#111", marginBottom: "6px" },
  sectionNote:   { fontSize: "0.85rem", color: "#666", marginBottom: "20px", lineHeight: 1.5 },
  subHeading:    { fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "#aaa", margin: "0 0 10px 0" },
  loadingText:   { fontSize: "0.85rem", color: "#999" },
  form:          { display: "flex", flexDirection: "column" as const, gap: "14px", marginBottom: "32px" },
  fieldLabel:    { display: "flex", flexDirection: "column" as const, gap: "5px", fontSize: "0.85rem", fontWeight: 500, color: "#333" },
  input:         { padding: "8px 10px", fontSize: "0.93rem", border: "1px solid #ccc", borderRadius: "3px", color: "#111", fontFamily: "inherit" },
  textarea:      { padding: "8px 10px", fontSize: "0.93rem", border: "1px solid #ccc", borderRadius: "3px", color: "#111", fontFamily: "inherit", resize: "vertical" as const, lineHeight: 1.55 },
  actions:       { display: "flex", alignItems: "center", gap: "14px", marginTop: "4px" },
  button:        { padding: "9px 22px", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: "3px", fontSize: "0.9rem", fontWeight: 500, cursor: "pointer" },
  success:       { color: "#2a7d2a", fontSize: "0.88rem" },
  error:         { color: "#c0392b", fontSize: "0.88rem" },
  preview:       { borderTop: "1px solid #ececec", paddingTop: "24px" },
  previewLabel:  { fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: "#aaa", marginBottom: "14px" },
  previewBox:    { padding: "24px", border: "1px solid #e8e8e8", borderRadius: "4px", background: "#fafafa" },
  previewH1:     { fontSize: "1.5rem", fontWeight: 700, color: "#111", marginBottom: "14px", lineHeight: 1.25 },
  previewP:      { fontSize: "1rem", color: "#444", margin: "0 0 12px 0", lineHeight: 1.7 },
  groupBlock:    { border: "1px solid #e8e8e8", borderRadius: "5px", padding: "14px 16px", display: "flex", flexDirection: "column" as const, gap: "10px", background: "#fafafa" },
  labelRow:      { display: "flex", alignItems: "center", gap: "10px" },
  idBadge:       { fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em", color: "#aaa", width: "60px", flexShrink: 0 },
  internalKey:   { fontSize: "0.78rem", color: "#bbb", fontFamily: "ui-monospace, monospace", width: "150px", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
  arrow:         { color: "#ccc", flexShrink: 0 },
  labelInput:    { flex: 1, padding: "5px 8px", fontSize: "0.88rem", border: "1px solid #d0d0d0", borderRadius: "3px", color: "#111", background: "#fff", fontFamily: "inherit" },
  descRow:       { display: "flex", alignItems: "flex-start", gap: "10px" },
  descBadge:     { fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em", color: "#aaa", width: "60px", flexShrink: 0, paddingTop: "6px" },
  descTextarea:  { flex: 1, padding: "5px 8px", fontSize: "0.85rem", border: "1px solid #d0d0d0", borderRadius: "3px", color: "#111", background: "#fff", fontFamily: "inherit", resize: "vertical" as const, lineHeight: 1.45 },
} as const;