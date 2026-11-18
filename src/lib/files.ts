import { unlink } from "fs/promises";
import { mediaUrlToAbsolutePath } from "@/lib/storage";

/** Best-effort removal of an uploaded/generated file; missing files are fine. */
export async function unlinkMediaUrl(url: string | null | undefined): Promise<void> {
  if (!url) return;
  try {
    await unlink(mediaUrlToAbsolutePath(url));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") console.error("[storage] failed to delete", url, err);
  }
}
