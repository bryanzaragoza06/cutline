import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export const STORAGE_DIR = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.join(process.cwd(), "storage");

export async function ensureDir(subdir: string): Promise<string> {
  const dir = path.join(STORAGE_DIR, subdir);
  await mkdir(dir, { recursive: true });
  return dir;
}

function extensionFor(filename: string, fallbackExt: string): string {
  const ext = path.extname(filename).toLowerCase();
  return /^\.[a-z0-9]{1,5}$/.test(ext) ? ext : fallbackExt;
}

export async function saveBuffer(buffer: Buffer, subdir: string, ext: string): Promise<{ url: string; absolutePath: string }> {
  const dir = await ensureDir(subdir);
  const name = `${randomUUID()}${ext}`;
  const absolutePath = path.join(dir, name);
  await writeFile(absolutePath, buffer);
  return { url: `/media/${subdir}/${name}`, absolutePath };
}

export async function saveUploadedFile(
  file: File,
  subdir: string,
  fallbackExt: string,
): Promise<{ url: string; filename: string; absolutePath: string }> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const { url, absolutePath } = await saveBuffer(buffer, subdir, extensionFor(file.name, fallbackExt));
  return { url, filename: file.name, absolutePath };
}

/** Maps a "/media/..." URL to its file on disk, refusing anything outside STORAGE_DIR. */
export function mediaUrlToAbsolutePath(url: string): string {
  const relative = url.replace(/^\/media\//, "");
  const resolved = path.resolve(STORAGE_DIR, relative);
  if (resolved !== STORAGE_DIR && !resolved.startsWith(STORAGE_DIR + path.sep)) {
    throw new Error("Media path escapes the storage directory");
  }
  return resolved;
}

// Video formats TikTok accepts for upload, with the Content-Type used when sending them.
export const VIDEO_CONTENT_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
};

export function videoContentType(filePath: string): string {
  return VIDEO_CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? "video/mp4";
}
