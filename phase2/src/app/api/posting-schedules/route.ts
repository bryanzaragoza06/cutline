import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";

// GET — the user's master posting schedules, with how many accounts use each.
export async function GET() {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  const schedules = await prisma.postingSchedule.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { accounts: true } } },
  });
  return NextResponse.json(schedules);
}

// POST { name } — create a schedule (settings filled in afterwards).
export async function POST(req: Request) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return jsonError("Give the schedule a name");
  const schedule = await prisma.postingSchedule.create({
    data: { userId: auth.userId, name },
    include: { _count: { select: { accounts: true } } },
  });
  return NextResponse.json(schedule, { status: 201 });
}
