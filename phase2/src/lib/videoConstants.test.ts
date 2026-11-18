import { test } from "node:test";
import assert from "node:assert/strict";
import { segmentCountFor, TOTAL_DURATION_SEC } from "./videoConstants";

// Old formula (before the fade slider): round((12 - 0.3) / spacing).
const oldCount = (spacing: number) => Math.round((TOTAL_DURATION_SEC - 0.3) / spacing);

// Mirrors the style_crossfade migration's conversion of existing templates.
const convert = (old: number) => (old < 0.6 ? { hold: 0.3, fade: Math.max(0.01, old - 0.3) } : { hold: old - 0.3, fade: 0.3 });

test("converted templates keep their clip count", () => {
  for (const old of [0.8, 1, 1.2, 1.5, 1.7, 1.95, 2]) {
    const { hold, fade } = convert(old);
    assert.equal(segmentCountFor(hold, fade), oldCount(old), `old slider ${old}`);
  }
  // Very fast templates (old ≤ 0.6s) land within one clip of before.
  for (const old of [0.3, 0.4, 0.5, 0.6]) {
    const { hold, fade } = convert(old);
    assert.ok(Math.abs(segmentCountFor(hold, fade) - oldCount(old)) <= 1, `old slider ${old}`);
  }
});

test("both sliders change the clip count", () => {
  assert.equal(segmentCountFor(1.65, 0.3), 6);
  assert.ok(segmentCountFor(1.65, 1.0) < segmentCountFor(1.65, 0.01), "longer fades → fewer clips");
  assert.ok(segmentCountFor(0.5, 0.3) > segmentCountFor(2, 0.3), "shorter holds → more clips");
});

test("extremes stay within 1–40 clips", () => {
  assert.equal(segmentCountFor(0.3, 0.01), 39);
  assert.equal(segmentCountFor(2, 1), 4);
  assert.equal(segmentCountFor(0.01, 0.0001), 39, "inputs are clamped to the slider ranges");
});
