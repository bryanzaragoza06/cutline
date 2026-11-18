import { createHash } from "crypto";
import { createReadStream } from "fs";
import path from "path";
import sharp from "sharp";
import type { LibraryItem, LibraryKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { errorMessage } from "@/lib/api";
import { mediaUrlToAbsolutePath, saveBuffer, saveUploadedFile } from "@/lib/storage";
import { unlinkMediaUrl } from "@/lib/files";
import { getAudioDuration } from "@/lib/ffmpeg";

// Keep sharp's memory footprint small in a constrained container.
sharp.cache(false);
sharp.concurrency(1);

export type UploadKind = "IMAGE" | "VIDEO" | "AUDIO";
export type UploadFailure = { filename: string; error: string };

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;
const VIDEO_EXT = /\.(mp4|mov|webm|m4v)$/i;
const AUDIO_EXT = /\.(mp3|wav)$/i;

/** Multipart field name each upload kind arrives under. */
export const UPLOAD_FIELD: Record<UploadKind, string> = { IMAGE: "images", VIDEO: "videos", AUDIO: "audio" };

function libraryDir(userId: string, kind: UploadKind): string {
  return `uploads/library/${userId}/${kind === "IMAGE" ? "images" : kind === "VIDEO" ? "videos" : "audio"}`;
}

function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    createReadStream(filePath)
      .on("data", (chunk) => hash.update(chunk))
      .on("error", reject)
      .on("end", () => resolve(hash.digest("hex")));
  });
}

/** Fingerprints any of the user's clips uploaded before duplicate detection existed. */
async function backfillVideoHashes(userId: string): Promise<void> {
  const missing = await prisma.libraryItem.findMany({
    where: { userId, kind: "VIDEO", contentHash: null, url: { not: null } },
    select: { id: true, url: true },
  });
  for (const item of missing) {
    try {
      const contentHash = await hashFile(mediaUrlToAbsolutePath(item.url!));
      await prisma.libraryItem.update({ where: { id: item.id }, data: { contentHash } });
    } catch {
      // File missing on disk — nothing to compare against.
    }
  }
}

function videoExtension(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return VIDEO_EXT.test(ext) ? ext : ".mp4";
}

/**
 * Processes one uploaded file and stores it as a library item. Video clips
 * that are already in the user's library (same bytes) are not stored again —
 * the existing item is returned with `duplicate: true`.
 */
