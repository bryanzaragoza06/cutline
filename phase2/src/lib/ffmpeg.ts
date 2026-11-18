import { spawn } from "child_process";
import { mkdtemp, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import type { VideoLayout } from "@prisma/client";
import {
  clampCrossfade,
  clampSecondsPerImage,
  DEFAULT_CROSSFADE_SEC,
  FPS,
  segmentCountFor,
  TOTAL_DURATION_SEC,
} from "@/lib/videoConstants";

export {
  TOTAL_DURATION_SEC,
  FPS,
  MIN_SECONDS_PER_IMAGE,
  MAX_SECONDS_PER_IMAGE,
  DEFAULT_SECONDS_PER_IMAGE,
  MAX_SEGMENTS_PER_VIDEO,
} from "@/lib/videoConstants";

const CAPTION_FONT_SIZE = 64;
const CAPTION_LINE_HEIGHT = 1.25;
const SONG_LABEL_FONT_SIZE = 40;
const TRANSITION = "fade";
const FONT_FAMILY = "Arial, Helvetica, 'Liberation Sans', sans-serif";
// A stuck ffmpeg would otherwise hold the generation lock forever.
const FFMPEG_TIMEOUT_MS = 90_000;

type LayoutGeometry = {
  canvasW: number;
  canvasH: number;
  imageW: number;
  imageH: number;
  captionMaxWidth: number;
  songLabelY: number;
  songLabelOnPicture: boolean;
};

const LAYOUTS: Record<VideoLayout, LayoutGeometry> = {
  // 4:3 picture centered in a 9:16 black canvas; song label in the bottom bar.
  PORTRAIT_9_16: {
    canvasW: 1080,
    canvasH: 1920,
    imageW: 1080,
    imageH: 810,
    captionMaxWidth: 920,
    songLabelY: (1920 - 810) / 2 + 810 + 90,
    songLabelOnPicture: false,
  },
  // Full-bleed 16:9; song label overlaid on the picture.
  LANDSCAPE_16_9: {
    canvasW: 1920,
    canvasH: 1080,
    imageW: 1920,
    imageH: 1080,
    captionMaxWidth: 1300,
    songLabelY: 1080 - 60,
    songLabelOnPicture: true,
  },
};

const COLOR_GRADES: { name: string; filter: string | null }[] = [
  { name: "none", filter: null },
  { name: "warm", filter: "eq=contrast=1.05:brightness=0.02:saturation=1.15,colorbalance=rs=0.08:gs=0.02:bs=-0.08:rm=0.05:bm=-0.05" },
  { name: "cool", filter: "eq=contrast=1.05:saturation=1.05,colorbalance=rs=-0.06:bs=0.08:rm=-0.03:bm=0.05" },
  { name: "vibrant", filter: "eq=contrast=1.12:saturation=1.35:brightness=0.01" },
  { name: "muted", filter: "eq=contrast=0.92:saturation=0.75:brightness=0.02" },
  { name: "high_contrast", filter: "eq=contrast=1.25:saturation=1.1:brightness=-0.02:gamma=1.05" },
];

export type Segment = { kind: "image"; path: string } | { kind: "video"; path: string; durationSec: number };

/** How many segments a video gets, and the (clamped) fade between them. */
export function planSegments(
  holdSec: number,
  fadeSec: number = DEFAULT_CROSSFADE_SEC,
): { segmentCount: number; crossfadeSec: number } {
  const crossfadeSec = clampCrossfade(fadeSec);
  return { segmentCount: segmentCountFor(clampSecondsPerImage(holdSec), crossfadeSec), crossfadeSec };
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function num(n: number): string {
  return n.toFixed(4).replace(/\.?0+$/, "") || "0";
}

// ---------------------------------------------------------------------------
// Process helpers

function runProcess(command: string, args: string[], timeoutMs = FFMPEG_TIMEOUT_MS): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    let timedOut = false;
    proc.stderr.on("data", (d) => {
      stderr += d;
      if (stderr.length > 20_000) stderr = stderr.slice(-10_000);
    });
    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill("SIGKILL");
    }, timeoutMs);
    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`Could not run ${command}: ${err.message}`));
    });
    proc.on("close", (code, signal) => {
      clearTimeout(timer);
      if (timedOut) {
        reject(new Error(`${command} took longer than ${timeoutMs / 1000}s and was stopped`));
        return;
      }
      if (signal === "SIGKILL") {
        reject(new Error(`${command} was killed (SIGKILL) — almost certainly out of memory. Try fewer images per video.`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`${command} exited with code ${code}${signal ? ` (${signal})` : ""}: ${stderr.slice(-2000)}`));
        return;
      }
      resolve();
    });
  });
}

