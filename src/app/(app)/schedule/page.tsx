import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { card, primaryButton } from "@/components/ui";
import LocalTime from "@/components/LocalTime";
import StatusBadge from "@/components/StatusBadge";
import CancelScheduleButton from "@/components/CancelScheduleButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Schedule · Cutline" };

export default async function SchedulePage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const include = {
    post: { select: { caption: true, title: true } },
    account: { select: { displayName: true } },
  } as const;

  const [upcoming, past] = await Promise.all([
    prisma.schedule.findMany({
      where: { status: { in: ["PENDING", "PROCESSING"] }, account: { userId } },
      orderBy: { scheduledAt: "asc" },
      include,
    }),
    prisma.schedule.findMany({
      where: { status: { in: ["POSTED", "FAILED"] }, account: { userId } },
      orderBy: { scheduledAt: "desc" },
      take: 30,
      include,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Schedule</h1>
          <p className="mt-1 max-w-2xl text-sm text-black/60 dark:text-white/60">
            Every post you&apos;ve scheduled, in the order it will publish. Times are shown in your local time zone. To schedule a new
            post, upload a video on the Post to TikTok page and choose Schedule.
          </p>
        </div>
        <Link href="/posts" className={primaryButton}>
          Schedule a post
        </Link>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Upcoming ({upcoming.length})</h2>
        {upcoming.length === 0 ? (
          <p className={`${card} p-5 text-sm text-black/50 dark:text-white/50`}>Nothing scheduled yet.</p>
        ) : (
          <ul className={`${card} divide-y divide-black/10 dark:divide-white/10`}>
            {upcoming.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                <span className="w-44 shrink-0 font-medium">
                  <LocalTime value={s.scheduledAt.toISOString()} />
                </span>
                <span className="min-w-0 flex-1 truncate">{s.title ?? s.post.title ?? s.post.caption}</span>
                <span className="text-black/60 dark:text-white/60">→ {s.account.displayName}</span>
                <StatusBadge status={s.status} />
                {s.status === "PENDING" && <CancelScheduleButton scheduleId={s.id} />}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Past</h2>
        {past.length === 0 ? (
          <p className={`${card} p-5 text-sm text-black/50 dark:text-white/50`}>Nothing has posted from a schedule yet.</p>
        ) : (
          <ul className={`${card} divide-y divide-black/10 dark:divide-white/10`}>
            {past.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                <span className="w-44 shrink-0 text-black/70 dark:text-white/70">
                  <LocalTime value={s.scheduledAt.toISOString()} />
                </span>
                <span className="min-w-0 flex-1 truncate">{s.title ?? s.post.title ?? s.post.caption}</span>
                <span className="text-black/60 dark:text-white/60">{s.account.displayName}</span>
                <StatusBadge status={s.status} />
                {s.status === "FAILED" && s.error && (
                  <span className="w-full truncate text-xs text-red-600 dark:text-red-400">{s.error}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
