"use client";

import { useState } from "react";
import type { AccountWithStyles, Post } from "@/lib/types";
import { toDateTimeLocalValue } from "@/lib/format";
import { useNow } from "@/lib/useNow";
import { input, label, secondaryButton } from "@/components/ui";
import PostSettingsForm, { type PostSettingsPayload } from "@/components/PostSettingsForm";
import { AccountPicker } from "@/components/PublishNowPanel";

/**
 * Schedules a post to one TikTok account. The post settings are chosen now,
 * from the account's live TikTok options, and saved with the schedule — so
 * nothing is defaulted when it publishes later.
 */
const PRESETS: { label: string; minutes: number }[] = [
  { label: "In 1 minute", minutes: 1 },
  { label: "In 4 hours", minutes: 4 * 60 },
  { label: "In 26 hours", minutes: 26 * 60 },
];

export default function Scheduler({
  post,
  accounts,
  onScheduled,
  onCancel,
}: {
  post: Post;
  accounts: AccountWithStyles[];
  onScheduled: (post: Post) => void;
  onCancel: () => void;
}) {
  const connected = accounts.filter((a) => a.openId);
  const [accountId, setAccountId] = useState("");
  const [when, setWhen] = useState(() => toDateTimeLocalValue(new Date(Date.now() + 60 * 60 * 1000)));
  const now = useNow(15_000);
  const whenValid = !!when && new Date(when).getTime() > now;

  async function schedule(payload: PostSettingsPayload): Promise<string | null> {
    const res = await fetch(`/api/posts/${post.id}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, scheduledAt: new Date(when).toISOString(), ...payload }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return data.error ?? "Could not schedule";
    onScheduled(data);
    return null;
  }

  if (!post.videoUrl) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-black/60 dark:text-white/60">This post has no video file (it was removed after posting), so it can&apos;t be scheduled. Upload the video again.</p>
        <button type="button" onClick={onCancel} className={secondaryButton}>
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <AccountPicker id={`schedule-account-${post.id}`} accounts={connected} value={accountId} onChange={setAccountId} />
        <div>
          <label className={label} htmlFor={`schedule-when-${post.id}`}>
            When
          </label>
          <input
            id={`schedule-when-${post.id}`}
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className={`${input} w-auto`}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-black/50 dark:text-white/50">Quick pick:</span>
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => setWhen(toDateTimeLocalValue(new Date(Date.now() + preset.minutes * 60 * 1000)))}
            className={`${secondaryButton} px-3 py-1 text-xs`}
          >
            {preset.label}
          </button>
        ))}
        <span className="text-xs text-black/50 dark:text-white/50">To post right away, use &ldquo;Post now&rdquo; instead.</span>
      </div>
      {!whenValid && <p className="text-xs text-red-600 dark:text-red-400">Pick a time in the future.</p>}
      {accountId ? (
        <PostSettingsForm
          key={accountId}
          accountId={accountId}
          mode="schedule"
          durationSec={post.durationSec ?? 12}
          initialTitle={post.title ?? ""}
          submitLabel="Schedule post"
          extraValid={whenValid}
          onSubmit={schedule}
          onCancel={onCancel}
        />
      ) : (
        <button type="button" onClick={onCancel} className={secondaryButton}>
          Cancel
        </button>
      )}
      <p className="text-xs text-black/50 dark:text-white/50">To post to several accounts, schedule once per account.</p>
    </div>
  );
}