/** Duration in seconds via ffprobe (works for audio and video files). */
export function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d));
    proc.stderr.on("data", (d) => (stderr += d));
    proc.on("error", (err) => reject(new Error(`Could not run ffprobe: ${err.message}`)));
    proc.on("close", (code) => {
      const duration = parseFloat(stdout.trim());
      if (code !== 0 || !Number.isFinite(duration) || duration <= 0) {
        reject(new Error(`Couldn't read the file's duration${stderr ? `: ${stderr.trim().slice(-300)}` : ""}`));
        return;
      }
      resolve(duration);
    });
  });
}

// ---------------------------------------------------------------------------
// Audio: trimmed to exactly 12s in an isolated pass so the main render just copies it.

/**
 * Trims the source to exactly 12s. `start` is a user-chosen clip start
 * (audio timestamps); without one, a random 12s section is used.
 */
async function prepareAudioClip(sourcePath: string, outputPath: string, start: number | null = null): Promise<void> {
  const sourceDuration = await getAudioDuration(sourcePath);
  const maxStart = sourceDuration - TOTAL_DURATION_SEC;
  const clipStart = start != null ? Math.min(Math.max(0, start), Math.max(0, maxStart)) : rand(0, Math.max(0, maxStart));
  const inputArgs =
    sourceDuration >= TOTAL_DURATION_SEC
      ? ["-ss", num(clipStart), "-t", String(TOTAL_DURATION_SEC), "-i", sourcePath]
      : ["-stream_loop", "-1", "-t", String(TOTAL_DURATION_SEC), "-i", sourcePath];
  await runProcess("ffmpeg", [
    "-hide_banner", "-v", "error",
    "-y",
    ...inputArgs,
    "-vn",
    "-c:a", "aac",
    "-b:a", "192k",
    "-t", String(TOTAL_DURATION_SEC),
    outputPath,
  ]);
}

// ---------------------------------------------------------------------------
// Text overlay: an SVG decoded by ffmpeg's librsvg (rasterizing with sharp
// first failed unpredictably under production memory pressure).

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function wrapText(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      if (!line) line = word;
      else if (line.length + 1 + word.length <= maxChars) line += ` ${word}`;
      else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

export function buildOverlaySvg(layout: VideoLayout, caption: string | null, songTitle: string | null): string {
  const g = LAYOUTS[layout];
  const parts: string[] = [];

  if (caption?.trim()) {
    const maxChars = Math.max(6, Math.floor(g.captionMaxWidth / (CAPTION_FONT_SIZE * 0.56)));
    const lines = wrapText(caption.trim(), maxChars);
    const lineHeight = CAPTION_FONT_SIZE * CAPTION_LINE_HEIGHT;
    const totalTextHeight = lines.length * lineHeight;
    const startY = g.canvasH / 2 - totalTextHeight / 2 + lineHeight * 0.8;
    const tspans = lines
      .map((line, i) => `<tspan x="50%" y="${num(startY + i * lineHeight)}">${escapeXml(line)}</tspan>`)
      .join("");
    parts.push(
      `<text x="50%" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="${CAPTION_FONT_SIZE}" font-weight="bold" ` +
        `fill="white" stroke="black" stroke-width="7" stroke-linejoin="round" paint-order="stroke">${tspans}</text>`,
    );
  }

  if (songTitle?.trim()) {
    const stroke = g.songLabelOnPicture ? ` stroke="black" stroke-width="5" stroke-linejoin="round" paint-order="stroke"` : "";
    parts.push(
      `<text x="50%" y="${num(g.songLabelY)}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="${SONG_LABEL_FONT_SIZE}" ` +
        `font-weight="600" fill="white"${stroke}>${escapeXml(songTitle.trim())}</text>`,
    );
  }

  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${g.canvasW}" height="${g.canvasH}" viewBox="0 0 ${g.canvasW} ${g.canvasH}">` +
    parts.join("") +
    `</svg>`
  );
}

// ---------------------------------------------------------------------------
// Main render

/** Per-clip playback speed (video clips only): a little variety between clips. */
function rollSpeed(segment: Segment): number {
  return segment.kind === "video" ? rand(0.85, 1.25) : 1;
}

