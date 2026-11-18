import { randomUUID } from "crypto";
import { createWriteStream } from "fs";
import { unlink } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import type { ReadableStream as NodeWebStream } from "stream/web";
import { prisma } from "@/lib/prisma";
import { ensureDir, VIDEO_CONTENT_TYPES } from "@/lib/storage";

export { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from "@/lib/uploadLimits";

export const VIDEO_EXTENSIONS = Object.keys(VIDEO_CONTENT_TYPES);

export function videoExtension(filename: string): string | null {
  const ext = path.extname(filename).toLowerCase();
  return VIDEO_EXTENSIONS.includes(ext) ? ext : null;
}

/** Streams an uploaded video to the user's own folder on the storage volume. */
export async function saveVideoUpload(file: File, userId: string, ext: string): Promise<{ url: string; absolutePath: string }> {
  const subdir = `uploads/videos/${userId}`;
  const dir = await ensureDir(subdir);
  const name = `${randomUUID()}${ext}`;
  const absolutePath = path.join(dir, name);
  try {
    await pipeline(Readable.fromWeb(file.stream() as unknown as NodeWebStream), createWriteStream(absolutePath));
  } catch (err) {
    await unlink(absolutePath).catch(() => {});
    throw err;
  }
  return { url: `/media/${subdir}/${name}`, absolutePath };
}

/**
 * Posts still belong to a Bucket in the schema, but buckets aren't a visible
 * feature: use the user's oldest one, or create a hidden one.
 */
export async function getPostsBucketId(userId: string): Promise<string> {
  const existing = await prisma.bucket.findFirst({ where: { userId }, orderBy: { createdAt: "asc" }, select: { id: true } });
  if (existing) return existing.id;
  const created = await prisma.bucket.create({ data: { userId, name: "Videos" } });
  return created.id;
}
