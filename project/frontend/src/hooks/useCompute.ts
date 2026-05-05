// frontend/src/hooks/useCompute.ts
// Role: POSTs to /api/compute with a 200ms debounce. Keeps previous result
//       visible while loading. Clears immediately when request becomes null.

import { useState, useEffect, useRef } from "react";
import type { ComputeRequest, ComputeResult } from "../types/index";

interface UseComputeResult {
  result: ComputeResult | null;
  loading: boolean;
  error: string | null;
}

const DEBOUNCE_MS = 200;

export function useCompute(request: ComputeRequest | null): UseComputeResult {
  const [result, setResult] = useState<ComputeResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortController = useRef<AbortController | null>(null);

  // Stable key: JSON-serialised request, or null sentinel.
  const requestKey = request === null ? null : JSON.stringify(request);

  useEffect(() => {
    if (request === null) {
      setResult(null);
      setLoading(false);
      setError(null);
      return;
    }

    if (debounceTimer.current !== null) clearTimeout(debounceTimer.current);
    if (abortController.current !== null) abortController.current.abort();

    setLoading(true);
    const body = request;

    debounceTimer.current = setTimeout(() => {
      const controller = new AbortController();
      abortController.current = controller;

      fetch("/api/compute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok) {
            const text = await res.text().catch(() => res.statusText);
            throw new Error(`POST /api/compute returned ${res.status}: ${text}`);
          }
          return res.json() as Promise<ComputeResult>;
        })
        .then((data) => {
          setResult(data);
          setError(null);
          setLoading(false);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current !== null) clearTimeout(debounceTimer.current);
      if (abortController.current !== null) abortController.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  return { result, loading, error };
}
