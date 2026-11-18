import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma, SAFE_ACCOUNT_SELECT } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { parsePostSettings } from "@/lib/postSettings";
import { validateSettingsForAccount } from "@/lib/postSettingsServer";

// Schedules one post to one account at a time, with the TikTok settings the
// user chose for it on the scheduling form (validated against live options).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const post = await prisma.post.findFirst({ where: { id, bucket: { userId: auth.userId } } });
  if (!post) return jsonError("Post not found", 404);
  if (!post.videoUrl) return jsonError("Only posts with a generated video can be scheduled to TikTok");

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return jsonError("Invalid request body");

  const accountId = typeof body.accountId === "string" ? body.accountId : "";
  if (!accountId) return jsonError("Choose an account");
  const scheduledAt = typeof body.scheduledAt === "string" ? new Date(body.scheduledAt) : null;
  if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) return jsonError("Pick a valid date and time");
  if (scheduledAt.getTime() < Date.now() - 60_000) return jsonError("Pick a time in the future");

  const parsed = parsePostSettings(body);
  if (!parsed.ok) return jsonError(parsed.error);

  const account = await prisma.account.findFirst({ where: { id: accountId, userId: auth.userId } });
  if (!account) return jsonError("Account not found", 404);
  const invalid = await validateSettingsForAccount(account, parsed.settings);
  if (invalid) return jsonError(invalid);

  await prisma.$transaction([
    prisma.schedule.create({
      data: { postId: post.id, accountId: account.id, scheduledAt, consentAt: new Date(), ...parsed.settings },
    }),
    prisma.post.update({ where: { id: post.id }, data: { status: "SCHEDULED" } }),
  ]);

  const updated = await prisma.post.findUnique({
    where: { id: post.id },
    include: { schedules: { orderBy: { scheduledAt: "asc" }, include: { account: { select: SAFE_ACCOUNT_SELECT } } } },
  });
  return NextResponse.json(updated, { status: 201 });
}
