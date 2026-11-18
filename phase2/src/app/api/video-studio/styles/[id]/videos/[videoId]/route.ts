import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { unlinkMediaUrl } from "@/lib/files";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; videoId: string }> }) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  const { id, videoId } = await params;

  const clip = await prisma.styleVideo.findFirst({ where: { id: videoId, videoStyleId: id, videoStyle: { userId: auth.userId } } });
  if (!clip) return jsonError("Clip not found", 404);
  await prisma.styleVideo.delete({ where: { id: clip.id } });
  // Library-owned files stay in the library; only legacy files are deleted here.
  if (!clip.libraryItemId) await unlinkMediaUrl(clip.url);
  return NextResponse.json({ ok: true });
}