async function ingestOne(userId: string, kind: UploadKind, file: File): Promise<{ item: LibraryItem; duplicate: boolean }> {
  if (kind === "IMAGE") {
    if (!IMAGE_TYPES.has(file.type) && !IMAGE_EXT.test(file.name)) throw new Error("Only JPEG, PNG or WebP images are supported");
    // Phone photos are huge; several decoded at once in ffmpeg can exceed
    // container memory, so store a bounded JPEG instead of the original.
    const resized = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize({ width: 1350, height: 1350, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    const { url } = await saveBuffer(resized, libraryDir(userId, kind), ".jpg");
    return { item: await prisma.libraryItem.create({ data: { userId, kind, url, filename: file.name } }), duplicate: false };
  }

  if (kind === "VIDEO" && !VIDEO_EXT.test(file.name) && !file.type.startsWith("video/")) {
    throw new Error("Only MP4, MOV, WebM or M4V clips are supported");
  }
  if (kind === "AUDIO" && !AUDIO_EXT.test(file.name)) throw new Error("Only MP3 or WAV files are supported");

  if (kind === "VIDEO") {
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentHash = sha256(buffer);
    const existing = await prisma.libraryItem.findFirst({ where: { userId, kind: "VIDEO", contentHash } });
    if (existing) return { item: existing, duplicate: true };

    const saved = await saveBuffer(buffer, libraryDir(userId, kind), videoExtension(file.name));
    try {
      const durationSec = await getAudioDuration(saved.absolutePath);
      const item = await prisma.libraryItem.create({
        data: { userId, kind, url: saved.url, filename: file.name, durationSec, contentHash },
      });
      return { item, duplicate: false };
    } catch (err) {
      await unlinkMediaUrl(saved.url);
      throw err;
    }
  }

  const saved = await saveUploadedFile(file, libraryDir(userId, kind), ".mp3");
  try {
    const durationSec = await getAudioDuration(saved.absolutePath);
    const item = await prisma.libraryItem.create({
      data: { userId, kind, url: saved.url, filename: saved.filename, durationSec },
    });
    return { item, duplicate: false };
  } catch (err) {
    await unlinkMediaUrl(saved.url);
    throw err;
  }
}

export type IngestResult = {
  created: LibraryItem[];
  failed: UploadFailure[];
  // Clips that were already in the library: not stored again. `duplicates`
  // holds the existing items (so a template upload can still add them).
  duplicates: LibraryItem[];
  skipped: { filename: string }[];
};

/** Ingests a batch; one bad file doesn't sink the rest. */
export async function ingestUploads(userId: string, kind: UploadKind, files: File[]): Promise<IngestResult> {
  const result: IngestResult = { created: [], failed: [], duplicates: [], skipped: [] };
  if (kind === "VIDEO") await backfillVideoHashes(userId);
  for (const file of files) {
    try {
      const { item, duplicate } = await ingestOne(userId, kind, file);
      if (duplicate) {
        result.duplicates.push(item);
        result.skipped.push({ filename: file.name });
      } else {
        result.created.push(item);
      }
    } catch (err) {
      result.failed.push({ filename: file.name, error: errorMessage(err, "Could not process file") });
    }
  }
  return result;
}

/**
 * Adds library items to a template (skipping ones already in it). Labels and
 * caption text are copied, so each template can edit its own.
 */
export async function addLibraryItemsToStyle(
  style: { id: string; kind: "AESTHETIC_SLIDESHOW" | "VIDEO_COMPILATION" },
  items: LibraryItem[],
): Promise<{ added: number; skipped: number }> {
  let added = 0;
  let skipped = 0;
  for (const item of items) {
    const link = { videoStyleId: style.id, libraryItemId: item.id };
    if (item.kind === "IMAGE") {
      if (style.kind !== "AESTHETIC_SLIDESHOW" || (await prisma.styleImage.findFirst({ where: link }))) {
        skipped++;
        continue;
      }
      await prisma.styleImage.create({ data: { ...link, url: item.url! } });
    } else if (item.kind === "VIDEO") {
      if (style.kind !== "VIDEO_COMPILATION" || (await prisma.styleVideo.findFirst({ where: link }))) {
        skipped++;
        continue;
      }
      await prisma.styleVideo.create({ data: { ...link, url: item.url!, durationSec: item.durationSec ?? 0 } });
    } else if (item.kind === "AUDIO") {
      if (await prisma.styleAudio.findFirst({ where: link })) {
        skipped++;
        continue;
      }
      await prisma.styleAudio.create({
        data: { ...link, url: item.url!, filename: item.filename ?? "audio", durationSec: item.durationSec ?? 0, postCaption: item.text },
      });
    } else {
      if (await prisma.styleCaption.findFirst({ where: link })) {
        skipped++;
        continue;
      }
      await prisma.styleCaption.create({ data: { ...link, text: item.text ?? "" } });
    }
    added++;
  }
  return { added, skipped };
}

/** How many templates use each library item. */
export async function usageCounts(itemIds: string[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  const where = { libraryItemId: { in: itemIds } };
  const groups = await Promise.all([
    prisma.styleImage.groupBy({ by: ["libraryItemId"], where, _count: true }),
    prisma.styleVideo.groupBy({ by: ["libraryItemId"], where, _count: true }),
    prisma.styleAudio.groupBy({ by: ["libraryItemId"], where, _count: true }),
    prisma.styleCaption.groupBy({ by: ["libraryItemId"], where, _count: true }),
  ]);
  for (const group of groups) {
    for (const row of group) if (row.libraryItemId) counts[row.libraryItemId] = (counts[row.libraryItemId] ?? 0) + row._count;
  }
  return counts;
}

export const LIBRARY_KINDS: LibraryKind[] = ["IMAGE", "VIDEO", "AUDIO", "CAPTION"];

/** Parses an audio item's saved clip starts (JSON array of seconds). */
export function parseClipStarts(json: string | null | undefined): number[] {
  try {
    const value = JSON.parse(json ?? "[]");
    return Array.isArray(value) ? value.filter((n): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0) : [];
  } catch {
    return [];
  }
}
