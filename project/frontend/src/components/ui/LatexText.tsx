// frontend/src/components/ui/LatexText.tsx
// Renders a string that may contain $...$ (inline) and $$...$$ (display) LaTeX.
// Double newlines become paragraph breaks.

import React from "react";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

type Segment =
  | { kind: "text"; content: string }
  | { kind: "inline"; content: string }
  | { kind: "display"; content: string };

function parseSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  let i = 0;
  let textStart = 0;

  while (i < text.length) {
    if (text[i] !== "$") { i++; continue; }

    // Flush plain text before this $
    if (i > textStart) segments.push({ kind: "text", content: text.slice(textStart, i) });

    if (text[i + 1] === "$") {
      const end = text.indexOf("$$", i + 2);
      if (end !== -1) {
        segments.push({ kind: "display", content: text.slice(i + 2, end) });
        i = end + 2;
        textStart = i;
        continue;
      }
    } else {
      const end = text.indexOf("$", i + 1);
      if (end !== -1) {
        segments.push({ kind: "inline", content: text.slice(i + 1, end) });
        i = end + 1;
        textStart = i;
        continue;
      }
    }
    // Unmatched $ — treat as literal text
    i++;
  }

  if (textStart < text.length) segments.push({ kind: "text", content: text.slice(textStart) });
  return segments;
}

function renderSegments(segments: Segment[]): React.ReactNode[] {
  return segments.map((seg, j) => {
    if (seg.kind === "inline") return <InlineMath key={j} math={seg.content} />;
    if (seg.kind === "display") return <BlockMath key={j} math={seg.content} />;
    return <React.Fragment key={j}>{seg.content}</React.Fragment>;
  });
}

interface LatexTextProps {
  /** Full text, paragraphs separated by blank lines (\n\n). */
  text: string;
  paragraphStyle?: React.CSSProperties;
}

/** Block renderer: splits on \n\n, renders each paragraph with LaTeX support. */
export function LatexText({ text, paragraphStyle }: LatexTextProps): React.ReactElement {
  const paras = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  return (
    <>
      {paras.map((para, i) => {
        const segments = parseSegments(para);
        const hasDisplay = segments.some((s) => s.kind === "display");
        if (hasDisplay) {
          return <div key={i} style={paragraphStyle}>{renderSegments(segments)}</div>;
        }
        return <p key={i} style={paragraphStyle}>{renderSegments(segments)}</p>;
      })}
    </>
  );
}

interface LatexLineProps {
  /** Single line of text with optional $...$ inline math. */
  text: string;
}

/** Inline renderer: for a single line (e.g. a heading) with optional $...$ math. */
export function LatexLine({ text }: LatexLineProps): React.ReactElement {
  return <>{renderSegments(parseSegments(text))}</>;
}
