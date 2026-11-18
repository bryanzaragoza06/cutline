import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";

type Params = { params: Promise<{ id: string; captionId: string }> };

async function findOwnedCaption(id: string, captionId: string, userId: string) {
  return prisma.styleCaption.findFirst({ where: { id: captionId, videoStyleId: id, videoStyle: { userId } } });
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  const { id, captionId } = await params;

  const caption = await findOwnedCaption(id, captionId, auth.userId);
  if (!caption) return jsonError("Caption not found", 404);

  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return jsonError("Caption text is required");

  const updated = await prisma.styleCaption.update({ where: { id: caption.id }, data: { text } });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  const { id, captionId } = await params;

  const caption = await findOwnedCaption(id, captionId, auth.userId);
  if (!caption) return jsonError("Caption not found", 404);
  await prisma.styleCaption.delete({ where: { id: caption.id } });
  return NextResponse.json({ ok: true });
}
