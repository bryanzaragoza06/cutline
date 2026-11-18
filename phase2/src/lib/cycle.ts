import { nextPacificTimeOfDay } from "@/lib/timezone";

// Pure scheduling math — no DB imports, so it's safe to unit-test and to call
// from API routes.

const COOK_HOURS = 26;

export type DueCycleInfo = {
  startMode: string;
  startTimeOfDay: string | null;
  activatedAt: Date | null;
  repostIntervalMinutes: number | null;
  cycleLimit: number | null;
  breakMinutes: number | null;
  cyclePostCount: number;
  lastPostedAt: Date | null;
};

/**
 * When the account's next automated post is due, or null if its settings are
 * incomplete. The start setting only governs the first post after the account
 * is (re)armed; afterwards it's lastPostedAt + repost interval, or + break
 * once the cycle limit is reached.
 */
export function computeNextDueAt(account: DueCycleInfo, now: Date): Date | null {
  if (!account.lastPostedAt) {
    // never posted since last (re)arm
    if (account.startMode === "NOW") return now;
    if (account.startMode === "COOK") {
      if (!account.activatedAt) return null;
      return new Date(account.activatedAt.getTime() + COOK_HOURS * 60 * 60_000);
    }
    const match = /^(\d{1,2}):(\d{2})$/.exec((account.startTimeOfDay ?? "").trim());
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour > 23 || minute > 59) return null;
    return nextPacificTimeOfDay(hour, minute, now);
  }
  const onBreak = account.cycleLimit != null && account.cyclePostCount >= account.cycleLimit;
  if (onBreak) {
    if (account.breakMinutes == null) return null;
    return new Date(account.lastPostedAt.getTime() + account.breakMinutes * 60_000);
  }
  if (account.repostIntervalMinutes == null) return null;
  return new Date(account.lastPostedAt.getTime() + account.repostIntervalMinutes * 60_000);
}
