// frontend/src/hooks/useSurfaces.ts
// Role: Fetches the surface catalogue from GET /api/surfaces on mount.
//       Result is cached in module scope so repeated renders do not re-fetch.

import { useState, useEffect } from "react";
import type { SurfaceCatalogue } from "../types/index";

interface UseSurfacesResult {
  catalogue: SurfaceCatalogue | null;
  loading: boolean;
  error: string | null;
}

let _cache: SurfaceCatalogue | null = null;
let _inflight: Promise<SurfaceCatalogue> | null = null;

/** Call after an admin save so the next useSurfaces call re-fetches fresh data. */
export function bustSurfaceCache(): void {
  _cache = null;
  _inflight = null;
}

async function fetchCatalogue(): Promise<SurfaceCatalogue> {
  if (_cache !== null) return _cache;
  if (_inflight !== null) return _inflight;

  _inflight = (async () => {
    const res = await fetch("/api/surfaces");
    if (!res.ok) throw new Error(`GET /api/surfaces returned ${res.status}`);
    const body = (await res.json()) as SurfaceCatalogue;
    _cache = body;
    return body;
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

export function useSurfaces(): UseSurfacesResult {
  const [catalogue, setCatalogue] = useState<SurfaceCatalogue | null>(_cache);
  const [loading, setLoading] = useState<boolean>(_cache === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (_cache !== null) {
      setCatalogue(_cache);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchCatalogue()
      .then((data) => {
        if (!cancelled) { setCatalogue(data); setLoading(false); }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, []);

  return { catalogue, loading, error };
}
