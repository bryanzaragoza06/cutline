import { execFile } from "child_process";
import { promisify } from "util";

const run = promisify(execFile);

export type VideoInfo = { durationSec: number; width: number; height: number };

/**
 * Reads a video file's real duration and size with ffprobe. Throws a
 * user-readable error if the file isn't a playable video.
 */
export async function probeVideo(absolutePath: string): Promise<VideoInfo> {
  let stdout: string;
  try {
    ({ stdout } = await run(
      "ffprobe",
      ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration", "-of", "json", absolutePath],
      { timeout: 30_000, maxBuffer: 1024 * 1024 },
    ));
  } catch {
    throw new Error("We couldn't read that file as a video. Try exporting it as an MP4.");
  }

  let parsed: { streams?: { width?: number; height?: number }[]; format?: { duration?: string } };
  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new Error("We couldn't read that file as a video. Try exporting it as an MP4.");
  }
  const stream = parsed.streams?.[0];
  const durationSec = Number(parsed.format?.duration);
  if (!stream || !stream.width || !stream.height || !Number.isFinite(durationSec) || durationSec <= 0) {
    throw new Error("That file doesn't contain a video we can read. Try exporting it as an MP4.");
  }
  return { durationSec, width: stream.width, height: stream.height };
}
