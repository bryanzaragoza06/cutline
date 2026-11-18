// Shared by the ffmpeg renderer, the API and the Video Studio UI (client-safe).
export const TOTAL_DURATION_SEC = 12;
export const FPS = 25;
// Hold: how long each image/clip is fully on screen before it starts fading.
export const MIN_SECONDS_PER_IMAGE = 0.3;
export const MAX_SECONDS_PER_IMAGE = 2.0;
export const DEFAULT_SECONDS_PER_IMAGE = 1.65;
// Fade: how long each crossfade into the next image/clip lasts.
export const MIN_CROSSFADE_SEC = 0.01;
export const MAX_CROSSFADE_SEC = 1.0;
export const DEFAULT_CROSSFADE_SEC = 0.3;
// Tightened after real OOM kills: each segment is a decoded input in ffmpeg.
export const MAX_SEGMENTS_PER_VIDEO = 40;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clampSecondsPerImage(value: number): number {
  return clamp(value, MIN_SECONDS_PER_IMAGE, MAX_SECONDS_PER_IMAGE);
}

export function clampCrossfade(value: number): number {
  return clamp(value, MIN_CROSSFADE_SEC, MAX_CROSSFADE_SEC);
}

/**
 * How many segments a 12s video gets. Each one is on screen for `hold` and
 * then fades into the next over `fade`, so n segments take n·hold + (n−1)·fade
 * ≈ 12s → n = (12 + fade) / (hold + fade), rounded.
 */
export function segmentCountFor(holdSec: number, fadeSec: number = DEFAULT_CROSSFADE_SEC): number {
  const hold = clampSecondsPerImage(holdSec);
  const fade = clampCrossfade(fadeSec);
  return clamp(Math.round((TOTAL_DURATION_SEC + fade) / (hold + fade)), 1, MAX_SEGMENTS_PER_VIDEO);
}
