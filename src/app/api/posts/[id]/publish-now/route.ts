import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma, SAFE_ACCOUNT_SELECT } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { parsePostSettings } from "@/lib/postSettings";
import { publishSchedule, refreshPostStatus } from "@/lib/publishDue";

// The review screen's "Post to TikTok": posts one video to one account now,
// with the settings the user just chose.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return jsonError("Invalid request body");

  const accountId = typeof body.accountId === "string" ? body.accountId : "";
  if (!accountId) return jsonError("Choose an account to post to");
  const parsed = parsePostSettings(body);
  if (!parsed.ok) return jsonError(parsed.error);

  const [post, account] = await Promise.all([
    prisma.post.findFirst({ where: { id, bucket: { userId: auth.userId } } }),
    prisma.account.findFirst({ where: { id: accountId, userId: auth.userId } }),
  ]);
  if (!post) return jsonError("Post not found", 404);
  if (!account) return jsonError("Account not found", 404);
  if (!post.videoUrl) return jsonError("This post has no video to publish");

  const now = new Date();
  const schedule = await prisma.schedule.create({
    data: {
      postId: post.id,
      accountId: account.id,
      scheduledAt: now,
      claimedAt: now,
      status: "PROCESSING",
      consentAt: now,
      ...parsed.settings,
    },
  });

  await publishSchedule({ ...schedule, post, account });
  await refreshPostStatus(post.id);

  const updated = await prisma.post.findUnique({
    where: { id: post.id },
    include: { schedules: { orderBy: { scheduledAt: "asc" }, include: { account: { select: SAFE_ACCOUNT_SELECT } } } },
  });
  const latest = updated?.schedules.find((s) => s.id === schedule.id);
  if (latest?.status === "FAILED") return jsonError(latest.error ?? "Posting to TikTok failed", 502);
  return NextResponse.json(updated, { status: 201 });
}
