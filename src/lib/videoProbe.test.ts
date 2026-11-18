import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { probeVideo } from "@/lib/videoProbe";

function hasFfmpeg(): boolean {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    execFileSync("ffprobe", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

describe("probeVideo", { skip: !hasFfmpeg() && "ffmpeg/ffprobe not installed" }, () => {
  const dir = mkdtempSync(path.join(tmpdir(), "cutline-probe-"));

  it("reads the real duration and size of a video", async () => {
    const file = path.join(dir, "clip.mp4");
    execFileSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "testsrc=size=320x568:rate=25:duration=3", "-pix_fmt", "yuv420p", "-y", file]);
    const info = await probeVideo(file);
    assert.ok(Math.abs(info.durationSec - 3) < 0.2, `duration ${info.durationSec}`);
    assert.equal(info.width, 320);
    assert.equal(info.height, 568);
  });

  it("rejects a file that isn't a video", async () => {
    const file = path.join(dir, "fake.mp4");
    writeFileSync(file, "this is not a video");
    await assert.rejects(() => probeVideo(file), /couldn't read|doesn't contain/i);
  });
});
