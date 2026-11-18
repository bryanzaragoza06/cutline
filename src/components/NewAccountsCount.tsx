"use client";

import { useSyncExternalStore } from "react";
import { countThisWeek, countToday } from "@/lib/format";
import { useNow } from "@/lib/useNow";

const subscribe = () => () => {};

/**
 * Number of accounts connected today / this week (since Sunday), in the
 * viewer's timezone. The server can't know that timezone, so it passes recent
 * connect times and the client counts after hydration (re-checked
 * periodically so it rolls over at midnight).
 */
export default function NewAccountsCount({ connectedAt, period }: { connectedAt: string[]; period: "today" | "week" }) {
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);
  const now = useNow(60_000);
  if (!isClient) return <span>&nbsp;</span>;
  const count = period === "today" ? countToday(connectedAt, new Date(now)) : countThisWeek(connectedAt, new Date(now));
  return <span>{count}</span>;
}
