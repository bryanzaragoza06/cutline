import { test } from "node:test";
import assert from "node:assert/strict";
import { effectiveCycle, scheduleMissing } from "./postingSchedules";

const own = { startMode: "AT_TIME", startTimeOfDay: "09:30", repostIntervalMinutes: 10, cycleLimit: 1, breakMinutes: 5 };
const schedule = { repostIntervalMinutes: 90, cycleLimit: 3, breakMinutes: 60 };

test("an account takes posting frequency from its schedule but keeps its own start", () => {
  const eff = effectiveCycle({ ...own, cyclePostCount: 2, postingSchedule: schedule });
  assert.equal(eff.startMode, "AT_TIME", "start mode stays per account");
  assert.equal(eff.startTimeOfDay, "09:30", "start time stays per account");
  assert.equal(eff.repostIntervalMinutes, 90);
  assert.equal(eff.cycleLimit, 3);
  assert.equal(eff.breakMinutes, 60);
  assert.equal(eff.cyclePostCount, 2, "per-account progress is kept");
});

test("without a schedule the account's own fields are used", () => {
  assert.equal(effectiveCycle({ ...own, postingSchedule: null }).repostIntervalMinutes, 10);
});

test("scheduleMissing lists what an unfinished schedule needs", () => {
  assert.deepEqual(scheduleMissing(schedule), []);
  assert.deepEqual(scheduleMissing({ repostIntervalMinutes: null, cycleLimit: null, breakMinutes: 0 }), [
    "set a repost interval",
    "set a cycle limit",
  ]);
});
