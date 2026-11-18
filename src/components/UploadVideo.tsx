"use client";

import { useRef, useState } from "react";
import type { Post } from "@/lib/types";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from "@/lib/uploadLimits";
import { card } from "@/components/ui";

type Item = { id: number; name: string; progress: number; state: "waiting" | "uploading" | "done" | "error"; error?: string };

const VIDEO_TYPE = /\.(mp4|mov|webm)$/i;

/** XMLHttpRequest (not fetch) so we can show upload progress. */
function uploadOne(file: File, onProgress: (pct: number) => void): Promise<{ post?: Post; error?: string }> {
  return new Promise((resolve) => {
    const form = new FormData();
    form.append("video", file);
    form.append("caption", "");
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/posts/upload");
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) onProgress(Math.round((ev.loaded / ev.total) * 100));
    };
    xhr.onerror = () => resolve({ error: "Network error during upload — please try again." });
    xhr.onload = () => {
      let data: unknown = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // fall through to the generic error below
      }
      if (xhr.status >= 200 && xhr.status < 300 && data && typeof data === "object") {
        resolve({ post: data as Post });
      } else {
        const message = data && typeof data === "object" && "error" in data ? String((data as { error: unknown }).error) : null;
        resolve({ error: message ?? `Upload failed (HTTP ${xhr.status})` });
      }
    };
    xhr.send(form);
  });
}

/**
 * Step 1 of posting: drop in your own videos (one or many). Each appears below as
 * a ready-to-use video you can post now or schedule for later.
 */
export default function UploadVideo({ onUploaded }: { onUploaded: (post: Post) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(0);
  const busy = useRef(false);
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);

  function patch(id: number, change: Partial<Item>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...change } : item)));
  }

  async function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list).map((file) => {
      const id = nextId.current++;
      let error: string | undefined;
      if (!VIDEO_TYPE.test(file.name)) error = "Only MP4, MOV or WebM videos can be uploaded.";
      else if (file.size > MAX_UPLOAD_BYTES) error = `Larger than ${MAX_UPLOAD_MB} MB.`;
      return { file, item: { id, name: file.name, progress: 0, state: error ? "error" : "waiting", error } as Item };
    });
    if (incoming.length === 0) return;
    setItems((prev) => [...prev.filter((i) => i.state !== "done"), ...incoming.map((x) => x.item)]);

    // Upload one at a time so a big batch doesn't overwhelm the server.
    if (busy.current) return;
    busy.current = true;
    for (const { file, item } of incoming) {
      if (item.state === "error") continue;
      patch(item.id, { state: "uploading" });
      const result = await uploadOne(file, (pct) => patch(item.id, { progress: pct }));
      if (result.post) {
        patch(item.id, { state: "done", progress: 100 });
        onUploaded(result.post);
      } else {
        patch(item.id, { state: "error", error: result.error });
      }
    }
    busy.current = false;
  }

  return (
    <section className={`${card} space-y-4 p-5`}>
      <div>
        <h2 className="font-medium">1. Add your videos</h2>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Drag and drop one or more videos (MP4, MOV or WebM, up to {MAX_UPLOAD_MB} MB each). They&apos;re kept here, ready to post or
          schedule, until you post or delete them (unused videos are removed after 14 days). Only upload videos you own or have the
          rights to post.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void addFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragging ? "border-baby-strong bg-baby-soft" : "border-black/15 dark:border-white/15"
        }`}
      >
        <p className="text-sm">Drop videos here</p>
        <p className="text-xs text-black/50 dark:text-white/50">or</p>
        <label
          htmlFor="video-file"
          className="cursor-pointer rounded-lg bg-baby px-4 py-2 text-sm font-medium text-black hover:opacity-90"
        >
          Choose videos
        </label>
        <input
          id="video-file"
          ref={fileRef}
          type="file"
          multiple
          accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
          onChange={(e) => {
            if (e.target.files) void addFiles(e.target.files);
            e.target.value = "";
          }}
          className="sr-only"
        />
      </div>

      {items.length > 0 && (
        <ul className="space-y-2" aria-live="polite">
          {items.map((item) => (
            <li key={item.id} className="text-sm">
              <div className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate">{item.name}</span>
                <span className="text-xs text-black/60 dark:text-white/60">
                  {item.state === "waiting" && "Waiting…"}
                  {item.state === "uploading" && `Uploading… ${item.progress}%`}
                  {item.state === "done" && "Ready below ✓"}
                  {item.state === "error" && <span className="text-red-600 dark:text-red-400">{item.error}</span>}
                </span>
              </div>
              {item.state === "uploading" && (
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10" aria-hidden>
                  <div className="h-full bg-baby-strong transition-all" style={{ width: `${item.progress}%` }} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
