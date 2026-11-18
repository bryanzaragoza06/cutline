"use client";

import { useState } from "react";
import type { AccountWithStyles, Post } from "@/lib/types";
import { formatDateTime, previewSrc } from "@/lib/format";
import { card, secondaryButton } from "@/components/ui";
import StatusBadge from "@/components/StatusBadge";
import { PRIVACY_LABELS } from "@/lib/labels";
import Scheduler from "@/components/Scheduler";
import PublishNowPanel from "@/components/PublishNowPanel";

/** An uploaded video post: preview, status, schedules, and Post now / Schedule / Delete. */
export default function PostCard({
  post,
  accounts,
  onChanged,
  onRefresh,
  onDeleted,
}: {
  post: Post;
  accounts: AccountWithStyles[];
  onChanged: (post: Post) => void;
  onRefresh: () => void;
  onDeleted: () => void;
}) {
  const [mode, setMode] = useState<"idle" | "schedule" | "publish">("idle");
  const hasTikTokAccount = accounts.some((a) => a.openId);
  const canPublishNow = !!post.videoUrl && hasTikTokAccount;

  async function cancelSchedule(scheduleId: string) {
    const res = await fetch(`/api/schedules/${scheduleId}`, { method: "DELETE" });
    if (res.ok) onRefresh();
  }

  async function deletePost() {
    if (!confirm("Delete this post?")) return;
    const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    if (res.ok) onDeleted();
  }

  return (
    <div className={`${card} p-5`}>
      <div className="flex flex-col gap-4 sm:flex-row">
        {post.videoUrl && (
          <video
            src={previewSrc(post.videoUrl)}
            controls
            playsInline
            preload="metadata"
            className="aspect-[9/16] w-40 shrink-0 rounded-lg bg-black object-contain"
          />
        )}
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <p className="whitespace-pre-wrap break-words">{post.caption}</p>
            <StatusBadge status={post.status} />
          </div>
          {post.mediaNote && <p className="text-xs text-black/50 dark:text-white/50">{post.mediaNote}</p>}

          {post.schedules.length > 0 && (
            <ul className="space-y-2 border-t border-black/10 pt-3 text-sm dark:border-white/10">
              {post.schedules.map((s) => (
                <li key={s.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span>
                      {s.account.displayName} — {formatDateTime(s.scheduledAt)}
                      {s.privacyLevel && (
                        <span className="text-black/50 dark:text-white/50"> · {PRIVACY_LABELS[s.privacyLevel] ?? s.privacyLevel}</span>
                      )}
                    </span>
                    <StatusBadge status={s.status} />
                    {s.status === "PENDING" && (
                      <button
                        type="button"
                        onClick={() => cancelSchedule(s.id)}
                        className="text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white"
                        aria-label="Cancel schedule"
                        title="Cancel"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {s.status === "PROCESSING" && (
                    <p className="text-xs text-black/50 dark:text-white/50">
                      Uploaded to TikTok — it can take a few minutes to finish processing there.
                    </p>
                  )}
                  {s.status === "FAILED" && s.error && <p className="text-xs text-red-600 dark:text-red-400">{s.error}</p>}
                </li>
              ))}
            </ul>
          )}

          {mode === "idle" && (
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => setMode("schedule")}
                disabled={!canPublishNow}
                title={
                  !post.videoUrl
                    ? "The video file has been removed — upload it again"
                    : !hasTikTokAccount
                      ? "Connect a TikTok account first"
                      : undefined
                }
                className={secondaryButton}
              >
                Schedule to TikTok
              </button>
              <button
                type="button"
                onClick={() => setMode("publish")}
                disabled={!canPublishNow}
                title={
                  !post.videoUrl
                    ? "The video file has been removed — upload it again"
                    : !hasTikTokAccount
                      ? "Connect a TikTok account first"
                      : undefined
                }
                className={secondaryButton}
              >
                Post to TikTok now
              </button>
              <button type="button" onClick={deletePost} className="px-2 text-sm text-red-600 hover:underline dark:text-red-400">
                Delete post
              </button>
            </div>
          )}
        </div>
      </div>

      {mode === "schedule" && (
        <div className="mt-4 border-t border-black/10 pt-4 dark:border-white/10">
          <Scheduler
            post={post}
            accounts={accounts}
            onCancel={() => setMode("idle")}
            onScheduled={(updated) => {
              onChanged(updated);
              setMode("idle");
            }}
          />
        </div>
      )}
      {mode === "publish" && (
        <div className="mt-4 border-t border-black/10 pt-4 dark:border-white/10">
          <PublishNowPanel
            post={post}
            accounts={accounts}
            onCancel={() => setMode("idle")}
            onPosted={(updated) => {
              onChanged(updated);
              setMode("idle");
            }}
          />
        </div>
      )}
    </div>
  );
}
