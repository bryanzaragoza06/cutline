import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const schedule = await prisma.schedule.findFirst({ where: { id, account: { userId: auth.userId } } });
  if (!schedule) return jsonError("Schedule not found", 404);

  await prisma.schedule.delete({ where: { id } });
  const remaining = await prisma.schedule.count({ where: { postId: schedule.postId } });
  if (remaining === 0) {
    await prisma.post.update({ where: { id: schedule.postId }, data: { status: "DRAFT" } });
  }
  return NextResponse.json({ ok: true });
}
