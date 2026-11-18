import { readdir, stat, statfs, unlink } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { STORAGE_DIR } from "@/lib/storage";

const GENERATED_SUBDIR = "generated/videos";
const HOUR_MS = 60 * 60 * 1000;

/** Keep generated videos for less time as the volume fills up. */
async function retentionMs(): Promise<number> {
  try {
    const fs = await statfs(STORAGE_DIR);
    const usedFraction = 1 - fs.bavail / fs.blocks;
    if (usedFraction >= 0.9) return 0;
    if (usedFraction >= 0.75) return HOUR_MS;
  } catch {
    // statfs unsupported — fall back to the relaxed retention.
  }
  return 6 * HOUR_MS;
}

/**
 * Deletes old generated videos. A video whose post still has a PENDING or
 * PROCESSING schedule is never deleted — it hasn't reached TikTok yet.
 */
export async function cleanupOldGeneratedVideos(): Promise<number> {
  const dir = path.join(STORAGE_DIR, GENERATED_SUBDIR);
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return 0;
  }

  const retention = await retentionMs();
  const cutoff = Date.now() - retention;

  const inFlight = await prisma.post.findMany({
    where: { videoUrl: { not: null }, schedules: { some: { status: { in: ["PENDING", "PROCESSING"] } } } },
    select: { videoUrl: true },
  });
  const protectedNames = new Set(inFlight.map((p) => path.basename(p.videoUrl!)));

  let deleted = 0;
  for (const name of files) {
    if (!name.endsWith(".mp4") || protectedNames.has(name)) continue;
    const filePath = path.join(dir, name);
    try {
      const info = await stat(filePath);
      if (!info.isFile() || info.mtimeMs > cutoff) continue;
      await unlink(filePath);
      deleted++;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") console.error("[cleanup] failed to delete", filePath, err);
    }
  }
  if (deleted) console.log(`[cleanup] deleted ${deleted} generated video(s) (retention ${retention / HOUR_MS}h)`);
  return deleted;
}
