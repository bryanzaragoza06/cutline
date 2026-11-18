"use client";

import type { LibraryItem } from "@/lib/types";
import { previewSrc } from "@/lib/format";

/** Compact visual for a library item: image/clip thumbnail, or a text row for audio/captions. */
export default function LibraryThumb({ item }: { item: LibraryItem }) {
  if (item.kind === "IMAGE" && item.url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.url} alt={item.filename ?? ""} loading="lazy" className="aspect-square w-full rounded-lg object-cover" />;
  }
  if (item.kind === "VIDEO" && item.url) {
    return (
      <div className="relative">
        <video src={previewSrc(item.url)} muted playsInline preload="metadata" className="aspect-square w-full rounded-lg bg-black object-cover" />
        {item.durationSec != null && (
          <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 text-[10px] text-white">{item.durationSec.toFixed(1)}s</span>
        )}
      </div>
    );
  }
  if (item.kind === "AUDIO") {
    return (
      <div className="min-w-0">
        <p className="truncate text-sm">{item.text || item.filename}</p>
        <p className="truncate text-xs text-black/50 dark:text-white/50">
          {item.filename}
          {item.durationSec != null && ` · ${item.durationSec.toFixed(1)}s`}
        </p>
      </div>
    );
  }
  return <p className="break-words text-sm">{item.text}</p>;
}
