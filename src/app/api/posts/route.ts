import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma, SAFE_ACCOUNT_SELECT } from "@/lib/prisma";

// GET /api/posts — the user's posts (generated videos), newest first, with schedules.
export async function GET() {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  const posts = await prisma.post.findMany({
    where: { bucket: { userId: auth.userId } },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      schedules: { orderBy: { scheduledAt: "asc" }, include: { account: { select: SAFE_ACCOUNT_SELECT } } },
    },
  });
  return NextResponse.json(posts);
}
