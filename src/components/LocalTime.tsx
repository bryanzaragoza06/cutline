"use client";

import { useSyncExternalStore } from "react";
import { formatAbsoluteTime, formatDateTime } from "@/lib/format";

const subscribe = () => () => {};

/**
 * Renders a timestamp in the viewer's timezone. Server components can't know
 * it, so the server renders nothing and the client fills it in after hydration.
 */
export default function LocalTime({ value, style = "datetime" }: { value: string | Date; style?: "datetime" | "absolute" }) {
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);
  if (!isClient) return <span>&nbsp;</span>;
  return <span>{style === "absolute" ? formatAbsoluteTime(value) : formatDateTime(value)}</span>;
}
