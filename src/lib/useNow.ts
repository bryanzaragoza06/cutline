"use client";

import { useEffect, useState } from "react";

/** Current time in ms, refreshed every `intervalMs` — keeps render functions pure. */
export function useNow(intervalMs = 5000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
