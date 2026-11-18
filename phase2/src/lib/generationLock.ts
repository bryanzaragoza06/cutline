import { prisma } from "@/lib/prisma";

const LOCK_ID = "singleton";
// A crashed render can't release the lock; reclaim it after this long.
const STALE_LOCK_MS = 10 * 60 * 1000;

/**
 * System-wide mutex so only one ffmpeg render runs at a time (container
 * memory). Compare-and-swap via updateMany — SQLite has no row locks.
 */
export async function acquireGenerationLock(): Promise<boolean> {
  await prisma.generationLock.upsert({ where: { id: LOCK_ID }, create: { id: LOCK_ID }, update: {} });
  const now = new Date();

  const clean = await prisma.generationLock.updateMany({
    where: { id: LOCK_ID, lockedAt: null },
    data: { lockedAt: now },
  });
  if (clean.count > 0) return true;

  const stale = await prisma.generationLock.updateMany({
    where: { id: LOCK_ID, lockedAt: { lt: new Date(now.getTime() - STALE_LOCK_MS) } },
    data: { lockedAt: now },
  });
  return stale.count > 0;
}

export async function releaseGenerationLock(): Promise<void> {
  await prisma.generationLock.updateMany({ where: { id: LOCK_ID }, data: { lockedAt: null } });
}
