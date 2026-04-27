// frontend/src/pages/AdminPage.tsx
// Password-protected editor for the homepage title and body.
// Route: /admin  (not linked from the public nav)

import React, { useEffect, useState } from "react";
import { LatexText, LatexLine } from "../components/ui/LatexText";

interface HomepageContent {
  title: string;
  body: string;
}

type Status = "idle" | "saving" | "saved" | "error";

export function AdminPage(): React.ReactElement {
  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch("/api/homepage")
      .then((r) => r.json())
      .then((data: HomepageContent) => {
        setTitle(data.title);
        setBody(data.body);
        setLoaded(true);
      });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setErrorMsg("");
    try {
      const res = await fetch("/api/homepage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, title, body }),
      });
      if (res.ok) {
        setStatus("saved");
        setPassword("");
      } else {
        const data = await res.json();
        setErrorMsg(data.detail ?? "Save failed");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Network error");
      setStatus("error");
    }
  }

  return (
    <main style={styles.main}>
      <div style={styles.container}>
        <h2 style={styles.heading}>Edit Homepage</h2>

        <form onSubmit={handleSave} style={styles.form}>
          <label style={styles.label}>
            Title
            <input
              style={styles.input}
              value={title}
              onChange={(e) => { setTitle(e.target.value); setStatus("idle"); }}
              disabled={!loaded}
              placeholder="Title — use $...$ for inline math"
            />
          </label>

          <label style={styles.label}>
            Body
            <textarea
              style={styles.textarea}
              value={body}
              onChange={(e) => { setBody(e.target.value); setStatus("idle"); }}
              disabled={!loaded}
              rows={10}
              placeholder={"Paragraph text.\n\nNew paragraph. Use $x^2$ for inline math or $$E=mc^2$$ for display math."}
            />
          </label>

          <label style={styles.label}>
            Password
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setStatus("idle"); }}
              placeholder="Admin password"
              autoComplete="current-password"
            />
          </label>

          <div style={styles.actions}>
            <button type="submit" style={styles.button} disabled={status === "saving" || !password}>
              {status === "saving" ? "Saving…" : "Save"}
            </button>
            {status === "saved" && <span style={styles.success}>Saved.</span>}
            {status === "error" && <span style={styles.error}>{errorMsg}</span>}
          </div>
        </form>

        {/* Live preview */}
        <div style={styles.preview}>
          <p style={styles.previewLabel}>Preview</p>
          <div style={styles.previewBox}>
            <h1 style={styles.previewH1}>
              <LatexLine text={title || " "} />
            </h1>
            <LatexText text={body} paragraphStyle={styles.previewP} />
          </div>
        </div>
      </div>
    </main>
  );
}

const styles = {
  main: {
    flexGrow: 1,
    padding: "48px 24px",
  },
  container: {
    maxWidth: "800px",
    margin: "0 auto",
  },
  heading: {
    fontSize: "1.2rem",
    fontWeight: 600,
    color: "#111",
    marginBottom: "24px",
  },
  form: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
    marginBottom: "40px",
  },
  label: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
    fontSize: "0.85rem",
    fontWeight: 500,
    color: "#333",
  },
  input: {
    padding: "8px 10px",
    fontSize: "0.93rem",
    border: "1px solid #ccc",
    borderRadius: "3px",
    fontFamily: "monospace",
    color: "#111",
  },
  textarea: {
    padding: "8px 10px",
    fontSize: "0.93rem",
    border: "1px solid #ccc",
    borderRadius: "3px",
    fontFamily: "monospace",
    color: "#111",
    resize: "vertical" as const,
    lineHeight: 1.5,
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  button: {
    padding: "9px 20px",
    background: "#1a1a1a",
    color: "#fff",
    border: "none",
    borderRadius: "3px",
    fontSize: "0.9rem",
    fontWeight: 500,
    cursor: "pointer",
  },
  success: {
    color: "#2a7d2a",
    fontSize: "0.88rem",
  },
  error: {
    color: "#c0392b",
    fontSize: "0.88rem",
  },
  preview: {
    borderTop: "1px solid #e8e8e8",
    paddingTop: "32px",
  },
  previewLabel: {
    fontSize: "0.78rem",
    fontWeight: 600,
    letterSpacing: "0.07em",
    textTransform: "uppercase" as const,
    color: "#999",
    marginBottom: "16px",
  },
  previewBox: {
    padding: "24px",
    border: "1px solid #e8e8e8",
    borderRadius: "4px",
    background: "#fafafa",
  },
  previewH1: {
    fontSize: "1.6rem",
    fontWeight: 700,
    color: "#111",
    marginBottom: "16px",
    lineHeight: 1.25,
  },
  previewP: {
    fontSize: "1rem",
    color: "#444",
    margin: "0 0 14px 0",
    lineHeight: 1.7,
  },
} as const;
