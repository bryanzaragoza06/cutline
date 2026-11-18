"use client";

import { useState } from "react";
import Link from "next/link";
import type { LibraryItem, LibraryKind } from "@/lib/types";
import { useFetchJson } from "@/lib/useFetchJson";
import { primaryButton, secondaryButton } from "@/components/ui";
import LibraryThumb from "@/components/LibraryThumb";

const NOUN: Record<LibraryKind, string> = { IMAGE: "images", VIDEO: "video clips", AUDIO: "audio tracks", CAPTION: "captions" };

/** Pick existing library media of one kind and add it to a template. */
export default function LibraryPicker({
  styleId,
  kind,
  existingIds,
  onAdded,
  onClose,
}: {
  styleId: string;
  kind: LibraryKind;
  existingIds: Set<string>;
  onAdded: () => void;
  onClose: () => void;
}) {
  const { data: items } = useFetchJson<LibraryItem[]>(`/api/library?kind=${kind}`);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMedia = kind === "IMAGE" || kind === "VIDEO";

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function add() {
    setAdding(true);
    setError(null);
    const res = await fetch(`/api/video-studio/styles/${styleId}/library`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemIds: [...selected] }),
    });
    setAdding(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't add those items");
      return;
    }
    onAdded();
    onClose();
  }

  const available = (items ?? []).filter((i) => !existingIds.has(i.id));

  return (
    <div className="mb-4 rounded-lg border border-baby-strong/60 bg-baby-soft/50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Add {NOUN[kind]} from your library</p>
        <button type="button" onClick={onClose} className="text-sm text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white">
          Close
        </button>
      </div>

      {items === null ? (
        <p className="text-sm text-black/50 dark:text-white/50">Loading…</p>
      ) : available.length === 0 ? (
        <p className="text-sm text-black/60 dark:text-white/60">
          {items.length === 0 ? `No ${NOUN[kind]} in your library yet.` : `Every ${NOUN[kind].replace(/s$/, "")} in your library is already in this template.`}{" "}
          <Link href="/library" className="underline">
            Open Library
          </Link>
        </p>
      ) : isMedia ? (
        <div className="grid max-h-80 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6">
          {available.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => toggle(item.id)}
              aria-pressed={selected.has(item.id)}
              className={`relative rounded-lg p-0.5 ${selected.has(item.id) ? "ring-2 ring-baby-strong" : "opacity-80 hover:opacity-100"}`}
            >
              <LibraryThumb item={item} />
              {selected.has(item.id) && (
                <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-baby-strong text-xs text-black">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <ul className="max-h-80 divide-y divide-black/10 overflow-y-auto dark:divide-white/10">
          {available.map((item) => (
            <li key={item.id}>
              <label className="flex cursor-pointer items-center gap-3 py-2">
                <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} />
                <LibraryThumb item={item} />
              </label>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {available.length > 0 && (
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={add} disabled={!selected.size || adding} className={primaryButton}>
            {adding ? "Adding…" : `Add ${selected.size || ""} to template`.replace("  ", " ")}
          </button>
          <button type="button" onClick={onClose} className={secondaryButton}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
