// frontend/src/hooks/useSlice.ts
// Role: Posts to POST /api/slice with a 150ms debounce. Keeps previous slice data
//       visible while loading. Clears data immediately on experiment change.
// Assumptions: experimentId null means no experiment selected — no fetch issued.

import { useState, useEffect, useRef } from "react";
import type { HeatmapSlice } from "../types/index";

interface UseSliceResult {
  data: HeatmapSlice | null;
  loading: boolean;
  error: string | null;
}

const DEBOUNCE_MS = 150;

export function useSlice(
  experimentId: string | null,
  sliderIndices: number[]
): UseSliceResult {
  const [data, setData] = useState<HeatmapSlice | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Track the last experimentId to detect changes.
  const prevExperimentId = useRef<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortController = useRef<AbortController | null>(null);

  useEffect(() => {
    if (experimentId === null) {
      // No selection — clear everything.
      setData(null);
      setLoading(false);
      setError(null);
      prevExperimentId.current = null;
      return;
    }

    // Experiment changed — clear immediately so stale data is not shown.
    if (experimentId !== prevExperimentId.current) {
      setData(null);
      setError(null);
      prevExperimentId.current = experimentId;
    }

    // Cancel any in-flight request and pending debounce.
    if (debounceTimer.current !== null) {
      clearTimeout(debounceTimer.current);
    }
    if (abortController.current !== null) {
      abortController.current.abort();
    }

    setLoading(true);

    const id = experimentId;
    const indices = [...sliderIndices];

    debounceTimer.current = setTimeout(() => {
      const controller = new AbortController();
      abortController.current = controller;

      fetch("/api/slice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experiment_id: id,
          slider_indices: indices,
        }),
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok) {
            const text = await res.text().catch(() => res.statusText);
            throw new Error(`POST /api/slice returned ${res.status}: ${text}`);
          }
          const body: unknown = await res.json();
          return body as HeatmapSlice;
        })
        .then((slice) => {
          setData(slice);
          setError(null);
          setLoading(false);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") {
            // Superseded by a newer request — do nothing.
            return;
          }
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current !== null) clearTimeout(debounceTimer.current);
      if (abortController.current !== null) abortController.current.abort();
    };
  }, [experimentId, sliderIndices.join(",")]);

  return { data, loading, error };
}
