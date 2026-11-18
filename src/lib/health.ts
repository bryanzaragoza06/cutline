import { prisma } from "@/lib/prisma";

// Database health for the background worker: WAL mode at startup, a watchdog
// that restarts the process if the database stops answering, and a periodic
// heartbeat log line so outages can be dated from the logs.

const PING_EVERY_MS = 30_000;
const PING_TIMEOUT_MS = 15_000;
// 6 failed pings in a row ≈ 3 minutes of an unresponsive database.
const MAX_CONSECUTIVE_FAILURES = 6;
const HEARTBEAT_EVERY_MS = 5 * 60_000;

/**
 * WAL journal mode: readers no longer wait on writers (and vice versa), so one
 * slow write can't freeze every page and worker tick. It's stored in the
 * database file, so this only changes anything the first time.
 */
export async function enableWal(): Promise<void> {
  try {
    const rows = await prisma.$queryRawUnsafe<{ journal_mode: string }[]>("PRAGMA journal_mode=WAL;");
    console.log(`[health] database journal mode: ${rows[0]?.journal_mode ?? "unknown"}`);
  } catch (err) {
    console.error("[health] couldn't enable WAL mode", err);
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/**
 * Groups error messages so similar ones count together: numbers, ids and
 * quoted values are masked and the text is trimmed. Only our own error text is
 * stored in these fields (never tokens), but it's still kept short.
 */
export function normalizeError(message: string): string {
  return message
    .replace(/\s+/g, " ")
    // Long quoted values (log ids, payload dumps) are noise; short ones like
    // "invalid_grant" or "Refresh token is invalid." are the useful part.
    .replace(/"[^"]{61,400}"/g, '"…"')
    .replace(/\b[a-z0-9_-]{20,}\b/gi, "…")
    .replace(/\d+(\.\d+)?/g, "#")
    .trim()
    .slice(0, 160);
}

export function topErrors(messages: (string | null | undefined)[], limit = 3): { message: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const m of messages) {
    if (!m) continue;
    const key = normalizeError(m);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([message, count]) => ({ message, count }));
}

async function heartbeat(lastPingMs: number): Promise<void> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [active, pending, processing, lastPosted, posted24h, failedPosts, failedRenders, accountErrors] = await Promise.all([
    prisma.account.count({ where: { active: true } }),
    prisma.schedule.count({ where: { status: "PENDING" } }),
    prisma.schedule.count({ where: { status: "PROCESSING" } }),
    prisma.schedule.findFirst({ where: { status: "POSTED" }, orderBy: { postedAt: "desc" }, select: { postedAt: true } }),
    prisma.schedule.count({ where: { status: "POSTED", postedAt: { gte: since } } }),
    prisma.schedule.findMany({ where: { status: "FAILED", postedAt: { gte: since } }, select: { error: true } }),
    prisma.generatedVideo.findMany({ where: { status: "FAILED", createdAt: { gte: since } }, select: { error: true } }),
    prisma.account.findMany({ where: { lastError: { not: null } }, select: { lastError: true, active: true, displayName: true } }),
  ]);
  console.log(
    `[heartbeat] ok — db ${lastPingMs}ms · ${active} active accounts · ${pending} pending / ${processing} processing posts · last published ${
      lastPosted?.postedAt ? lastPosted.postedAt.toISOString() : "never"
    }`,
  );
  console.log(
    `[heartbeat] last 24h — ${posted24h} published · ${failedPosts.length} failed posts · ${failedRenders.length} failed renders · ${
      accountErrors.length
    } accounts showing an error (${accountErrors.filter((a) => a.active).length} active)`,
  );
  if (accountErrors.length) {
    const names = accountErrors.map((a) => a.displayName);
    console.log(`[heartbeat] accounts with errors — ${names.slice(0, 10).join(", ")}${names.length > 10 ? ` (+${names.length - 10} more)` : ""}`);
  }
  const top = topErrors([...failedPosts.map((f) => f.error), ...failedRenders.map((f) => f.error), ...accountErrors.map((a) => a.lastError)]);
  if (top.length) {
    console.log(`[heartbeat] top errors — ${top.map((t) => `${t.count}× ${t.message}`).join(" | ")}`);
  }
}

export type WatchdogOptions = {
  ping?: () => Promise<unknown>;
  onUnhealthy?: () => void;
  onHealthy?: (pingMs: number) => void;
  intervalMs?: number;
  maxFailures?: number;
};

/**
 * Pings the database every 30s. If it fails 6 times in a row (~3 minutes),
 * the process exits so Railway's ON_FAILURE restart policy starts it fresh —
 * a restart is what cleared the Nov 6 lock-up. Returns a stop function.
 */
export function startDatabaseWatchdog(options: WatchdogOptions = {}): () => void {
  const ping = options.ping ?? (() => withTimeout(prisma.$queryRawUnsafe("SELECT 1"), PING_TIMEOUT_MS));
  const maxFailures = options.maxFailures ?? MAX_CONSECUTIVE_FAILURES;
  const onUnhealthy =
    options.onUnhealthy ??
    (() => {
      if (process.env.NODE_ENV !== "production") {
        console.error("[health] database unresponsive for ~3 minutes (dev: not exiting)");
        return;
      }
      console.error("[health] database unresponsive for ~3 minutes — exiting so Railway restarts the app");
      // Give the log line a moment to flush.
      setTimeout(() => process.exit(1), 500);
    });
  let lastHeartbeat = 0;
  const onHealthy =
    options.onHealthy ??
    ((ms: number) => {
      if (Date.now() - lastHeartbeat < HEARTBEAT_EVERY_MS) return;
      lastHeartbeat = Date.now();
      heartbeat(ms).catch((err) => console.error("[heartbeat] failed", err));
    });

  let failures = 0;
  const check = async () => {
    const started = Date.now();
    try {
      await ping();
      if (failures > 0) console.log(`[health] database responding again after ${failures} failed check(s)`);
      failures = 0;
      onHealthy(Date.now() - started);
    } catch (err) {
      failures++;
      console.error(`[health] database check failed (${failures}/${maxFailures}):`, err instanceof Error ? err.message.split("\n").pop() : err);
      if (failures === maxFailures) onUnhealthy();
    }
  };

  const timer = setInterval(check, options.intervalMs ?? PING_EVERY_MS);
  void check();
  return () => clearInterval(timer);
}
