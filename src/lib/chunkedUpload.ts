"use client";

// Group files into ≤40MB requests; a single bigger file goes alone. Next's
// proxy layer buffers request bodies, so one giant multipart request is the
// fastest way to hit a body-size limit.
const UPLOAD_CHUNK_BYTES = 40 * 1024 * 1024;

export type UploadFailure = { filename: string; error: string };

function chunkFiles(files: File[]): File[][] {
  const chunks: File[][] = [];
  let current: File[] = [];
  let currentBytes = 0;
  for (const file of files) {
    if (current.length > 0 && currentBytes + file.size > UPLOAD_CHUNK_BYTES) {
      chunks.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(file);
    currentBytes += file.size;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

/**
 * Uploads files in size-capped chunks. A failed chunk doesn't abort the rest —
 * failures are collected per file and returned for display.
 */
export async function uploadInChunks(
  url: string,
  field: string,
  files: File[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ created: number; failed: UploadFailure[]; skipped: number }> {
  const chunks = chunkFiles(files);
  let created = 0;
  let skipped = 0;
  const failed: UploadFailure[] = [];
  let done = 0;
  onProgress?.(0, files.length);

  for (const chunk of chunks) {
    const form = new FormData();
    for (const file of chunk) form.append(field, file);
    try {
      const res = await fetch(url, { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (data && Array.isArray(data.created)) {
        created += data.created.length;
        if (Array.isArray(data.skipped)) skipped += data.skipped.length;
        if (Array.isArray(data.failed)) failed.push(...data.failed);
      } else {
        const error = data?.error ?? `Upload failed (HTTP ${res.status})`;
        failed.push(...chunk.map((f) => ({ filename: f.name, error })));
      }
    } catch {
      failed.push(...chunk.map((f) => ({ filename: f.name, error: "Network error during upload" })));
    }
    done += chunk.length;
    onProgress?.(done, files.length);
  }
  return { created, failed, skipped };
}
