import type { PostingSchedule } from "@prisma/client";
import type { DueCycleInfo } from "@/lib/cycle";

export const START_MODES = ["NOW", "AT_TIME", "COOK"];
export const TIME_OF_DAY = /^([01]?\d|2[0-3]):[0-5]\d$/;

type FrequencyFields = Pick<DueCycleInfo, "repostIntervalMinutes" | "cycleLimit" | "breakMinutes">;

/**
 * The cycle settings an account actually follows: posting frequency (repost
 * interval, cycle limit, break) from its master schedule when it has one,
 * otherwise its own legacy fields. Start mode/time always come from the account.
 */
export function effectiveCycle<T extends FrequencyFields & { postingSchedule?: FrequencyFields | null }>(account: T): T {
  const s = account.postingSchedule;
  if (!s) return account;
  return {
    ...account,
    repostIntervalMinutes: s.repostIntervalMinutes,
    cycleLimit: s.cycleLimit,
    breakMinutes: s.breakMinutes,
  };
}

/** What a schedule still needs before accounts can run on it. */
export function scheduleMissing(s: FrequencyFields): string[] {
  const missing: string[] = [];
  if (s.repostIntervalMinutes == null) missing.push("set a repost interval");
  if (s.cycleLimit == null) missing.push("set a cycle limit");
  if (s.breakMinutes == null) missing.push("set a break time");
  return missing;
}

/** undefined = field absent; null = cleared; number = valid; "invalid" = reject. */
export function parseOptionalInt(value: unknown, min: number): number | null | undefined | "invalid" {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < min) return "invalid";
  return n;
}

export type { PostingSchedule };
