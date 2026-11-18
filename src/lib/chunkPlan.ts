const MB = 1024 * 1024;

/**
 * TikTok's upload rules: a file up to 64 MB goes up as one chunk; larger files
 * are split into chunks of 5–64 MB, with total_chunk_count = floor(size / chunk)
 * so the last chunk absorbs the remainder (it may be up to 128 MB).
 */
export function planChunks(size: number): { chunkSize: number; totalChunks: number } {
  if (size <= 64 * MB) return { chunkSize: size, totalChunks: 1 };
  const chunkSize = 32 * MB;
  return { chunkSize, totalChunks: Math.floor(size / chunkSize) };
}
