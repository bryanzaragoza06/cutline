"use client";

import { useState } from "react";
import type { PostingSchedule } from "@/lib/types";
import { useFetchJson } from "@/lib/useFetchJson";
import { scheduleSummary } from "@/lib/format";
import { card, input, label, primaryButton, secondaryButton } from "@/components/ui";
import { CycleLimitField, DurationField } from "@/components/ScheduleFields";

export default function SchedulesPage() {
  const { data: schedules, setData: setSchedules, reload } = useFetchJson<PostingSchedule[]>("/api/posting-schedules");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    const res = await fetch("/api/posting-schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => ({}));
    setCreating(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn't create the schedule");
      return;
    }
    setName("");
    setSchedules((prev) => [...(prev ?? []), data]);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Schedules</h1>
        <p className="mt-1 max-w-2xl text-sm text-black/60 dark:text-white/60">
          Master posting frequencies — how often to post, how many posts per cycle, and how long to rest. Create one here, then
          pick it for any account on the Accounts page; edits apply to every account using it. When each account starts posting
          (Now, At time or Cook) is set on the account.
        </p>
      </div>

      <form onSubmit={create} className={`${card} flex flex-wrap items-end gap-3 p-5`}>
        <div className="min-w-48 flex-1">
          <label className={label} htmlFor="schedule-name">
            New schedule name
          </label>
          <input
            id="schedule-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Fast mornings"
            className={input}
          />
        </div>
        <button type="submit" disabled={creating || !name.trim()} className={primaryButton}>
          {creating ? "Creating…" : "+ New schedule"}
        </button>
        {error && <p className="w-full text-sm text-red-600 dark:text-red-400">{error}</p>}
      </form>

      {schedules === null ? (
        <p className="text-sm text-black/50 dark:text-white/50">Loading…</p>
      ) : schedules.length === 0 ? (
        <p className={`${card} p-5 text-sm text-black/50 dark:text-white/50`}>No schedules yet — create one above.</p>
      ) : (
        <div className="space-y-4">
          {schedules.map((schedule) => (
            <ScheduleCard key={schedule.id} schedule={schedule} onChanged={reload} />
          ))}
        </div>
      )}
    </div>
  );
}

function ScheduleCard({ schedule, onChanged }: { schedule: PostingSchedule; onChanged: () => void }) {
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(schedule.name);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const used = schedule._count?.accounts ?? 0;

  async function patch(data: Record<string, unknown>): Promise<boolean> {
    setError(null);
    const res = await fetch(`/api/posting-schedules/${schedule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't save");
      return false;
    }
    onChanged();
    return true;
  }

  async function saveName() {
    if (!name.trim()) return;
    if (await patch({ name })) setEditingName(false);
  }

  async function remove() {
    const msg = used
      ? `Delete "${schedule.name}"? ${used} account${used === 1 ? " uses" : "s use"} it and will be paused until you pick another schedule.`
      : `Delete "${schedule.name}"?`;
    if (!confirm(msg)) return;
    setDeleting(true);
    const res = await fetch(`/api/posting-schedules/${schedule.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) onChanged();
  }

  return (
    <section className={`${card} space-y-4 p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                value={name}
                autoFocus
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveName();
                  if (e.key === "Escape") setEditingName(false);
                }}
                className={`${input} w-64`}
              />
              <button type="button" onClick={saveName} className={secondaryButton}>
                Save
              </button>
            </div>
          ) : (
            <h2 className="font-medium">
              {schedule.name}{" "}
              <button
                type="button"
                onClick={() => {
                  setName(schedule.name);
                  setEditingName(true);
                }}
                className="text-sm font-normal text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white"
                title="Rename"
              >
                ✎
              </button>
            </h2>
          )}
          <p className="text-xs text-black/50 dark:text-white/50">
            {scheduleSummary(schedule)} · used by {used} account{used === 1 ? "" : "s"}
          </p>
        </div>
        <button
          type="button"
          onClick={remove}
          disabled={deleting}
          className="text-sm text-red-600 hover:underline disabled:opacity-40 dark:text-red-400"
        >
          Delete
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <DurationField
          title="Repost every"
          minutes={schedule.repostIntervalMinutes}
          allowZero={false}
          onSave={(repostIntervalMinutes) => patch({ repostIntervalMinutes })}
        />
        <CycleLimitField limit={schedule.cycleLimit} onSave={(cycleLimit) => patch({ cycleLimit })} />
        <DurationField title="Break time" minutes={schedule.breakMinutes} allowZero onSave={(breakMinutes) => patch({ breakMinutes })} />
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </section>
  );
}
