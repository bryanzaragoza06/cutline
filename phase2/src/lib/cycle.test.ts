import { test } from "node:test";
import assert from "node:assert/strict";
import { computeNextDueAt, type DueCycleInfo } from "./cycle";

const base: DueCycleInfo = {
  startMode: "NOW",
  startTimeOfDay: null,
  activatedAt: null,
  repostIntervalMinutes: 60,
  cycleLimit: 3,
  breakMinutes: 240,
  cyclePostCount: 0,
  lastPostedAt: null,
};
const at = (iso: string) => new Date(iso);
const iso = (d: Date | null) => d?.toISOString() ?? null;

test("NOW fires immediately on the first post", () => {
  const now = at("2026-10-02T15:00:00Z");
  assert.equal(iso(computeNextDueAt(base, now)), now.toISOString());
});

test("COOK fires exactly 26h after activation", () => {
  const info = { ...base, startMode: "COOK", activatedAt: at("2026-10-01T10:15:00Z") };
  assert.equal(iso(computeNextDueAt(info, at("2026-10-01T11:00:00Z"))), "2026-10-02T12:15:00.000Z");
  assert.equal(computeNextDueAt({ ...info, activatedAt: null }, at("2026-10-01T11:00:00Z")), null);
});

test("AT_TIME is the next Pacific occurrence (PDT)", () => {
  const info = { ...base, startMode: "AT_TIME", startTimeOfDay: "09:30" };
  // 08:00 PDT -> today 09:30 PDT = 16:30Z
  assert.equal(iso(computeNextDueAt(info, at("2026-10-02T15:00:00Z"))), "2026-10-02T16:30:00.000Z");
  // 10:00 PDT -> already passed, tomorrow
  assert.equal(iso(computeNextDueAt(info, at("2026-10-02T17:00:00Z"))), "2026-10-03T16:30:00.000Z");
});

test("AT_TIME handles PST and the DST change", () => {
  const info = { ...base, startMode: "AT_TIME", startTimeOfDay: "9:30" };
  assert.equal(iso(computeNextDueAt(info, at("2026-12-15T10:00:00Z"))), "2026-12-15T17:30:00.000Z");
  // Oct 31 13:00 PDT; next 09:30 is Nov 1, after clocks fall back -> PST
  assert.equal(iso(computeNextDueAt(info, at("2026-10-31T20:00:00Z"))), "2026-11-01T17:30:00.000Z");
});

test("AT_TIME with a missing or invalid time is not due", () => {
  const now = at("2026-10-02T15:00:00Z");
  assert.equal(computeNextDueAt({ ...base, startMode: "AT_TIME" }, now), null);
  assert.equal(computeNextDueAt({ ...base, startMode: "AT_TIME", startTimeOfDay: "25:00" }, now), null);
  assert.equal(computeNextDueAt({ ...base, startMode: "AT_TIME", startTimeOfDay: "9:75" }, now), null);
});

test("after the first post, the start setting is ignored and the repost interval applies", () => {
  const lastPostedAt = at("2026-10-02T15:00:00Z");
  for (const startMode of ["NOW", "AT_TIME", "COOK"]) {
    const info = { ...base, startMode, startTimeOfDay: "23:00", activatedAt: lastPostedAt, cyclePostCount: 1, lastPostedAt };
    assert.equal(iso(computeNextDueAt(info, lastPostedAt)), "2026-10-02T16:00:00.000Z");
  }
  assert.equal(computeNextDueAt({ ...base, repostIntervalMinutes: null, cyclePostCount: 1, lastPostedAt }, lastPostedAt), null);
});

test("reaching the cycle limit switches to the break", () => {
  const lastPostedAt = at("2026-10-02T15:00:00Z");
  const info = { ...base, cyclePostCount: 3, lastPostedAt };
  assert.equal(iso(computeNextDueAt(info, lastPostedAt)), "2026-10-02T19:00:00.000Z");
  assert.equal(iso(computeNextDueAt({ ...info, breakMinutes: 0 }, lastPostedAt)), lastPostedAt.toISOString());
  assert.equal(computeNextDueAt({ ...info, breakMinutes: null }, lastPostedAt), null);
  // still mid-cycle at 2/3
  assert.equal(iso(computeNextDueAt({ ...info, cyclePostCount: 2 }, lastPostedAt)), "2026-10-02T16:00:00.000Z");
});
