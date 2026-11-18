import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { parseOptionalInt } from "@/lib/postingSchedules";

type Params = { params: Promise<{ id: string }> };

// PATCH — any of: name, repostIntervalMinutes, cycleLimit, breakMinutes.
// Changes apply to every account on this schedule.
export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const schedule = await prisma.postingSchedule.findFirst({ where: { id, userId: auth.userId } });
  if (!schedule) return jsonError("Schedule not found", 404);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return jsonError("Invalid request body");
  const data: Prisma.PostingScheduleUpdateInput = {};

  if ("name" in body) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return jsonError("Give the schedule a name");
    data.name = name;
  }

  const repost = parseOptionalInt(body.repostIntervalMinutes, 1);
  if (repost === "invalid") return jsonError("Repost interval must be a whole number of minutes (at least 1)");
  const limit = parseOptionalInt(body.cycleLimit, 1);
  if (limit === "invalid") return jsonError("Cycle limit must be a whole number (at least 1)");
  const breakMinutes = parseOptionalInt(body.breakMinutes, 0);
  if (breakMinutes === "invalid") return jsonError("Break time must be a whole number of minutes (0 or more)");
  if (repost !== undefined) data.repostIntervalMinutes = repost;
  if (limit !== undefined) data.cycleLimit = limit;
  if (breakMinutes !== undefined) data.breakMinutes = breakMinutes;

  const updated = await prisma.postingSchedule.update({
    where: { id },
    data,
    include: { _count: { select: { accounts: true } } },
  });
  return NextResponse.json(updated);
}

// DELETE — accounts on this schedule are unassigned and paused.
export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const schedule = await prisma.postingSchedule.findFirst({ where: { id, userId: auth.userId } });
  if (!schedule) return jsonError("Schedule not found", 404);
  await prisma.account.updateMany({ where: { postingScheduleId: id }, data: { active: false } });
  await prisma.postingSchedule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
