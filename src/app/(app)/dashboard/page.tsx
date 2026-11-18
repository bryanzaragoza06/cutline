import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { card } from "@/components/ui";
import LocalTime from "@/components/LocalTime";
import StatusBadge from "@/components/StatusBadge";
import NewAccountsCount from "@/components/NewAccountsCount";

export const dynamic = "force-dynamic";

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const [accountCount, recentlyConnected, publishedCount, upcoming, recent] = await Promise.all([
    prisma.account.count({ where: { userId } }),
    // The last 9 days covers "today" and "this week" in any timezone; the
    // client counts against its own calendar.
    prisma.account.findMany({
      where: { userId, connectedAt: { gte: hoursAgo(9 * 24) } },
      select: { connectedAt: true },
    }),
    prisma.schedule.count({ where: { status: "POSTED", account: { userId } } }),
    prisma.schedule.findMany({
      where: { status: "PENDING", account: { userId } },
      orderBy: { scheduledAt: "asc" },
      take: 8,
      include: {
        post: { select: { caption: true } },
        account: { select: { displayName: true } },
      },
    }),
    prisma.schedule.findMany({
      where: { status: { in: ["POSTED", "FAILED"] }, account: { userId } },
      orderBy: { postedAt: "desc" },
      take: 6,
      include: {
        post: { select: { caption: true } },
        account: { select: { displayName: true } },
      },
    }),
  ]);

  const connectedAt = recentlyConnected.map((a) => a.connectedAt.toISOString());
  const stats: { label: string; value: React.ReactNode; href: string }[] = [
    { label: "Connected accounts", value: accountCount, href: "/accounts" },
    {
      label: "New accounts today",
      value: <NewAccountsCount period="today" connectedAt={connectedAt} />,
      href: "/accounts",
    },
    {
      label: "New accounts this week",
      value: <NewAccountsCount period="week" connectedAt={connectedAt} />,
      href: "/accounts",
    },
    { label: "Videos posted", value: publishedCount, href: "/posts" },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className={`${card} p-5 transition-colors hover:border-baby-strong hover:bg-baby-soft`}>
            <div className="text-3xl font-semibold">{stat.value}</div>
            <div className="mt-1 text-sm text-black/60 dark:text-white/60">{stat.label}</div>
          </Link>
        ))}
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className={`${card} p-5 text-sm text-black/50 dark:text-white/50`}>Nothing scheduled.</p>
        ) : (
          <ul className={`${card} divide-y divide-black/10 dark:divide-white/10`}>
            {upcoming.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium">{s.post.caption}</span>
                <span className="text-black/60 dark:text-white/60">→ {s.account.displayName}</span>
                <span className="text-black/60 dark:text-white/60">
                  <LocalTime value={s.scheduledAt} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Recent activity</h2>
        {recent.length === 0 ? (
          <p className={`${card} p-5 text-sm text-black/50 dark:text-white/50`}>No posts published yet.</p>
        ) : (
          <ul className={`${card} divide-y divide-black/10 dark:divide-white/10`}>
            {recent.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                <StatusBadge status={s.status} />
                <span className="min-w-0 flex-1 truncate">{s.post.caption}</span>
                <span className="text-black/60 dark:text-white/60">{s.account.displayName}</span>
                {s.postedAt && (
                  <span className="text-black/60 dark:text-white/60">
                    <LocalTime value={s.postedAt} />
                  </span>
                )}
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
