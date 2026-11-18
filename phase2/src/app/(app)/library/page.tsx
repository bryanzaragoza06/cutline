"use client";

import { useRef, useState } from "react";
import type { LibraryItem, LibraryKind } from "@/lib/types";
import { useFetchJson } from "@/lib/useFetchJson";
import { uploadInChunks, type UploadFailure } from "@/lib/chunkedUpload";
import { card, input, primaryButton, secondaryButton } from "@/components/ui";
import LibraryThumb from "@/components/LibraryThumb";

const SECTIONS: { kind: LibraryKind; title: string; hint: string; field?: string; accept?: string }[] = [
  { kind: "IMAGE", title: "Images", hint: "JPEG, PNG or WebP. Large photos are downscaled.", field: "images", accept: "image/jpeg,image/png,image/webp" },
  {
    kind: "VIDEO",
    title: "Video clips",
    hint: "MP4, MOV, WebM or M4V.",
    field: "videos",
    accept: "video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm,.m4v",
  },
  {
    kind: "AUDIO",
    title: "Audio",
    hint: "MP3 or WAV. The label is the default title when you add a track to a template.",
    field: "audio",
    accept: "audio/mpeg,audio/wav,audio/x-wav,.mp3,.wav",
  },
  { kind: "CAPTION", title: "Captions", hint: "Reusable on-screen captions for your templates." },
];

export default function LibraryPage() {
  const { data: items, reload } = useFetchJson<LibraryItem[]>("/api/library");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Library</h1>
        <p className="mt-1 max-w-2xl text-sm text-black/60 dark:text-white/60">
          Everything you&apos;ve uploaded, in one place. Anything uploaded to a template lands here too, and you can add library
          media to any template from its page in Video Studio.
        </p>
      </div>
      {items === null ? (
        <p className="text-sm text-black/50 dark:text-white/50">Loading…</p>
      ) : (
        SECTIONS.map((section) => (
          <LibrarySection key={section.kind} section={section} items={items.filter((i) => i.kind === section.kind)} onChanged={reload} />
        ))
      )}
    </div>
  );
}

function LibrarySection({
  section,
  items,
  onChanged,
}: {
  section: (typeof SECTIONS)[number];
  items: LibraryItem[];
  onChanged: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [failures, setFailures] = useState<UploadFailure[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [captionText, setCaptionText] = useState("");
  const isMedia = section.kind === "IMAGE" || section.kind === "VIDEO";

  async function onFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (inputRef.current) inputRef.current.value = "";
    if (!files.length || !section.field) return;
    setFailures([]);
    setSkippedCount(0);
    const result = await uploadInChunks("/api/library", section.field, files, (done, total) => setProgress({ done, total }));
    setProgress(null);
    setFailures(result.failed);
    setSkippedCount(result.skipped);
    onChanged();
  }

  async function addCaption(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/library/captions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: captionText }),
    });
    if (res.ok) {
      setCaptionText("");
      onChanged();
    }
  }

  async function remove(item: LibraryItem) {
    const where = item.usedIn ? ` It will also be removed from ${item.usedIn} template${item.usedIn === 1 ? "" : "s"}.` : "";
    if (!confirm(`Delete this from your library?${where}`)) return;
    const res = await fetch(`/api/library/${item.id}`, { method: "DELETE" });
    if (res.ok) onChanged();
  }

  return (
    <section className={`${card} p-5`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-medium">
            {section.title} <span className="text-sm font-normal text-black/40 dark:text-white/40">({items.length})</span>
          </h2>
          <p className="text-xs text-black/50 dark:text-white/50">{section.hint}</p>
        </div>
        {section.field && (
          <div>
            <input ref={inputRef} type="file" multiple accept={section.accept} className="hidden" onChange={(e) => onFiles(e.target.files)} />
            <button type="button" onClick={() => inputRef.current?.click()} disabled={!!progress} className={secondaryButton}>
              {progress ? `Uploading ${progress.done}/${progress.total}…` : "Upload"}
            </button>
          </div>
        )}
      </div>

      {section.kind === "CAPTION" && (
        <form onSubmit={addCaption} className="mb-4 flex gap-2">
          <input value={captionText} onChange={(e) => setCaptionText(e.target.value)} placeholder="Add a caption…" className={input} />
          <button type="submit" disabled={!captionText.trim()} className={primaryButton}>
            Add
          </button>
        </form>
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

      {items.length === 0 ? (
        <p className="text-sm text-black/40 dark:text-white/40">Nothing here yet.</p>
      ) : isMedia ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {items.map((item) => (
            <div key={item.id} className="group relative">
              <LibraryThumb item={item} />
              <UsedIn count={item.usedIn} />
              <button
                type="button"
                onClick={() => remove(item)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white hover:bg-red-600"
                aria-label="Delete from library"
                title="Delete from library"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-black/10 dark:divide-white/10">
          {items.map((item) => (
            <TextItemRow key={item.id} item={item} onChanged={onChanged} onDelete={() => remove(item)} />
          ))}
        </ul>
      )}
    </section>
  );
}

function UsedIn({ count }: { count: number }) {
  return (
    <span className="mt-1 block text-[11px] text-black/50 dark:text-white/50">
      {count ? `In ${count} template${count === 1 ? "" : "s"}` : "Not in a template"}
    </span>
  );
}

/** Audio track or caption row with an inline editor for the label / text. */
function TextItemRow({ item, onChanged, onDelete }: { item: LibraryItem; onChanged: () => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.text ?? "");

  async function save() {
    const res = await fetch(`/api/library/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (res.ok) {
      setEditing(false);
      onChanged();
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            value={text}
            autoFocus
            placeholder={item.kind === "AUDIO" ? (item.filename ?? "") : "Caption text"}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
            className={input}
          />
        ) : (
          <LibraryThumb item={item} />
        )}
        <UsedIn count={item.usedIn} />
      </div>
      {item.kind === "AUDIO" && item.url && !editing && <audio src={item.url} controls preload="none" className="h-8 w-48" />}
      {editing ? (
        <>
          <button type="button" onClick={save} className="text-sm underline">
            Save
          </button>
          <button type="button" onClick={() => setEditing(false)} className="text-sm text-black/50 dark:text-white/50">
            Cancel
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => {
            setText(item.text ?? "");
            setEditing(true);
          }}
          className="text-sm text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
          title={item.kind === "AUDIO" ? "Edit default label" : "Edit caption"}
        >
          ✎
        </button>
      )}
      <button type="button" onClick={onDelete} className="text-sm text-red-600 hover:underline dark:text-red-400">
        Delete
      </button>
    </li>
  );
}
