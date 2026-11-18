"use client";

import { useState } from "react";
import type { CreatorInfo } from "@/lib/types";
import { useFetchJson } from "@/lib/useFetchJson";
import { PRIVACY_LABELS } from "@/lib/labels";
import { TITLE_MAX } from "@/lib/postSettings";
import { input, label, primaryButton, secondaryButton } from "@/components/ui";

export type PostSettingsPayload = {
  title: string;
  privacyLevel: string;
  allowComment: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
  commercialDisclosure: boolean;
  yourBrand: boolean;
  brandedContent: boolean;
};

const MUSIC_USAGE_URL = "https://www.tiktok.com/legal/page/global/music-usage-confirmation/en";
const BRANDED_CONTENT_URL = "https://www.tiktok.com/legal/page/global/bc-policy/en";

/**
 * TikTok post settings, built to TikTok's Content Sharing Guidelines:
 * - creator nickname/avatar and posting limits come live from creator_info;
 * - the audience list is TikTok's, with nothing pre-selected;
 * - comment/duet/stitch start unchecked and are disabled when the creator has
 *   turned them off;
 * - commercial content disclosure with the exact labeling notices;
 * - the Music Usage Confirmation / Branded Content Policy declaration.
 *
 * Mount it with key={accountId} so switching accounts re-fetches creator info.
 */
