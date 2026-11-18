import { test } from "node:test";
import assert from "node:assert/strict";
import { startDatabaseWatchdog } from "./health";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

test("watchdog triggers a restart after 6 failed checks in a row, not before", async () => {
  let unhealthy = 0;
  const stop = startDatabaseWatchdog({
    ping: () => Promise.reject(new Error("Socket timeout")),
    onUnhealthy: () => unhealthy++,
    onHealthy: () => {},
    intervalMs: 10,
  });
  await wait(35); // ~4 checks
  assert.equal(unhealthy, 0, "not yet");
  await wait(60); // past 6 checks
  stop();
  assert.equal(unhealthy, 1, "fires once");
});

test("a successful check resets the failure count", async () => {
  let unhealthy = 0;
  let healthy = 0;
  let n = 0;
  // fail 5, succeed 1, fail 5 — never 6 in a row
  const stop = startDatabaseWatchdog({
    ping: () => (++n % 6 === 0 ? Promise.resolve() : Promise.reject(new Error("Socket timeout"))),
    onUnhealthy: () => unhealthy++,
    onHealthy: () => healthy++,
    intervalMs: 5,
  });
  await wait(80);
  stop();
  assert.ok(healthy >= 1);
  assert.equal(unhealthy, 0);
});

test("topErrors groups similar messages and masks ids/numbers", async () => {
  const { topErrors } = await import("./health");
  const top = topErrors([
    'TikTok publish init failed: {"code":"access_token_invalid","log_id":"20261102ABCDEF0123456789"}',
    'TikTok publish init failed: {"code":"access_token_invalid","log_id":"20261103ZZZZZZ9876543210"}',
    "This account has no TikTok access token — reconnect it.",
    "ffmpeg exited with code 234: something",
    null,
  ]);
  assert.equal(top[0].count, 2, "the two token errors group together");
  assert.ok(!/20261102|ABCDEF/.test(top[0].message), "ids are masked");
  assert.equal(top.length, 3);
});

test("short reason text is kept, long ids are masked", async () => {
  const { normalizeError } = await import("./health");
  const m = normalizeError(
    'TikTok token request failed: {"error":"invalid_grant","error_description":"Refresh token is invalid or expired.","log_id":"2026110623180344AB12CD34EF56"}',
  );
  assert.ok(m.includes("invalid_grant"), m);
  assert.ok(m.includes("Refresh token is invalid or expired."), m);
  assert.ok(!m.includes("AB12CD34EF56"), m);
});
