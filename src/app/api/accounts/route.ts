import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma, SAFE_ACCOUNT_SELECT } from "@/lib/prisma";

// The user's connected TikTok accounts (never including tokens).
export async function GET() {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  const accounts = await prisma.account.findMany({
    where: { userId: auth.userId },
    orderBy: { connectedAt: "asc" },
    select: SAFE_ACCOUNT_SELECT,
  });

  const posted = await prisma.schedule.groupBy({
    by: ["accountId"],
    where: { status: "POSTED", account: { userId: auth.userId } },
    _count: true,
    _max: { postedAt: true },
  });
  const postedCount = new Map(posted.map((p) => [p.accountId, p._count]));
  const lastPublishedAt = new Map(posted.map((p) => [p.accountId, p._max.postedAt]));

  return NextResponse.json(
    accounts.map((account) => ({
      ...account,
      // Phase 2 fields (video templates, posting cycles) stay empty until automation is switched on.
      styleLinks: [],
      postingSchedule: null,
      nextDueAt: null,
      postedCount: postedCount.get(account.id) ?? 0,
      lastPublishedAt: lastPublishedAt.get(account.id) ?? null,
    })),
  );
}
