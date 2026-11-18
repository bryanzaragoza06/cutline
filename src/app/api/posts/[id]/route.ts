import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { unlinkMediaUrl } from "@/lib/files";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const post = await prisma.post.findFirst({ where: { id, bucket: { userId: auth.userId } }, select: { id: true, videoUrl: true } });
  if (!post) return jsonError("Post not found", 404);
  // A video that's still uploading to TikTok must not be deleted from under it.
  const inFlight = await prisma.schedule.count({ where: { postId: id, status: "PROCESSING" } });
  if (inFlight > 0) return jsonError("This post is being sent to TikTok right now — try again in a minute", 409);

  await prisma.post.delete({ where: { id } });
  await unlinkMediaUrl(post.videoUrl);
  return NextResponse.json({ ok: true });
}
