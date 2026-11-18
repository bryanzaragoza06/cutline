import { test } from "node:test";
import assert from "node:assert/strict";
import { frameTimeline } from "./ffmpeg";
import { FPS, TOTAL_DURATION_SEC, segmentCountFor } from "./videoConstants";

const TOTAL = TOTAL_DURATION_SEC * FPS; // 300 frames

test("every slider combination plans exactly 12 seconds of whole frames", () => {
  for (let hold = 0.3; hold <= 2.0001; hold += 0.05) {
    for (const fade of [0.01, 0.02, 0.03, 0.04, 0.05, 0.1, 0.3, 0.55, 1.0]) {
      const n = segmentCountFor(hold, fade);
      const { fadeFrames, segmentFrames } = frameTimeline(n, fade);
      assert.equal(segmentFrames.length, n);
      const sum = segmentFrames.reduce((a, b) => a + b, 0);
      assert.equal(sum - (n - 1) * fadeFrames, TOTAL, `hold ${hold.toFixed(2)} fade ${fade}`);
      for (const f of segmentFrames) assert.ok(f > fadeFrames, "each segment outlasts its fade");
      assert.ok(Math.max(...segmentFrames) - Math.min(...segmentFrames) <= 1, "segments differ by at most a frame");
    }
  }
});

test("fades round to whole frames; under half a frame is a hard cut", () => {
  assert.equal(frameTimeline(6, 0.3).fadeFrames, 8); // 0.3s ≈ 7.5 → 8 frames (0.32s)
  assert.equal(frameTimeline(6, 0.04).fadeFrames, 1);
  assert.equal(frameTimeline(6, 0.01).fadeFrames, 0);
  assert.equal(frameTimeline(1, 0.5).fadeFrames, 0, "a single segment has no fade");
});
