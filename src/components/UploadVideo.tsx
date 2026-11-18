"use client";

import { useRef, useState } from "react";
import type { Post } from "@/lib/types";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from "@/lib/uploadLimits";
import { TITLE_MAX } from "@/lib/postSettings";
import { card, input, label, primaryButton } from "@/components/ui";

/** Step 1 of posting: upload one of your own videos. It then appears below, ready to post or schedule. */
export default function UploadVideo({ onUploaded }: { onUploaded: (post: Post) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const uploading = progress !== null;

  function chooseFile(next: File | null) {
    setError(null);
    if (next && next.size > MAX_UPLOAD_BYTES) {
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setError(`That video is larger than ${MAX_UPLOAD_MB} MB.`);
      return;
    }
    setFile(next);
  }

  function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || uploading) return;
    setError(null);
    setProgress(0);

    const form = new FormData();
    form.append("video", file);
    form.append("caption", caption);

    // XMLHttpRequest (not fetch) so we can show upload progress.
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/posts/upload");
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
    };
    xhr.onerror = () => {
      setProgress(null);
      setError("Network error during upload — please try again.");
    };
    xhr.onload = () => {
      setProgress(null);
      let data: unknown = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // fall through to the generic error below
      }
      if (xhr.status >= 200 && xhr.status < 300 && data && typeof data === "object") {
        onUploaded(data as Post);
        setFile(null);
        setCaption("");
        if (fileRef.current) fileRef.current.value = "";
      } else {
        const message = data && typeof data === "object" && "error" in data ? String((data as { error: unknown }).error) : null;
        setError(message ?? `Upload failed (HTTP ${xhr.status})`);
      }
    };
    xhr.send(form);
  }

  return (
    <form onSubmit={upload} className={`${card} space-y-4 p-5`}>
      <div>
        <h2 className="font-medium">1. Upload a video</h2>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          MP4, MOV or WebM, up to {MAX_UPLOAD_MB} MB. Only upload videos you own or have the rights to post.
        </p>
      </div>
      <div>
        <label className={label} htmlFor="video-file">
          Video file
        </label>
        <input
          id="video-file"
          ref={fileRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
          onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-baby file:px-4 file:py-2 file:text-sm file:font-medium file:text-black"
        />
      </div>
      <div>
        <label className={label} htmlFor="upload-caption">
          Caption (optional — you can change it before posting)
        </label>
        <textarea
          id="upload-caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value.slice(0, TITLE_MAX))}
          rows={2}
          className={input}
          placeholder="Write a caption…"
        />
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={!file || uploading} className={primaryButton}>
          {uploading ? `Uploading… ${progress}%` : "Upload video"}
        </button>
        {uploading && (
          <div className="h-2 w-40 overflow-hidden rounded-full bg-black/10 dark:bg-white/10" aria-hidden>
            <div className="h-full bg-baby-strong transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
    </form>
  );
}
