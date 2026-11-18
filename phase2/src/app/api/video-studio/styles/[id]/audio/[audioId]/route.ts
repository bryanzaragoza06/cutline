import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { unlinkMediaUrl } from "@/lib/files";

type Params = { params: Promise<{ id: string; audioId: string }> };

async function findOwnedAudio(id: string, audioId: string, userId: string) {
  return prisma.styleAudio.findFirst({ where: { id: audioId, videoStyleId: id, videoStyle: { userId } } });
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  const { id, audioId } = await params;

  const audio = await findOwnedAudio(id, audioId, auth.userId);
  if (!audio) return jsonError("Audio not found", 404);

  const body = await req.json().catch(() => null);
  const postCaption = typeof body?.postCaption === "string" ? body.postCaption.trim() : "";
  const updated = await prisma.styleAudio.update({ where: { id: audio.id }, data: { postCaption: postCaption || null } });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  const { id, audioId } = await params;

  const audio = await findOwnedAudio(id, audioId, auth.userId);
  if (!audio) return jsonError("Audio not found", 404);
  await prisma.styleAudio.delete({ where: { id: audio.id } });
  // Library-owned files stay in the library; only legacy files are deleted here.
  if (!audio.libraryItemId) await unlinkMediaUrl(audio.url);
  return NextResponse.json({ ok: true });
}
