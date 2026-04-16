// frontend/src/components/ui/MathDisplay.tsx
// Role: Thin wrapper around react-katex for rendering LaTeX strings.
//       display=true uses \displaystyle block rendering; false is inline.
// Assumptions: katex CSS is loaded globally in index.html.

import React from "react";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

interface MathDisplayProps {
  tex: string;
  display?: boolean;
}

export function MathDisplay({ tex, display = false }: MathDisplayProps): React.ReactElement {
  if (display) {
    return <BlockMath math={tex} />;
  }
  return <InlineMath math={tex} />;
}
