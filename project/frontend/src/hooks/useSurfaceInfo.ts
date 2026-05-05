// frontend/src/hooks/useSurfaceInfo.ts
import { useState, useEffect } from "react";
import type { SurfaceInfo } from "../types/index";

export function useSurfaceInfo(rays: [number, number][] | null): {
  info: SurfaceInfo | null;
  loading: boolean;
  error: string | null;
} {
  const [info, setInfo] = useState<SurfaceInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const raysKey = JSON.stringify(rays);

  useEffect(() => {
    if (!rays || rays.length < 3) {
      setInfo(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const controller = new AbortController();

    fetch("/api/surface_info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rays }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => res.statusText);
          throw new Error(`/api/surface_info ${res.status}: ${text}`);
        }
        return res.json() as Promise<SurfaceInfo>;
      })
      .then((data) => {
        if (!cancelled) { setInfo(data); setLoading(false); }
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      });

    return () => { cancelled = true; controller.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raysKey]);

  return { info, loading, error };
}
