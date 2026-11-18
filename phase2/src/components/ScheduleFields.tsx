"use client";

import { useState } from "react";
import type { StartMode } from "@/lib/types";
import { input } from "@/components/ui";

// Posting-cycle inputs shared by the Schedules page. Each field keeps its own
// local state and saves on change/blur, so polling never clobbers typing.
// (Deliberately three <select>s for the time, not <input type="time">, which
// silently drops keystrokes unless you click exactly inside a tiny segment.)

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

function splitTime(hhmm: string | null): { hour: string; minute: string; ampm: string } {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm ?? "");
  if (!match) return { hour: "", minute: "", ampm: "" };
  const h = Number(match[1]);
  return { hour: String(h % 12 === 0 ? 12 : h % 12), minute: match[2], ampm: h < 12 ? "AM" : "PM" };
}

/**
 * Start mode + time of day. Deliberately three <select>s rather than
 * <input type="time">, which silently drops keystrokes unless you click
 * exactly inside one of its tiny segments.
 */
export function StartField({
  startMode,
  startTimeOfDay,
  onSave,
}: {
  startMode: StartMode;
  startTimeOfDay: string | null;
  onSave: (data: Record<string, unknown>) => unknown;
}) {
  const [mode, setMode] = useState<StartMode>(startMode);
  const [time, setTime] = useState(() => splitTime(startTimeOfDay));

  function changeTime(patch: Partial<typeof time>) {
    const next = { ...time, ...patch };
    setTime(next);
    if (!next.hour || !next.minute || !next.ampm) return;
    let h = Number(next.hour) % 12;
    if (next.ampm === "PM") h += 12;
    onSave({ startTimeOfDay: `${String(h).padStart(2, "0")}:${next.minute}` });
  }

  return (
    <div>
      <label className="mb-1 block text-xs text-black/50 dark:text-white/50">Start</label>
      <select
        value={mode}
        onChange={(e) => {
          const next = e.target.value as StartMode;
          setMode(next);
          onSave({ startMode: next });
        }}
        className={input}
      >
        <option value="NOW">Now</option>
        <option value="AT_TIME">At time</option>
        <option value="COOK">Cook (26h after start)</option>
      </select>
      {mode === "AT_TIME" && (
        <div className="mt-2 flex gap-1">
          <select value={time.hour} onChange={(e) => changeTime({ hour: e.target.value })} className={`${input} px-2`} aria-label="Hour">
            <option value="" disabled>
              hr
            </option>
            {HOURS_12.map((h) => (
              <option key={h} value={String(h)}>
                {h}
              </option>
            ))}
          </select>
          <select value={time.minute} onChange={(e) => changeTime({ minute: e.target.value })} className={`${input} px-2`} aria-label="Minute">
            <option value="" disabled>
              min
            </option>
            {MINUTES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select value={time.ampm} onChange={(e) => changeTime({ ampm: e.target.value })} className={`${input} px-2`} aria-label="AM or PM">
            <option value="" disabled>
              –
            </option>
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </div>
      )}
      {mode === "AT_TIME" && <p className="mt-1 text-[11px] text-black/40 dark:text-white/40">Pacific time</p>}
    </div>
  );
}

export function DurationField({
  title,
  minutes,
  allowZero,
  onSave,
}: {
  title: string;
  minutes: number | null;
  allowZero: boolean;
  onSave: (minutes: number | null) => unknown;
}) {
  const [hours, setHours] = useState(minutes == null ? "" : String(Math.floor(minutes / 60)));
  const [mins, setMins] = useState(minutes == null ? "" : String(minutes % 60));
  const [lastSaved, setLastSaved] = useState<number | null>(minutes);

  function save() {
    let total: number | null;
    if (hours.trim() === "" && mins.trim() === "") {
      total = null;
    } else {
      total = Math.max(0, Math.floor(Number(hours || 0))) * 60 + Math.max(0, Math.floor(Number(mins || 0)));
      if (!Number.isFinite(total)) return;
      if (!allowZero && total === 0) return;
    }
    if (total === lastSaved) return;
    setLastSaved(total);
    onSave(total);
  }

  return (
    <div>
      <label className="mb-1 block text-xs text-black/50 dark:text-white/50">{title}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          onBlur={save}
          className={`${input} px-2`}
          aria-label={`${title} hours`}
        />
        <span className="text-xs text-black/50 dark:text-white/50">hr</span>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={mins}
          onChange={(e) => setMins(e.target.value)}
          onBlur={save}
          className={`${input} px-2`}
          aria-label={`${title} minutes`}
        />
        <span className="text-xs text-black/50 dark:text-white/50">min</span>
      </div>
    </div>
  );
}

export function CycleLimitField({ limit, onSave }: { limit: number | null; onSave: (limit: number | null) => unknown }) {
  const [value, setValue] = useState(limit == null ? "" : String(limit));
  const [lastSaved, setLastSaved] = useState<number | null>(limit);

  function save() {
    const trimmed = value.trim();
    const next = trimmed === "" ? null : Math.floor(Number(trimmed));
    if (next !== null && (!Number.isFinite(next) || next < 1)) return;
    if (next === lastSaved) return;
    setLastSaved(next);
    onSave(next);
  }

  return (
    <div>
      <label className="mb-1 block text-xs text-black/50 dark:text-white/50">Cycle limit</label>
      <input
        type="number"
        min={1}
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        className={input}
        aria-label="Cycle limit"
      />
      <p className="mt-1 text-[11px] text-black/40 dark:text-white/40">Posts per cycle before the break</p>
    </div>
  );
}