/**
 * Static framing: scale to cover the picture area and crop evenly from the
 * center. (The earlier random zoom/pan "camera movement" was removed.)
 */
function frameFilter(g: LayoutGeometry): string {
  return `scale=${g.imageW}:${g.imageH}:force_original_aspect_ratio=increase,crop=${g.imageW}:${g.imageH}`;
}

/**
 * Frame-exact timeline. ffmpeg's xfade fails (silently truncating the video)
 * when segment lengths or fade offsets fall between frames, so everything is
 * planned in whole frames at FPS: the video is TOTAL_DURATION_SEC·FPS frames,
 * each fade is a whole number of frames (0 = hard cut), and the segments split
 * the rest exactly — Σ segmentFrames − (n−1)·fadeFrames = total.
 */
export function frameTimeline(segmentCount: number, crossfadeSec: number): { fadeFrames: number; segmentFrames: number[] } {
  const total = Math.round(TOTAL_DURATION_SEC * FPS);
  const n = Math.max(1, segmentCount);
  let fadeFrames = n === 1 ? 0 : Math.round(crossfadeSec * FPS);
  // A fade can't be longer than the segments it joins.
  while (fadeFrames > 0 && Math.floor((total + (n - 1) * fadeFrames) / n) <= fadeFrames) fadeFrames--;
  const sum = total + (n - 1) * fadeFrames;
  const base = Math.floor(sum / n);
  const extra = sum - base * n;
  const segmentFrames = Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
  return { fadeFrames, segmentFrames };
}

// Inputs are read slightly longer than needed, then trimmed to exact frames.
const INPUT_MARGIN_SEC = 0.2;

function segmentInputArgs(segment: Segment, dur: number, speed: number): string[] {
  if (segment.kind === "image") return ["-loop", "1", "-t", num(dur + INPUT_MARGIN_SEC), "-i", segment.path];
  const needed = (dur + INPUT_MARGIN_SEC) * speed;
  if (segment.durationSec >= needed + 0.05) {
    const start = rand(0, segment.durationSec - needed - 0.05);
    // Both before -i: fast input seeking and an input-side duration limit.
    return ["-ss", num(start), "-t", num(needed), "-i", segment.path];
  }
  return ["-stream_loop", "-1", "-t", num(needed), "-i", segment.path];
}

export type RenderOptions = {
  segments: Segment[];
  crossfadeSec: number;
  layout: VideoLayout;
  caption: string | null;
  songTitle: string | null;
  audioPath: string | null;
  // Chosen clip start (seconds) from the song's timestamps; null = random.
  audioStart?: number | null;
  outputPath: string;
};

