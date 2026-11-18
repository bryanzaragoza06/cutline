import { test } from "node:test";
import assert from "node:assert/strict";
import { countThisWeek, countToday } from "./format";

test("countToday counts timestamps on the viewer's local date only", () => {
  const now = new Date(2026, 9, 20, 15, 0); // Oct 20, 3pm local
  const midnight = new Date(2026, 9, 20, 0, 0);
  const stamps = [
    new Date(midnight.getTime() + 1000), // 00:00:01 today ✓
    new Date(2026, 9, 20, 14, 59), // earlier today ✓
    new Date(midnight.getTime() - 1000), // 23:59:59 yesterday ✗
    new Date(2026, 9, 21, 0, 0), // tomorrow ✗
    new Date(2026, 9, 20, 9, 30).toISOString(), // ISO strings work too ✓
  ];
  assert.equal(countToday(stamps, now), 3);
  assert.equal(countToday([], now), 0);
});

test("countThisWeek counts since Sunday 00:00 local", () => {
  const now = new Date(2026, 9, 21, 12, 0); // Wed Oct 21 2026, noon local
  const sunday = new Date(2026, 9, 18, 0, 0); // Sun Oct 18
  assert.equal(sunday.getDay(), 0);
  const stamps = [
    new Date(sunday.getTime() + 1000), // Sun 00:00:01 ✓
    new Date(2026, 9, 20, 9, 0), // Tue ✓
    new Date(2026, 9, 21, 11, 59), // today, earlier ✓
    new Date(sunday.getTime() - 1000), // Sat 23:59:59, last week ✗
    new Date(2026, 9, 21, 13, 0), // later today (future) ✗
  ];
  assert.equal(countThisWeek(stamps, now), 3);
  // On Sunday itself the week has just started.
  assert.equal(countThisWeek([new Date(2026, 9, 17, 23, 0)], new Date(2026, 9, 18, 8, 0)), 0);
});
