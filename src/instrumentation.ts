// Next calls register() once per server process. Scheduled posts are published
// here — a real server-side worker, not a client setInterval (that only ticks
// while a browser tab is open). It assumes exactly one server process:
// SQLite is single-writer and the worker isn't distributed.
//
// Phase 2 adds the automation tick (generate a fresh video for each account that
// is about to post) next to the publish tick; see phase2/src/lib/automation.ts.

const TICK_MS = 15_000;
const CLEANUP_MS = 10 * 60_000;

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Never run the worker inside `next build`'s page-data workers.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const globalForWorker = globalThis as unknown as { __cutlineWorkerStarted?: boolean };
  if (globalForWorker.__cutlineWorkerStarted) return;
  globalForWorker.__cutlineWorkerStarted = true;

  const { runPublishDueTick } = await import("@/lib/publishDue");
  const { cleanupUploadedVideos } = await import("@/lib/cleanup");
  const { enableWal, startDatabaseWatchdog } = await import("@/lib/health");

  await enableWal();
  startDatabaseWatchdog();

  let ticking = false;
  const tick = async () => {
    // Never overlap ticks.
    if (ticking) return;
    ticking = true;
    try {
      await runPublishDueTick();
    } catch (err) {
      console.error("[publish] tick failed", err);
    } finally {
      ticking = false;
    }
  };

  const cleanup = async () => {
    try {
      await cleanupUploadedVideos();
    } catch (err) {
      console.error("[cleanup] failed", err);
    }
  };

  void tick();
  setInterval(tick, TICK_MS);
  void cleanup();
  setInterval(cleanup, CLEANUP_MS);
  console.log(`[worker] started (publishing scheduled posts every ${TICK_MS / 1000}s)`);
}
