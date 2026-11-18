import type { PostStatus, ScheduleStatus } from "@/lib/types";

const STYLES: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-black/5 text-black/70 dark:bg-white/10 dark:text-white/70" },
  SCHEDULED: { label: "Scheduled", className: "bg-blue-500/10 text-blue-700 dark:text-blue-300" },
  PARTIALLY_POSTED: { label: "Partially posted", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  POSTED: { label: "Posted", className: "bg-green-500/15 text-green-700 dark:text-green-300" },
  FAILED: { label: "Failed", className: "bg-red-500/15 text-red-700 dark:text-red-300" },
  PENDING: { label: "Pending", className: "bg-blue-500/10 text-blue-700 dark:text-blue-300" },
  PROCESSING: { label: "Processing", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
};

export default function StatusBadge({ status }: { status: PostStatus | ScheduleStatus }) {
  const style = STYLES[status] ?? STYLES.DRAFT;
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${style.className}`}>{style.label}</span>;
}
