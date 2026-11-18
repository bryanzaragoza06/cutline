"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { secondaryButton } from "@/components/ui";

/** Cancels a pending schedule (the post itself stays in "Post to TikTok" as a draft). */
export default function CancelScheduleButton({ scheduleId }: { scheduleId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    if (!confirm("Cancel this scheduled post? The video stays in Post to TikTok and can be scheduled again.")) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/schedules/${scheduleId}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't cancel");
      return;
    }
    router.refresh();
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={cancel} disabled={busy} className={`${secondaryButton} px-3 py-1 text-xs`}>
        {busy ? "Cancelling…" : "Cancel"}
      </button>
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </span>
  );
}
