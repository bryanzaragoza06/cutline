import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { unlinkMediaUrl } from "@/lib/files";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; imageId: string }> }) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  const { id, imageId } = await params;

  const image = await prisma.styleImage.findFirst({ where: { id: imageId, videoStyleId: id, videoStyle: { userId: auth.userId } } });
  if (!image) return jsonError("Image not found", 404);
  await prisma.styleImage.delete({ where: { id: image.id } });
  // Library-owned files stay in the library; only legacy files are deleted here.
  if (!image.libraryItemId) await unlinkMediaUrl(image.url);
  return NextResponse.json({ ok: true });
}