export async function renderVideo(opts: RenderOptions): Promise<void> {
  if (opts.segments.length === 0) throw new Error("No segments to render");
  const g = LAYOUTS[opts.layout];
  const { fadeFrames, segmentFrames } = frameTimeline(opts.segments.length, opts.crossfadeSec);
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "post-rabbit-gen-"));

  try {
    const inputs: string[] = [];
    const filters: string[] = [];

    opts.segments.forEach((segment, i) => {
      const speed = rollSpeed(segment);
      const dur = segmentFrames[i] / FPS;
      inputs.push(...segmentInputArgs(segment, dur, speed));
      const chain = [
        segment.kind === "video" ? `setpts=(PTS-STARTPTS)/${num(speed)}` : null,
        frameFilter(g),
        "setsar=1",
        `fps=${FPS}`,
        // Exactly this segment's planned frames, so every fade offset lands on a frame.
        `trim=end_frame=${segmentFrames[i]}`,
        "setpts=PTS-STARTPTS",
        `pad=${g.canvasW}:${g.canvasH}:(ow-iw)/2:(oh-ih)/2:color=black`,
        // xfade needs identical pixel formats (JPEGs decode as yuvj420p).
        "format=yuv420p",
      ]
        .filter(Boolean)
        .join(",");
      filters.push(`[${i}:v]${chain}[v${i}]`);
    });

    let current = "v0";
    if (opts.segments.length > 1 && fadeFrames === 0) {
      // Fade shorter than half a frame → clean hard cuts.
      const labels = opts.segments.map((_, i) => `[v${i}]`).join("");
      filters.push(`${labels}concat=n=${opts.segments.length}:v=1:a=0[vfaded]`);
      current = "vfaded";
    } else {
      let lengthFrames = segmentFrames[0];
      for (let k = 1; k < opts.segments.length; k++) {
        // The fade starts fadeFrames before the end of what's been joined so far.
        const offsetFrames = lengthFrames - fadeFrames;
        const out = k === opts.segments.length - 1 ? "vfaded" : `x${k}`;
        filters.push(
          `[${current}][v${k}]xfade=transition=${TRANSITION}:duration=${num(fadeFrames / FPS)}:offset=${num(offsetFrames / FPS)}[${out}]`,
        );
        lengthFrames += segmentFrames[k] - fadeFrames;
        current = out;
      }
    }

    // One global grade, applied before the text so the text isn't tinted.
    const grade = COLOR_GRADES[Math.floor(Math.random() * COLOR_GRADES.length)];
    if (grade.filter) {
      filters.push(`[${current}]${grade.filter}[vgraded]`);
      current = "vgraded";
    }

    let nextInput = opts.segments.length;
    if (opts.caption?.trim() || opts.songTitle?.trim()) {
      const svgPath = path.join(tempDir, "caption.svg");
      await writeFile(svgPath, buildOverlaySvg(opts.layout, opts.caption, opts.songTitle));
      inputs.push("-loop", "1", "-t", String(TOTAL_DURATION_SEC), "-i", svgPath);
      filters.push(`[${nextInput}:v]format=rgba[cap]`, `[${current}][cap]overlay=0:0[vout]`);
      nextInput++;
    } else {
      filters.push(`[${current}]null[vout]`);
    }

    let audioArgs = ["-an"];
    if (opts.audioPath) {
      const trimmed = path.join(tempDir, "audio.m4a");
      await prepareAudioClip(opts.audioPath, trimmed, opts.audioStart ?? null);
      inputs.push("-i", trimmed);
      audioArgs = ["-map", `${nextInput}:a`, "-c:a", "copy"];
      nextInput++;
    }

    await runProcess("ffmpeg", [
      // Errors only, so a failure's stored message is the actual cause.
      "-hide_banner", "-v", "error",
      "-y",
      "-filter_threads", "2",
      "-filter_complex_threads", "2",
      ...inputs,
      "-filter_complex", filters.join(";"),
      "-map", "[vout]",
      ...audioArgs,
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-threads", "2",
      "-x264-params", "threads=2:lookahead_threads=1:sliced_threads=0:rc-lookahead=10:bframes=0",
      "-pix_fmt", "yuv420p",
      "-r", String(FPS),
      "-t", String(TOTAL_DURATION_SEC),
      "-movflags", "+faststart",
      opts.outputPath,
    ]);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}


// ---------------------------------------------------------------------------
// Waveform peaks for the audio timestamp editor.

const WAVEFORM_SAMPLE_RATE = 8000;

/**
 * Downmixes to 8kHz mono PCM and returns `buckets` peak values scaled 0–100.
 * Streams the decode so long songs never sit in memory.
 */
export function computeWaveform(filePath: string, durationSec: number, buckets = 600): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const totalSamples = Math.max(1, Math.round(durationSec * WAVEFORM_SAMPLE_RATE));
    const perBucket = Math.max(1, totalSamples / buckets);
    const peaks = new Array<number>(buckets).fill(0);
    let sampleIndex = 0;
    let leftover: Buffer | null = null;

    const proc = spawn("ffmpeg", ["-hide_banner", "-v", "error", "-i", filePath, "-ac", "1", "-ar", String(WAVEFORM_SAMPLE_RATE), "-f", "s16le", "pipe:1"]);
    const timer = setTimeout(() => proc.kill("SIGKILL"), 60_000);
    proc.stdout.on("data", (chunk: Buffer) => {
      const data: Buffer = leftover ? Buffer.concat([leftover, chunk]) : chunk;
      const usable = data.length - (data.length % 2);
      for (let i = 0; i < usable; i += 2) {
        const bucket = Math.min(buckets - 1, Math.floor(sampleIndex / perBucket));
        const value = Math.abs(data.readInt16LE(i));
        if (value > peaks[bucket]) peaks[bucket] = value;
        sampleIndex++;
      }
      leftover = usable < data.length ? data.subarray(usable) : null;
    });
    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`Could not run ffmpeg: ${err.message}`));
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error("Couldn't read the audio to draw its waveform"));
        return;
      }
      const max = Math.max(1, ...peaks);
      resolve(peaks.map((p) => Math.round((p / max) * 100)));
    });
  });
}
