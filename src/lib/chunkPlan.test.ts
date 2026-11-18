import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { planChunks } from "@/lib/chunkPlan";

const MB = 1024 * 1024;

describe("planChunks (TikTok upload rules)", () => {
  it("sends files up to 64 MB as a single chunk", () => {
    for (const size of [1, 3 * MB, 5 * MB, 20 * MB, 64 * MB]) {
      assert.deepEqual(planChunks(size), { chunkSize: size, totalChunks: 1 });
    }
  });

  it("splits bigger files so every chunk is 5-64 MB, except a last chunk up to 128 MB", () => {
    for (const size of [64 * MB + 1, 65 * MB, 100 * MB, 127 * MB, 150 * MB, 199 * MB, 200 * MB, 250 * MB]) {
      const { chunkSize, totalChunks } = planChunks(size);
      assert.ok(totalChunks >= 2, `${size} should be split`);
      assert.ok(chunkSize >= 5 * MB && chunkSize <= 64 * MB, `chunk size ${chunkSize}`);
      const last = size - (totalChunks - 1) * chunkSize;
      assert.ok(last >= chunkSize && last <= 128 * MB, `last chunk ${last} for ${size}`);
      assert.equal(totalChunks, Math.floor(size / chunkSize), "TikTok expects floor(size / chunk)");
    }
  });
});
