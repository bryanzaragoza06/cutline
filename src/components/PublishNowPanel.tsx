"use client";

import { useState } from "react";
import type { AccountWithStyles, Post } from "@/lib/types";
import { previewSrc } from "@/lib/format";
import { input, label, secondaryButton } from "@/components/ui";
import PostSettingsForm, { type PostSettingsPayload } from "@/components/PostSettingsForm";

/**
 * "Post to TikTok now": a preview of the exact video, then the compliant
 * post settings form for the chosen account.
 */
export default function PublishNowPanel({
  post,
  accounts,
  onPosted,
  onCancel,
}: {
  post: Post;
  accounts: AccountWithStyles[];
  onPosted: (post: Post) => void;
  onCancel: () => void;
}) {
  const connected = accounts.filter((a) => a.openId);
  const [accountId, setAccountId] = useState("");

  async function publish(payload: PostSettingsPayload): Promise<string | null> {
    const res = await fetch(`/api/posts/${post.id}/publish-now`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, ...payload }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return data.error ?? "Posting failed";
    onPosted(data);
    return null;
  }

  return (
    <div className="space-y-4">
      {post.videoUrl && (
        <div>
          <p className={label}>Preview — this is exactly what will be posted</p>
          <video src={previewSrc(post.videoUrl)} controls playsInline preload="metadata" className="max-h-80 rounded-lg bg-black" />
        </div>
      )}
      <AccountPicker id={`publish-account-${post.id}`} accounts={connected} value={accountId} onChange={setAccountId} />
      {accountId ? (
        <PostSettingsForm
          key={accountId}
          accountId={accountId}
          mode="publish"
          durationSec={post.durationSec ?? 12}
          initialTitle={post.title ?? ""}
          submitLabel="Post to TikTok"
          onSubmit={publish}
          onCancel={onCancel}
        />
      ) : (
        <button type="button" onClick={onCancel} className={secondaryButton}>
          Cancel
        </button>
      )}
    </div>
  );
}

export function AccountPicker({
  id,
  accounts,
  value,
  onChange,
}: {
  id: string;
  accounts: AccountWithStyles[];
  value: string;
  onChange: (id: string) => void;
}) {
  if (accounts.length === 0) {
    return <p className="text-sm text-black/60 dark:text-white/60">Connect a TikTok account on the Accounts page first.</p>;
  }
  return (
    <div>
      <label className={label} htmlFor={id}>
        TikTok account
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${input} w-auto`}>
        <option value="" disabled>
          Choose an account…
        </option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.displayName}
          </option>
        ))}
      </select>
    </div>
  );
}
