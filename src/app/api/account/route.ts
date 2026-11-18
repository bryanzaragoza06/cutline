import { rm } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { STORAGE_DIR } from "@/lib/storage";
import { unlinkMediaUrl } from "@/lib/files";
import { revokeAccess } from "@/lib/tiktok";

// Permanently deletes the signed-in user's account and everything in it:
// connected TikTok accounts (tokens are revoked at TikTok first), uploaded
// videos, posts and schedules. Requires the current password.
export async function DELETE(req: Request) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";
  const user = await prisma.user.findUnique({ where: { id: auth.userId } });
  if (!user) return jsonError("Account not found", 404);
  if (!password || !(await bcrypt.compare(password, user.passwordHash))) {
    return jsonError("That password is incorrect", 403);
  }

  // Collect what we need before the rows are gone.
  const [accounts, posts, generated] = await Promise.all([
    prisma.account.findMany({ where: { userId: user.id }, select: { accessToken: true } }),
    prisma.post.findMany({ where: { bucket: { userId: user.id }, videoUrl: { not: null } }, select: { videoUrl: true } }),
    prisma.generatedVideo.findMany({ where: { videoStyle: { userId: user.id }, url: { not: null } }, select: { url: true } }),
  ]);

  for (const account of accounts) await revokeAccess(account);

  // Cascades remove accounts, buckets, posts, schedules and any template rows.
  await prisma.user.delete({ where: { id: user.id } });

  await rm(path.join(STORAGE_DIR, "uploads", "videos", user.id), { recursive: true, force: true });
  const videoUrls = new Set([...posts.map((p) => p.videoUrl), ...generated.map((g) => g.url)]);
  for (const url of videoUrls) await unlinkMediaUrl(url);

  return NextResponse.json({ ok: true });
}
