"use client";

import { useEffect, useRef, useState } from "react";
import { useFetchJson } from "@/lib/useFetchJson";
import { TOTAL_DURATION_SEC } from "@/lib/videoConstants";

/** Starts playback of an audio element at `time` (kept outside the component: it mutates the DOM element). */
function playFrom(el: HTMLAudioElement, time: number): Promise<void> {
  el.currentTime = time;
  return el.play();
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Waveform with draggable 12-second windows. Each window is a clip start the
 * generator can use for this song; none = a random 12 seconds.
 */
export default function AudioTimestamps({
  itemId,
  audioUrl,
  durationSec,
  initialStarts,
}: {
  itemId: string;
  audioUrl: string;
  durationSec: number;
  initialStarts: number[];
}) {
  const { data: waveform, error: waveformError } = useFetchJson<{ peaks: number[] }>(`/api/library/${itemId}/waveform`);
  const [starts, setStarts] = useState<number[]>(initialStarts);
  const [status, setStatus] = useState<string | null>(null);
  const [playing, setPlaying] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ index: number; startX: number; startValue: number } | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const maxStart = Math.max(0, durationSec - TOTAL_DURATION_SEC);
  const windowPct = Math.min(100, (TOTAL_DURATION_SEC / Math.max(durationSec, 0.001)) * 100);
  const tooShort = durationSec <= TOTAL_DURATION_SEC;

  useEffect(
    () => () => {
      if (stopTimer.current) clearTimeout(stopTimer.current);
      audioRef.current?.pause();
    },
    [],
  );

  async function save(next: number[]) {
    setStatus("Saving…");
    const res = await fetch(`/api/library/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clipStarts: next }),
    });
    setStatus(res.ok ? "Saved" : "Couldn't save — try again");
  }

  function add() {
    // Place the new window right after the last one (or at the start).
    const last = starts.length ? starts[starts.length - 1] : -TOTAL_DURATION_SEC;
    const next = [...starts, Math.min(maxStart, Math.max(0, last + TOTAL_DURATION_SEC))];
    setStarts(next);
    save(next);
  }

  function remove(index: number) {
    if (playing === index) stopPreview();
    const next = starts.filter((_, i) => i !== index);
    setStarts(next);
    save(next);
  }

  function onPointerDown(e: React.PointerEvent, index: number) {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { index, startX: e.clientX, startValue: starts[index] };
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    const width = trackRef.current?.clientWidth ?? 0;
    if (!d || !width) return;
    const deltaSec = ((e.clientX - d.startX) / width) * durationSec;
    const value = Math.round(Math.min(maxStart, Math.max(0, d.startValue + deltaSec)) * 10) / 10;
    setStarts((prev) => prev.map((s, i) => (i === d.index ? value : s)));
  }

  function onPointerUp() {
    if (!drag.current) return;
    drag.current = null;
    save(starts);
  }

  function stopPreview() {
    if (stopTimer.current) clearTimeout(stopTimer.current);
    audioRef.current?.pause();
    setPlaying(null);
  }

  function preview(index: number) {
    if (playing === index) {
      stopPreview();
      return;
    }
    stopPreview();
    if (!audioRef.current) return;
    playFrom(audioRef.current, starts[index]).catch(() => setPlaying(null));
    setPlaying(index);
    stopTimer.current = setTimeout(stopPreview, TOTAL_DURATION_SEC * 1000);
  }

  if (tooShort) {
    return <p className="text-xs text-black/50 dark:text-white/50">This song is 12 seconds or shorter, so the whole song is used.</p>;
  }

  return (
    <div className="space-y-2">
      <audio ref={audioRef} src={audioUrl} preload="none" className="hidden" />
      <div
        ref={trackRef}
        className="relative h-14 w-full select-none overflow-hidden rounded-lg bg-black/5 dark:bg-white/5"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {waveform ? (
          <svg viewBox={`0 0 ${waveform.peaks.length} 100`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
            {waveform.peaks.map((p, i) => {
              const h = Math.max(2, p);
              return <rect key={i} x={i} y={(100 - h) / 2} width={0.7} height={h} className="fill-baby-strong/70" />;
            })}
          </svg>
        ) : (
          <p className="absolute inset-0 flex items-center justify-center text-xs text-black/40 dark:text-white/40">
            {waveformError ? "Couldn't load the waveform" : "Loading waveform…"}
          </p>
        )}
        {starts.map((start, i) => (
          <div
            key={i}
            role="slider"
            aria-label={`Timestamp ${i + 1}`}
            aria-valuemin={0}
            aria-valuemax={maxStart}
            aria-valuenow={start}
            tabIndex={0}
            onPointerDown={(e) => onPointerDown(e, i)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
              e.preventDefault();
              const step = e.shiftKey ? 5 : 1;
              const value = Math.min(maxStart, Math.max(0, start + (e.key === "ArrowRight" ? step : -step)));
              const next = starts.map((s, j) => (j === i ? value : s));
              setStarts(next);
              save(next);
            }}
            className="absolute top-0 flex h-full cursor-grab touch-none items-start justify-center rounded border-2 border-baby-strong bg-baby/35 active:cursor-grabbing"
            style={{ left: `${(start / durationSec) * 100}%`, width: `${windowPct}%` }}
            title={`${formatTime(start)}–${formatTime(start + TOTAL_DURATION_SEC)} — drag to move`}
          >
            <span className="mt-0.5 rounded bg-baby-strong px-1 text-[10px] font-semibold text-black">{i + 1}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={add}
          className="rounded-full border border-baby-strong bg-surface px-3 py-1 text-xs font-medium hover:bg-baby-soft"
        >
          + Add timestamp
        </button>
        {starts.map((start, i) => (
          <span key={i} className="flex items-center gap-1 rounded-full bg-baby-soft px-2 py-1 text-xs">
            <strong>{i + 1}</strong> {formatTime(start)}–{formatTime(start + TOTAL_DURATION_SEC)}
            <button
              type="button"
              onClick={() => preview(i)}
              className="px-1 hover:text-black dark:hover:text-white"
              aria-label={playing === i ? "Stop preview" : "Preview this clip"}
              title={playing === i ? "Stop" : "Preview this clip"}
            >
              {playing === i ? "■" : "▶"}
            </button>
            <button
              type="button"
              onClick={() => remove(i)}
              className="px-1 text-black/50 hover:text-red-600 dark:text-white/50"
              aria-label="Remove timestamp"
              title="Remove"
            >
              ✕
            </button>
          </span>
        ))}
        <span className="text-xs text-black/50 dark:text-white/50">
          {starts.length === 0 ? "No timestamps — a random 12 seconds is used." : "One of these is picked at random per video."}
          {status && ` · ${status}`}
        </span>
      </div>
    </div>
  );
}
