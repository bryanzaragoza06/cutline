import type { Account, Post, Schedule } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mediaUrlToAbsolutePath } from "@/lib/storage";
import { checkPublishStatus, getValidAccessToken, publishVideoToTikTok } from "@/lib/tiktok";

const STALE_PROCESSING_MS = 10 * 60 * 1000;

type ScheduleWithRelations = Schedule & { post: Post; account: Account };

function truncate(message: string, max = 500): string {
  return message.slice(0, max);
}

/**
 * Uploads the schedule's video to TikTok using the settings the user chose for
 * it. On success the schedule stays PROCESSING with a publishId until a later
 * tick confirms PUBLISH_COMPLETE.
 */
export async function publishSchedule(schedule: ScheduleWithRelations): Promise<void> {
  try {
    const { post, account } = schedule;
    if (!post.videoUrl) {
      throw new Error("This post has no video file — it may have been removed after it was posted. Upload it again.");
    }
    if (!account.openId) {
      throw new Error("This account isn't connected via TikTok — reconnect it from the Accounts page.");
    }
    if (!schedule.privacyLevel || !schedule.consentAt) {
      throw new Error("No TikTok post settings were chosen for this post — schedule it again and pick who can watch it.");
    }
    const accessToken = await getValidAccessToken(account);
    const { publishId } = await publishVideoToTikTok({
      accessToken,
      videoPath: mediaUrlToAbsolutePath(post.videoUrl),
      durationSec: post.durationSec ?? 12,
      title: schedule.title ?? "",
      privacyLevel: schedule.privacyLevel,
      allowComment: schedule.allowComment,
      allowDuet: schedule.allowDuet,
      allowStitch: schedule.allowStitch,
      brandOrganicToggle: schedule.brandOrganic,
      brandContentToggle: schedule.brandContent,
      fallbackToSelfOnly: schedule.automated,
    });
    await prisma.schedule.update({
      where: { id: schedule.id },
      data: { status: "PROCESSING", publishId, claimedAt: new Date(), error: null },
    });
    await prisma.account.update({ where: { id: account.id }, data: { lastError: null } });
  } catch (err) {
    const message = truncate(err instanceof Error ? err.message : "Publishing to TikTok failed");
    await prisma.schedule.update({
      where: { id: schedule.id },
      data: { status: "FAILED", postedAt: new Date(), error: message },
    });
    await prisma.account.update({ where: { id: schedule.accountId }, data: { lastError: message } });
  }
}

/** Polls TikTok for uploads still processing. Returns the affected post IDs. */
export async function checkPendingPublishes(): Promise<string[]> {
  const processing = await prisma.schedule.findMany({
    where: { status: "PROCESSING", publishId: { not: null } },
    include: { account: true },
  });
  const affected: string[] = [];
  for (const schedule of processing) {
    try {
      const accessToken = await getValidAccessToken(schedule.account);
      const result = await checkPublishStatus(accessToken, schedule.publishId!);
      if (result.status === "PUBLISH_COMPLETE") {
        await prisma.schedule.update({
          where: { id: schedule.id },
          data: { status: "POSTED", postedAt: new Date(), error: null },
        });
        affected.push(schedule.postId);
      } else if (result.status === "FAILED") {
        const message = truncate(`TikTok couldn't publish this video: ${result.fail_reason ?? "unknown reason"}`);
        await prisma.schedule.update({
          where: { id: schedule.id },
          data: { status: "FAILED", postedAt: new Date(), error: message },
        });
        await prisma.account.update({ where: { id: schedule.accountId }, data: { lastError: message } });
        affected.push(schedule.postId);
      }
      // Any other status is still in progress — check again next tick.
    } catch (err) {
      // Transient (network, token refresh) — leave PROCESSING and retry next tick.
      console.error("[publish] status check failed for schedule", schedule.id, err);
    }
  }
  return affected;
}

export async function refreshPostStatus(postId: string): Promise<void> {
  const schedules = await prisma.schedule.findMany({ where: { postId }, select: { status: true } });
  if (schedules.length === 0) return;
  const statuses = new Set(schedules.map((s) => s.status));
  const inFlight = statuses.has("PENDING") || statuses.has("PROCESSING");

  let status: Post["status"];
  if (inFlight) status = statuses.size > 1 && (statuses.has("POSTED") || statuses.has("FAILED")) ? "PARTIALLY_POSTED" : "SCHEDULED";
  else if (statuses.has("FAILED") && statuses.has("POSTED")) status = "PARTIALLY_POSTED";
  else if (statuses.has("FAILED")) status = "FAILED";
  else status = "POSTED";

  await prisma.post.update({ where: { id: postId }, data: { status } });
}

export async function runPublishDueTick(): Promise<void> {
  const affected = new Set<string>();
  const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS);

  // Crash recovery. Never reached TikTok → safe to retry.
  const neverUploaded = await prisma.schedule.findMany({
    where: { status: "PROCESSING", claimedAt: { lt: staleBefore }, publishId: null },
    select: { id: true, postId: true },
  });
  if (neverUploaded.length) {
    await prisma.schedule.updateMany({
      where: { id: { in: neverUploaded.map((s) => s.id) }, status: "PROCESSING", publishId: null },
      data: { status: "PENDING", claimedAt: null },
    });
    neverUploaded.forEach((s) => affected.add(s.postId));
  }
  // Uploaded but never confirmed → don't retry (duplicate-post risk).
  const unconfirmed = await prisma.schedule.findMany({
    where: { status: "PROCESSING", claimedAt: { lt: staleBefore }, publishId: { not: null } },
    select: { id: true, postId: true, accountId: true },
  });
  for (const s of unconfirmed) {
    await prisma.schedule.update({
      where: { id: s.id },
      data: {
        status: "FAILED",
        postedAt: new Date(),
        error: "Could not confirm TikTok finished processing this post — check the account on TikTok directly.",
      },
    });
    affected.add(s.postId);
  }

  const due = await prisma.schedule.findMany({
    where: { status: "PENDING", scheduledAt: { lte: new Date() } },
    select: { id: true },
    orderBy: { scheduledAt: "asc" },
  });
  for (const { id } of due) {
    const claimed = await prisma.schedule.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "PROCESSING", claimedAt: new Date() },
    });
    if (claimed.count === 0) continue;
    const schedule = await prisma.schedule.findUnique({ where: { id }, include: { post: true, account: true } });
    if (!schedule) continue;
    await publishSchedule(schedule);
    affected.add(schedule.postId);
  }

  for (const postId of await checkPendingPublishes()) affected.add(postId);
  for (const postId of affected) await refreshPostStatus(postId);
}