export default function PostSettingsForm({
  accountId,
  mode,
  durationSec,
  initialTitle = "",
  submitLabel,
  extraValid = true,
  onSubmit,
  onCancel,
}: {
  accountId: string;
  mode: "publish" | "schedule";
  /** Real length of the video being posted, checked against the creator's TikTok limit. */
  durationSec: number;
  initialTitle?: string;
  submitLabel: string;
  extraValid?: boolean;
  onSubmit: (payload: PostSettingsPayload) => Promise<string | null>;
  onCancel: () => void;
}) {
  const { data: creator, error: creatorError } = useFetchJson<CreatorInfo>(`/api/accounts/${accountId}/creator-info`);

  const [title, setTitle] = useState(initialTitle.slice(0, TITLE_MAX));
  const [privacyLevel, setPrivacyLevel] = useState("");
  // Unchecked by default — the user must opt in to each interaction.
  const [allowComment, setAllowComment] = useState(false);
  const [allowDuet, setAllowDuet] = useState(false);
  const [allowStitch, setAllowStitch] = useState(false);
  const [commercialDisclosure, setCommercialDisclosure] = useState(false);
  const [yourBrand, setYourBrand] = useState(false);
  const [brandedContent, setBrandedContent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (creatorError) {
    return (
      <div className="space-y-3">
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          TikTok says this account can&apos;t post right now: {creatorError}
        </p>
        <button type="button" onClick={onCancel} className={secondaryButton}>
          Cancel
        </button>
      </div>
    );
  }
  if (!creator) return <p className="text-sm text-black/50 dark:text-white/50">Loading your TikTok settings…</p>;

  const tooLong = durationSec > creator.max_video_post_duration_sec;
  const privacyStillOffered = !privacyLevel || creator.privacy_level_options.includes(privacyLevel);
  const disclosureIncomplete = commercialDisclosure && !yourBrand && !brandedContent;
  const canSubmit = !!privacyLevel && privacyStillOffered && !disclosureIncomplete && !tooLong && extraValid && !submitting;

  const interactions = [
    { key: "comment", label: "Comment", disabled: creator.comment_disabled, value: allowComment, set: setAllowComment },
    { key: "duet", label: "Duet", disabled: creator.duet_disabled, value: allowDuet, set: setAllowDuet },
    { key: "stitch", label: "Stitch", disabled: creator.stitch_disabled, value: allowStitch, set: setAllowStitch },
  ];

  const verb = mode === "publish" ? "posting" : "scheduling";
  const labelNotice = brandedContent
    ? "Your video will be labeled as “Paid partnership”."
    : yourBrand
      ? "Your video will be labeled as “Promotional content”."
      : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const err = await onSubmit({
      title,
      privacyLevel,
      allowComment: !creator!.comment_disabled && allowComment,
      allowDuet: !creator!.duet_disabled && allowDuet,
      allowStitch: !creator!.stitch_disabled && allowStitch,
      commercialDisclosure,
      yourBrand: commercialDisclosure && yourBrand,
      brandedContent: commercialDisclosure && brandedContent,
    });
    setSubmitting(false);
    if (err) setError(err);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center gap-3">
        {creator.creator_avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={creator.creator_avatar_url} alt="" width={36} height={36} className="h-9 w-9 rounded-full object-cover" />
        ) : null}
        <p className="text-sm">
          Posting as <strong>{creator.creator_nickname}</strong>
          {creator.creator_username ? <span className="text-black/50 dark:text-white/50"> (@{creator.creator_username})</span> : null} on
          TikTok.
        </p>
      </div>

      {tooLong && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          This TikTok account can only post videos up to {creator.max_video_post_duration_sec}s, and this video is{" "}
          {Math.ceil(durationSec)}s.
        </p>
      )}

      <div>
        <label className={label} htmlFor={`title-${accountId}`}>
          Caption (optional)
        </label>
        <textarea
          id={`title-${accountId}`}
          value={title}
          rows={3}
          maxLength={TITLE_MAX}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Write a caption. Hashtags (#) and mentions (@) work like they do in TikTok."
          className={input}
        />
        <p className="mt-1 text-xs text-black/50 dark:text-white/50">
          {title.length}/{TITLE_MAX}
        </p>
      </div>

      <div>
        <label className={label} htmlFor={`privacy-${accountId}`}>
          Who can watch this video
        </label>
        <select
          id={`privacy-${accountId}`}
          value={privacyStillOffered ? privacyLevel : ""}
          onChange={(e) => setPrivacyLevel(e.target.value)}
          className={`${input} w-auto`}
          required
        >
          <option value="" disabled>
            Choose…
          </option>
          {creator.privacy_level_options.map((option) => {
            const blocked = option === "SELF_ONLY" && brandedContent;
            return (
              <option key={option} value={option} disabled={blocked}>
                {PRIVACY_LABELS[option] ?? option}
                {blocked ? " (branded content visibility can't be set to private)" : ""}
              </option>
            );
          })}
        </select>
        {creator.privacy_level_options.length > 0 && !creator.privacy_level_options.some((o) => o !== "SELF_ONLY") && (
          <p className="mt-1 text-xs text-black/60 dark:text-white/60">
            TikTok currently only allows private (&ldquo;Only me&rdquo;) posts for this app. Public posting becomes available once TikTok
            completes its audit of the app.
          </p>
        )}
        {!privacyStillOffered && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            Your previous choice is no longer available for this account — choose again.
          </p>
        )}
      </div>

      <fieldset>
        <legend className={label}>Allow users to</legend>
        <div className="flex flex-wrap gap-4">
          {interactions.map((item) => (
            <label
              key={item.key}
              className={`flex items-center gap-2 text-sm ${item.disabled ? "cursor-not-allowed opacity-40" : ""}`}
              title={item.disabled ? `${item.label} is turned off in this account's TikTok settings` : undefined}
            >
              <input
                type="checkbox"
                checked={!item.disabled && item.value}
                disabled={item.disabled}
                onChange={(e) => item.set(e.target.checked)}
                aria-label={`Allow ${item.label}`}
              />
              {item.label}
              {item.disabled && <span className="text-xs">(off in TikTok)</span>}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
        <label className="flex items-center justify-between gap-4">
          <span>
            <span className="block text-sm font-medium">Disclose commercial content</span>
            <span className="block text-xs text-black/50 dark:text-white/50">
              Turn on to disclose that this video promotes goods or services in
              exchange for something of value. Your video could promote yourself, a third party, or both.
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={commercialDisclosure}
            aria-label="Disclose commercial content"
            onClick={() => {
              const next = !commercialDisclosure;
              setCommercialDisclosure(next);
              if (!next) {
                setYourBrand(false);
                setBrandedContent(false);
              }
            }}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              commercialDisclosure ? "bg-baby-strong" : "bg-black/20 dark:bg-white/20"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                commercialDisclosure ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </label>

        {commercialDisclosure && (
          <div className="mt-4 space-y-3">
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={yourBrand} onChange={(e) => setYourBrand(e.target.checked)} className="mt-0.5" />
              <span>
                <span className="font-medium">Your Brand</span>
                <span className="block text-xs text-black/50 dark:text-white/50">
                  You are promoting yourself or your own business.
                </span>
              </span>
            </label>
            <label
              className={`flex items-start gap-2 text-sm ${privacyLevel === "SELF_ONLY" ? "cursor-not-allowed opacity-40" : ""}`}
              title={privacyLevel === "SELF_ONLY" ? "Branded content visibility can't be set to private" : undefined}
            >
              <input
                type="checkbox"
                checked={brandedContent}
                disabled={privacyLevel === "SELF_ONLY"}
                onChange={(e) => setBrandedContent(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">Branded Content</span>
                <span className="block text-xs text-black/50 dark:text-white/50">
                  You are promoting another brand or a third party. Branded content visibility can&apos;t be set to private.
                </span>
              </span>
            </label>
            {disclosureIncomplete ? (
              <p className="text-xs text-red-600 dark:text-red-400">
                You need to indicate if your content promotes yourself, a third party, or both.
              </p>
            ) : (
              labelNotice && <p className="text-xs font-medium">{labelNotice}</p>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-black/60 dark:text-white/60">
        By {verb}, you agree to TikTok&apos;s{" "}
        {brandedContent && (
          <>
            <a href={BRANDED_CONTENT_URL} target="_blank" rel="noopener noreferrer" className="underline">
              Branded Content Policy
            </a>{" "}
            and{" "}
          </>
        )}
        <a href={MUSIC_USAGE_URL} target="_blank" rel="noopener noreferrer" className="underline">
          Music Usage Confirmation
        </a>
        . After you post, it can take a few minutes for TikTok to process the video and for it to appear on your profile.
      </p>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!canSubmit}
          className={primaryButton}
          title={
            !privacyLevel
              ? "Choose who can watch first"
              : disclosureIncomplete
                ? "You need to indicate if your content promotes yourself, a third party, or both"
                : undefined
          }
        >
          {submitting ? "Working…" : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className={secondaryButton}>
          Cancel
        </button>
      </div>
    </form>
  );
}
