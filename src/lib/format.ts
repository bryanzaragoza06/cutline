// Client-side date formatting — always in the viewer's local timezone.

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function formatClock(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** "Today at 9:05 AM" / "Yesterday at …" / "Tomorrow at …" / "Sep 27 at 9:05 AM". */
export function formatAbsoluteTime(input: string | Date, now = new Date()): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const dayDiff = Math.round((startOfDay(date) - startOfDay(now)) / 86_400_000);
  const clock = formatClock(date);
  if (dayDiff === 0) return `Today at ${clock}`;
  if (dayDiff === -1) return `Yesterday at ${clock}`;
  if (dayDiff === 1) return `Tomorrow at ${clock}`;
  const day = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
  return `${day} at ${clock}`;
}

export function formatDateTime(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Value for <input type="datetime-local"> in local time. */
export function toDateTimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Video src for previews. The #t=0.1 media fragment makes Safari/iOS seek and
 * paint a first frame; with preload="metadata" they otherwise show an empty box.
 * The fragment is never sent to the server.
 */
export function previewSrc(url: string): string {
  return url.includes("#") ? url : `${url}#t=0.1`;
}

function formatMinutes(m: number): string {
  if (m >= 60) return `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}`;
  return `${m}m`;
}

/** One-line description of a posting schedule, e.g. "Every 1h 30m · 3 posts · 1h break". */
export function scheduleSummary(s: { repostIntervalMinutes: number | null; cycleLimit: number | null; breakMinutes: number | null }): string {
  const every = s.repostIntervalMinutes == null ? "?" : formatMinutes(s.repostIntervalMinutes);
  const brk = s.breakMinutes == null ? "? break" : s.breakMinutes === 0 ? "no break" : `${formatMinutes(s.breakMinutes)} break`;
  return `Every ${every} · ${s.cycleLimit ?? "?"} posts · ${brk}`;
}

/** How many of these timestamps fall on today's date in the viewer's timezone. */
export function countToday(timestamps: (string | Date)[], now: Date = new Date()): number {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const end = start + 86_400_000;
  return timestamps.filter((t) => {
    const ms = new Date(t).getTime();
    return ms >= start && ms < end;
  }).length;
}

/** How many of these timestamps fall in the current week (since Sunday 00:00, viewer's timezone). */
export function countThisWeek(timestamps: (string | Date)[], now: Date = new Date()): number {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).getTime();
  return timestamps.filter((t) => {
    const ms = new Date(t).getTime();
    return ms >= start && ms <= now.getTime();
  }).length;
}
