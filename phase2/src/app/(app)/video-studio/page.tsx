"use client";

import { useState } from "react";
import Link from "next/link";
import type { VideoStyleKind, VideoStyleSummary } from "@/lib/types";
import { useFetchJson } from "@/lib/useFetchJson";
import { KIND_LABELS } from "@/lib/labels";
import { card, input, label, primaryButton, secondaryButton } from "@/components/ui";

const KIND_OPTIONS: { kind: VideoStyleKind; title: string; description: string }[] = [
  { kind: "AESTHETIC_SLIDESHOW", title: "Image Slideshow", description: "Your photos with crossfades between them." },
  { kind: "VIDEO_COMPILATION", title: "Video Compilation", description: "Short random cuts from your uploaded clips." },
];

export default function VideoStudioPage() {
  const { data: styles, setData: setStyles } = useFetchJson<VideoStyleSummary[]>("/api/video-studio/styles");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<VideoStyleKind>("AESTHETIC_SLIDESHOW");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    const res = await fetch("/api/video-studio/styles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, kind }),
    });
    const data = await res.json().catch(() => ({}));
    setCreating(false);
    if (!res.ok) {
      setError(data.error ?? "Could not create style");
      return;
    }
    setStyles((prev) => [...(prev ?? []), data]);
    setName("");
    setShowCreate(false);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Video Studio</h1>
          <p className="mt-1 max-w-2xl text-sm text-black/60 dark:text-white/60">
            A video template is a pool of your images or clips, audio tracks and captions. Every generated video is a fresh 12-second
            remix: random picks, random order, random color grade.
          </p>
        </div>
        {!showCreate && (
          <button type="button" onClick={() => setShowCreate(true)} className={primaryButton}>
            + New style
          </button>
        )}
      </div>

      {showCreate && (
        <form onSubmit={create} className={`${card} space-y-4 p-5`}>
          <div>
            <label className={label} htmlFor="style-name">
              Name
            </label>
            <input id="style-name" value={name} onChange={(e) => setName(e.target.value)} className={input} required autoFocus />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {KIND_OPTIONS.map((option) => (
              <button
                key={option.kind}
                type="button"
                onClick={() => setKind(option.kind)}
                className={`rounded-xl border p-4 text-left ${
                  kind === option.kind
                    ? "border-baby-strong bg-baby-soft ring-1 ring-baby-strong"
                    : "border-black/10 hover:border-black/30 dark:border-white/10 dark:hover:border-white/30"
                }`}
              >
                <div className="font-medium">{option.title}</div>
                <div className="mt-1 text-sm text-black/60 dark:text-white/60">{option.description}</div>
              </button>
            ))}
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={creating || !name.trim()} className={primaryButton}>
              {creating ? "Creating…" : "Create style"}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className={secondaryButton}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {styles === null ? (
        <p className="text-sm text-black/50 dark:text-white/50">Loading…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {styles.map((style) => {
            const isCompilation = style.kind === "VIDEO_COMPILATION";
            const sourceCount = isCompilation ? style._count.videoClips : style._count.images;
            return (
              <Link
                key={style.id}
                href={`/video-studio/${style.id}`}
                className={`${card} block p-5 transition-colors hover:border-baby-strong hover:bg-baby-soft`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-medium">{style.name}</span>
                  <span className="shrink-0 rounded-full border border-black/15 px-2 py-0.5 text-xs dark:border-white/15">
                    {KIND_LABELS[style.kind]}
                  </span>
                </div>
                {style.description && <p className="mt-2 text-sm text-black/60 dark:text-white/60">{style.description}</p>}
                <p className="mt-3 text-xs text-black/50 dark:text-white/50">
                  {sourceCount} {isCompilation ? "clips" : "images"} · {style._count.audioClips} audio · {style._count.captions} captions ·{" "}
                  {style._count.generatedVideos} generated
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
