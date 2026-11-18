"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Fetch JSON on mount (and optionally every `pollMs`). `reload()` re-fetches
 * on demand; `setData` allows optimistic local updates.
 */
export function useFetchJson<T>(url: string, pollMs?: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef(url);

  const fetchOnce = useCallback(async (): Promise<void> => {
    const requested = urlRef.current;
    try {
      const res = await fetch(requested, { cache: "no-store" });
      const body = await res.json().catch(() => null);
      if (requested !== urlRef.current) return;
      if (!res.ok) {
        setError(body?.error ?? `Request failed (${res.status})`);
        return;
      }
      setError(null);
      setData(body as T);
    } catch {
      // Network blip — keep showing the last good data.
    }
  }, []);

  useEffect(() => {
    urlRef.current = url;
    fetchOnce();
    if (!pollMs) return;
    const timer = setInterval(fetchOnce, pollMs);
    return () => clearInterval(timer);
  }, [url, pollMs, fetchOnce]);

  return { data, error, setData, reload: fetchOnce };
}
