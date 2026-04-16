// frontend/src/hooks/useExperiments.ts
// Role: Fetches the full experiment list from GET /api/experiments on mount.
//       Result is cached in module scope so repeated renders do not re-fetch.
// Assumptions: /api/* is proxied to http://localhost:8000 by Vite dev server.
//              In production the frontend is served from the same origin as the API.

import { useState, useEffect } from "react";
import type { ExperimentMeta } from "../types/index";

interface UseExperimentsResult {
  experiments: ExperimentMeta[];
  loading: boolean;
  error: string | null;
}

// Module-level cache — survives re-renders, cleared on page reload.
let _cache: ExperimentMeta[] | null = null;
let _inflight: Promise<ExperimentMeta[]> | null = null;

async function fetchExperiments(): Promise<ExperimentMeta[]> {
  if (_cache !== null) return _cache;
  if (_inflight !== null) return _inflight;

  _inflight = (async () => {
    const res = await fetch("/api/experiments");
    if (!res.ok) {
      throw new Error(`GET /api/experiments returned ${res.status}`);
    }
    const body: unknown = await res.json();
    if (
      typeof body !== "object" ||
      body === null ||
      !Array.isArray((body as Record<string, unknown>).experiments)
    ) {
      throw new Error("Unexpected response shape from /api/experiments");
    }
    const data = (body as { experiments: ExperimentMeta[] }).experiments;
    _cache = data;
    return data;
  })();

  try {
    const result = await _inflight;
    _inflight = null;
    return result;
  } catch (err) {
    _inflight = null;
    throw err;
  }
}

export function useExperiments(): UseExperimentsResult {
  const [experiments, setExperiments] = useState<ExperimentMeta[]>(_cache ?? []);
  const [loading, setLoading] = useState<boolean>(_cache === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (_cache !== null) {
      setExperiments(_cache);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchExperiments()
      .then((data) => {
        if (!cancelled) {
          setExperiments(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { experiments, loading, error };
}
