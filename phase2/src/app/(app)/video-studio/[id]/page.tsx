"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LibraryKind, StyleAudio, StyleCaption, VideoLayout, VideoStyleDetail } from "@/lib/types";
import { useFetchJson } from "@/lib/useFetchJson";
import { uploadInChunks, type UploadFailure } from "@/lib/chunkedUpload";
import { KIND_LABELS, LAYOUT_LABELS } from "@/lib/labels";
import { formatDateTime, previewSrc } from "@/lib/format";
import {
  MAX_CROSSFADE_SEC,
  MAX_SECONDS_PER_IMAGE,
  MIN_CROSSFADE_SEC,
  MIN_SECONDS_PER_IMAGE,
  FPS,
  segmentCountFor,
  TOTAL_DURATION_SEC,
} from "@/lib/videoConstants";
import { card, input, label, pill, primaryButton, secondaryButton } from "@/components/ui";
import LibraryPicker from "@/components/LibraryPicker";
import AudioTimestamps from "@/components/AudioTimestamps";

export default function StyleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const base = `/api/video-studio/styles/${id}`;
  const { data: style, error, setData: setStyle, reload } = useFetchJson<VideoStyleDetail>(base, 5000);

  const [previewLayout, setPreviewLayout] = useState<VideoLayout>("LANDSCAPE_16_9");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const router = useRouter();

  if (error) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <Link href="/video-studio" className="text-sm underline">
          ← Back to Video Studio
        </Link>
      </div>
    );
  }
  if (!style) return <p className="text-sm text-black/50 dark:text-white/50">Loading…</p>;

  const isCompilation = style.kind === "VIDEO_COMPILATION";
  const sourceCount = isCompilation ? style.videoClips.length : style.images.length;
  const canGenerate = sourceCount > 0 && !generating;

  async function patchStyle(data: Record<string, unknown>) {
    const res = await fetch(base, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (res.ok) {
      const updated = await res.json();
      setStyle((prev) => (prev ? { ...prev, ...updated } : prev));
    }
    return res;
  }

  async function generate() {
    setGenerating(true);
    setGenerateError(null);
    const res = await fetch(`${base}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ layout: previewLayout }),
    });
    const data = await res.json().catch(() => ({}));
    setGenerating(false);
    if (!res.ok) setGenerateError(data.error ?? "Generation failed");
    reload();
  }

  async function deleteStyle() {
    const accounts = style!._count.accountLinks;
    const msg = [
      `Delete the "${style!.name}" template?`,
      "Its images, clips, audio and captions stay in your Library, and videos it already made stay on Posts.",
      accounts
        ? `${accounts} account${accounts === 1 ? " pulls" : "s pull"} from it — they'll stop using it, and any account left with no templates will be paused.`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    if (!confirm(msg)) return;
    setDeleting(true);
    setDeleteError(null);
    const res = await fetch(base, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setDeleting(false);
      setDeleteError(body.error ?? "Couldn't delete the template");
      return;
    }
    router.push("/video-studio");
  }

  async function deleteItem(path: string) {
    const res = await fetch(`${base}/${path}`, { method: "DELETE" });
    if (res.ok) reload();
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/video-studio" className="text-sm text-black/50 hover:underline dark:text-white/50">
          ← Video Studio
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <StyleName key={style.id} initial={style.name} onSave={(name) => patchStyle({ name })} />
          <span className="rounded-full border border-black/15 px-2 py-0.5 text-xs dark:border-white/15">{KIND_LABELS[style.kind]}</span>
          <button
            type="button"
            onClick={deleteStyle}
            disabled={deleting}
            className="ml-auto text-sm text-red-600 hover:underline disabled:opacity-40 dark:text-red-400"
          >
            {deleting ? "Deleting…" : "Delete template"}
          </button>
        </div>
        {deleteError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{deleteError}</p>}
      </div>

      <section className={`${card} space-y-5 p-5`}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="preview-layout">
              Preview as
            </label>
            <div className="flex gap-2">
              <select
                id="preview-layout"
                value={previewLayout}
                onChange={(e) => setPreviewLayout(e.target.value as VideoLayout)}
                className={`${input} w-auto min-w-0 flex-1`}
              >
                {(Object.keys(LAYOUT_LABELS) as VideoLayout[]).map((layout) => (
                  <option key={layout} value={layout}>
                    {LAYOUT_LABELS[layout]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={generate}
                disabled={!canGenerate}
                className={`${primaryButton} whitespace-nowrap`}
                title={sourceCount === 0 ? `Upload at least one ${isCompilation ? "clip" : "image"} first` : undefined}
              >
                {generating ? "Generating…" : "Generate video"}
              </button>
            </div>
            <p className="mt-1 text-xs text-black/50 dark:text-white/50">
              Just for this preview — each account has its own saved aspect ratio.
            </p>
          </div>
        </div>
        {generateError && <p className="text-sm text-red-600 dark:text-red-400">{generateError}</p>}

        <TimingSliders
          key={style.id}
          initialHold={style.secondsPerImage}
          initialFade={style.crossfadeSec}
          noun={isCompilation ? "clips" : "images"}
          onSave={(data) => patchStyle(data)}
        />
      </section>

      <TitlesSection
        titleOnScreen={style.titleOnScreen}
        titleAsCaption={style.titleAsCaption}
        hasAudio={style.audioClips.length > 0}
        onChange={(data) => patchStyle(data)}
      />

      {isCompilation ? (
        <UploadSection
          title="Video clips"
          hint="MP4, MOV, WebM or M4V. Random sections are cut from these."
          accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm,.m4v"
          uploadUrl={`${base}/videos`}
          field="videos"
          onUploaded={reload}
          count={style.videoClips.length}
          library={{ styleId: style.id, kind: "VIDEO", existingIds: libraryIds(style.videoClips) }}
        >
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {style.videoClips.map((clip) => (
              <div key={clip.id} className="group relative">
                <video src={previewSrc(clip.url)} muted playsInline preload="metadata" className="aspect-square w-full rounded-lg bg-black object-cover" />
                <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 text-[10px] text-white">{clip.durationSec.toFixed(1)}s</span>
                <DeleteThumbButton onClick={() => deleteItem(`videos/${clip.id}`)} />
              </div>
            ))}
          </div>
        </UploadSection>
      ) : (
        <UploadSection
          title="Images"
          hint="JPEG, PNG or WebP. Large photos are downscaled on upload."
          accept="image/jpeg,image/png,image/webp"
          uploadUrl={`${base}/images`}
          field="images"
          onUploaded={reload}
          count={style.images.length}
          library={{ styleId: style.id, kind: "IMAGE", existingIds: libraryIds(style.images) }}
        >
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
            {style.images.map((image) => (
              <div key={image.id} className="group relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt="" loading="lazy" className="aspect-square w-full rounded-lg object-cover" />
                <DeleteThumbButton onClick={() => deleteItem(`images/${image.id}`)} />
              </div>
            ))}
          </div>
        </UploadSection>
      )}

      <UploadSection
        title="Audio"
        hint="MP3 or WAV. One track is picked at random per video; its label is shown on screen exactly as you type it."
        accept="audio/mpeg,audio/wav,audio/x-wav,.mp3,.wav"
        uploadUrl={`${base}/audio`}
        field="audio"
        onUploaded={reload}
        count={style.audioClips.length}
        library={{ styleId: style.id, kind: "AUDIO", existingIds: libraryIds(style.audioClips) }}
      >
        <ul className="divide-y divide-black/10 dark:divide-white/10">
          {style.audioClips.map((audio) => (
            <AudioRow key={audio.id} audio={audio} base={base} onDelete={() => deleteItem(`audio/${audio.id}`)} />
          ))}
        </ul>
      </UploadSection>

      <CaptionsSection base={base} styleId={style.id} captions={style.captions} onChanged={reload} />

      <section className={`${card} p-5`}>
        <h2 className="font-medium">Recent generated videos</h2>
        {style.generatedVideos.length === 0 ? (
          <p className="mt-2 text-sm text-black/50 dark:text-white/50">Nothing generated yet.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {style.generatedVideos.map((video) => (
              <li key={video.id} className="flex gap-4">
                {video.status === "READY" && video.url ? (
                  <video src={previewSrc(video.url)} controls playsInline preload="metadata" className="aspect-[9/16] w-28 shrink-0 rounded-lg bg-black object-contain" />
                ) : (
                  <div className="flex aspect-[9/16] w-28 shrink-0 items-center justify-center rounded-lg bg-black/5 text-xs text-black/40 dark:bg-white/5 dark:text-white/40">
                    {video.status === "GENERATING" ? "Rendering…" : "—"}
                  </div>
                )}
                <div className="min-w-0 space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        video.status === "READY"
                          ? "bg-green-500/15 text-green-700 dark:text-green-300"
                          : video.status === "FAILED"
                            ? "bg-red-500/15 text-red-700 dark:text-red-300"
                            : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      {video.status}
                    </span>
                    <span className="text-xs text-black/50 dark:text-white/50">{formatDateTime(video.createdAt)}</span>
                  </div>
                  {video.post && <p className="break-words">{video.post.caption}</p>}
                  {video.error && <p className="break-words text-xs text-red-600 dark:text-red-400">{video.error}</p>}
                  {video.post && (
                    <Link href="/posts" className="text-xs underline">
                      Open in Posts →
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StyleName({ initial, onSave }: { initial: string; onSave: (name: string) => Promise<Response> }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initial);

  if (!editing) {
    return (
      <h1 className="text-2xl font-semibold">
        {initial}{" "}
        <button
          type="button"
          onClick={() => {
            setName(initial);
            setEditing(true);
          }}
          className="align-middle text-sm font-normal text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white"
          title="Rename"
        >
          ✎
        </button>
      </h1>
    );
  }

  async function save() {
    if (!name.trim()) return;
    const res = await onSave(name.trim());
    if (res.ok) setEditing(false);
  }

  return (
    <div className="flex items-center gap-2">
      <input
        value={name}
        autoFocus
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") setEditing(false);
        }}
        className={`${input} w-64 text-lg`}
      />
      <button type="button" onClick={save} className={primaryButton}>
        Save
      </button>
      <button type="button" onClick={() => setEditing(false)} className={secondaryButton}>
        Cancel
      </button>
    </div>
  );
}

/**
 * "Titles": the title is the label of the audio track picked for each video.
 * On-Screen / Off-Screen — print it on the video or not.
 * Caption / No Caption — use it as the TikTok post's caption or post with none.
 */
function TitlesSection({
  titleOnScreen,
  titleAsCaption,
  hasAudio,
  onChange,
}: {
  titleOnScreen: boolean;
  titleAsCaption: boolean;
  hasAudio: boolean;
  onChange: (data: { titleOnScreen?: boolean; titleAsCaption?: boolean }) => unknown;
}) {
  return (
    <section className={`${card} space-y-4 p-5`}>
      <div>
        <h2 className="font-medium">Titles</h2>
        <p className="text-xs text-black/50 dark:text-white/50">
          A video&apos;s title is the label of the audio track used in it (set each track&apos;s label under Audio).
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-24 text-xs text-black/60 dark:text-white/60">On the video</span>
        <button type="button" onClick={() => !titleOnScreen && onChange({ titleOnScreen: true })} className={pill(titleOnScreen)}>
          On-Screen
        </button>
        <button type="button" onClick={() => titleOnScreen && onChange({ titleOnScreen: false })} className={pill(!titleOnScreen)}>
          Off-Screen
        </button>
        <span className="text-xs text-black/50 dark:text-white/50">
          {titleOnScreen ? "The title is printed on the video." : "No title is printed on the video."}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-24 text-xs text-black/60 dark:text-white/60">TikTok post</span>
        <button type="button" onClick={() => !titleAsCaption && onChange({ titleAsCaption: true })} className={pill(titleAsCaption)}>
          Caption
        </button>
        <button type="button" onClick={() => titleAsCaption && onChange({ titleAsCaption: false })} className={pill(!titleAsCaption)}>
          No Caption
        </button>
        <span className="text-xs text-black/50 dark:text-white/50">
          {titleAsCaption ? "The TikTok post is captioned with the title." : "The TikTok post has no caption."}
        </span>
      </div>
      {!hasAudio && (titleOnScreen || titleAsCaption) && (
        <p className="text-xs text-amber-700 dark:text-amber-300">Upload an audio track — without one, videos have no title.</p>
      )}
    </section>
  );
}

/**
 * Two linked sliders: how long each image/clip is on screen before fading, and
 * how long each fade lasts. Together they set how many fit in a 12s video.
 * Each saves (debounced) on its own; the clip count updates live.
 */
function TimingSliders({
  initialHold,
  initialFade,
  noun,
  onSave,
}: {
  initialHold: number;
  initialFade: number;
  noun: string;
  onSave: (data: { secondsPerImage?: number; crossfadeSec?: number }) => unknown;
}) {
  const [hold, setHold] = useState(initialHold);
  const [fade, setFade] = useState(initialFade);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const pending = timers.current;
    return () => Object.values(pending).forEach(clearTimeout);
  }, []);

  function debounce(key: "secondsPerImage" | "crossfadeSec", value: number) {
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => onSave({ [key]: value }), 400);
  }

  const one = noun === "clips" ? "clip" : "image";
  const count = segmentCountFor(hold, fade);

  return (
    <div className="space-y-4">
      <div>
        <label className={label} htmlFor="seconds-per-image">
          Seconds per {one} before fading: {hold.toFixed(2)}s
        </label>
        <input
          id="seconds-per-image"
          type="range"
          min={MIN_SECONDS_PER_IMAGE}
          max={MAX_SECONDS_PER_IMAGE}
          step={0.05}
          value={hold}
          onChange={(e) => {
            const v = Number(e.target.value);
            setHold(v);
            debounce("secondsPerImage", v);
          }}
          className="w-full accent-baby-strong"
        />
      </div>
      <div>
        <label className={label} htmlFor="fade-duration">
          Fade into the next {one}: {fade.toFixed(2)}s
        </label>
        <input
          id="fade-duration"
          type="range"
          min={MIN_CROSSFADE_SEC}
          max={MAX_CROSSFADE_SEC}
          step={0.01}
          value={fade}
          onChange={(e) => {
            const v = Number(e.target.value);
            setFade(v);
            debounce("crossfadeSec", v);
          }}
          className="w-full accent-baby-strong"
        />
        <p className="text-[11px] text-black/40 dark:text-white/40">
          Videos run at {FPS} frames per second, so fades are rounded to whole frames (0.04s each); under 0.02s is a straight cut.
        </p>
      </div>
      <p className="rounded-lg bg-baby-soft px-3 py-2 text-sm">
        <strong>
          {count} {count === 1 ? one : noun} per video
        </strong>
        <span className="text-xs text-black/60 dark:text-white/60">
          {" "}
          — each on screen for {hold.toFixed(2)}s, then a {fade.toFixed(2)}s fade into the next ({TOTAL_DURATION_SEC}s total)
        </span>
      </p>
    </div>
  );
}

function DeleteThumbButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white hover:bg-red-600"
      aria-label="Remove from template"
      title="Remove from template"
    >
      ✕
    </button>
  );
}

function parseClipStartsClient(json: string): number[] {
  try {
    const value = JSON.parse(json);
    return Array.isArray(value) ? value.filter((n): n is number => typeof n === "number") : [];
  } catch {
    return [];
  }
}

/** Library item ids already used by a template section. */
function libraryIds(rows: { libraryItemId: string | null }[]): Set<string> {
  return new Set(rows.map((r) => r.libraryItemId).filter((id): id is string => !!id));
}

function UploadSection({
  title,
  hint,
  accept,
  uploadUrl,
  field,
  count,
  onUploaded,
  library,
  children,
}: {
  title: string;
  hint: string;
  accept: string;
  uploadUrl: string;
  field: string;
  count: number;
  onUploaded: () => void;
  library: { styleId: string; kind: LibraryKind; existingIds: Set<string> };
  children: React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [picking, setPicking] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [failures, setFailures] = useState<UploadFailure[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);

  async function onFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (inputRef.current) inputRef.current.value = "";
    if (files.length === 0) return;
    setFailures([]);
    setSkippedCount(0);
    const result = await uploadInChunks(uploadUrl, field, files, (done, total) => setProgress({ done, total }));
    setProgress(null);
    setFailures(result.failed);
    setSkippedCount(result.skipped);
    onUploaded();
  }

  return (
    <section className={`${card} p-5`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-medium">
            {title} <span className="text-sm font-normal text-black/40 dark:text-white/40">({count})</span>
          </h2>
          <p className="text-xs text-black/50 dark:text-white/50">{hint}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setPicking((p) => !p)} className={secondaryButton}>
            Add from library
          </button>
          <input ref={inputRef} type="file" multiple accept={accept} className="hidden" onChange={(e) => onFiles(e.target.files)} />
          <button type="button" onClick={() => inputRef.current?.click()} disabled={!!progress} className={secondaryButton}>
            {progress ? `Uploading ${progress.done}/${progress.total}…` : "Upload"}
          </button>
        </div>
      </div>
      {picking && (
        <LibraryPicker
          styleId={library.styleId}
          kind={library.kind}
          existingIds={library.existingIds}
          onAdded={onUploaded}
          onClose={() => setPicking(false)}
        />
      )}
      {skippedCount > 0 && (
        <p className="mb-4 rounded-lg bg-baby-soft px-3 py-2 text-xs">
          {skippedCount} duplicate clip{skippedCount === 1 ? " was" : "s were"} skipped — already in your library.
        </p>
      )}
      {failures.length > 0 && (
        <ul className="mb-4 space-y-1 rounded-lg bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300">
          {failures.map((f, i) => (
            <li key={`${f.filename}-${i}`}>
              <strong>{f.filename}</strong>: {f.error}
            </li>
          ))}
        </ul>
      )}
      {count === 0 ? <p className="text-sm text-black/40 dark:text-white/40">Nothing here yet — upload or add from your library.</p> : children}
    </section>
  );
}

function AudioRow({ audio, base, onDelete }: { audio: StyleAudio; base: string; onDelete: () => void }) {
  const fallback = audio.filename.replace(/\.[^.]+$/, "");
  const [value, setValue] = useState(audio.postCaption ?? "");
  const [saved, setSaved] = useState(audio.postCaption ?? "");

  async function save() {
    if (value.trim() === saved) return;
    const res = await fetch(`${base}/audio/${audio.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postCaption: value }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSaved(updated.postCaption ?? "");
      setValue(updated.postCaption ?? "");
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{audio.filename}</p>
        <p className="text-xs text-black/50 dark:text-white/50">{audio.durationSec.toFixed(1)}s</p>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <span className="text-black/50 dark:text-white/50">On-screen label:</span>
        <input
          value={value}
          placeholder={fallback}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className={`${input} w-48`}
        />
      </label>
      <audio src={audio.url} controls preload="none" className="h-8 w-48" />
      <button type="button" onClick={onDelete} className="text-sm text-red-600 hover:underline dark:text-red-400" title="Remove from template">
        Remove
      </button>
      {audio.libraryItem && (
        <div className="w-full">
          <AudioTimestamps
            itemId={audio.libraryItem.id}
            audioUrl={audio.url}
            durationSec={audio.libraryItem.durationSec ?? audio.durationSec}
            initialStarts={parseClipStartsClient(audio.libraryItem.clipStarts)}
          />
        </div>
      )}
    </li>
  );
}

function CaptionsSection({
  base,
  styleId,
  captions,
  onChanged,
}: {
  base: string;
  styleId: string;
  captions: StyleCaption[];
  onChanged: () => void;
}) {
  const [text, setText] = useState("");
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch(`${base}/captions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not add caption");
      return;
    }
    setText("");
    onChanged();
  }

  return (
    <section className={`${card} p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-medium">
            Captions <span className="text-sm font-normal text-black/40 dark:text-white/40">({captions.length})</span>
          </h2>
          <p className="text-xs text-black/50 dark:text-white/50">
            One is picked at random per generated video — burned into the video as on-screen text.
          </p>
        </div>
        <button type="button" onClick={() => setPicking((p) => !p)} className={secondaryButton}>
          Add from library
        </button>
      </div>
      {picking && (
        <div className="mt-4">
          <LibraryPicker
            styleId={styleId}
            kind="CAPTION"
            existingIds={libraryIds(captions)}
            onAdded={onChanged}
            onClose={() => setPicking(false)}
          />
        </div>
      )}
      <form onSubmit={add} className="mt-4 flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a caption…" className={input} />
        <button type="submit" disabled={!text.trim()} className={primaryButton}>
          Add
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <ul className="mt-4 divide-y divide-black/10 dark:divide-white/10">
        {captions.map((caption) => (
          <CaptionRow key={caption.id} caption={caption} base={base} onChanged={onChanged} />
        ))}
      </ul>
    </section>
  );
}

function CaptionRow({ caption, base, onChanged }: { caption: StyleCaption; base: string; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(caption.text);

  async function save() {
    if (!text.trim()) return;
    const res = await fetch(`${base}/captions/${caption.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (res.ok) {
      setEditing(false);
      onChanged();
    }
  }

  async function remove() {
    const res = await fetch(`${base}/captions/${caption.id}`, { method: "DELETE" });
    if (res.ok) onChanged();
  }

  return (
    <li className="flex items-center gap-3 py-2 text-sm">
      {editing ? (
        <>
          <input
            value={text}
            autoFocus
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
            className={input}
          />
          <button type="button" onClick={save} className="text-sm underline">
            Save
          </button>
          <button type="button" onClick={() => setEditing(false)} className="text-sm text-black/50 dark:text-white/50">
            Cancel
          </button>
        </>
      ) : (
        <>
          <span className="flex-1 break-words">{caption.text}</span>
          <button
            type="button"
            onClick={() => {
              setText(caption.text);
              setEditing(true);
            }}
            className="text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white"
            title="Edit"
          >
            ✎
          </button>
          <button type="button" onClick={remove} className="text-black/40 hover:text-red-600 dark:text-white/40" title="Remove from template">
            ✕
          </button>
        </>
      )}
    </li>
  );
}
