import type { VideoLayout } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { shuffle } from "@/lib/api";
import { computeNextDueAt, type DueCycleInfo } from "@/lib/cycle";
import { effectiveCycle } from "@/lib/postingSchedules";
import { acquireGenerationLock, releaseGenerationLock } from "@/lib/generationLock";
import { generateVideoPostForStyle } from "@/lib/videoGeneration";

export { computeNextDueAt, type DueCycleInfo } from "@/lib/cycle";

export type CycleAccount = DueCycleInfo & {
  id: string;
  userId: string;
  layout: VideoLayout;
  styleLinks: { styleId: string }[];
};

const STALE_GENERATING_MS = 10 * 60 * 1000;

async function reclaimStuckAccounts() {
  await prisma.account.updateMany({
    where: { generating: true, generatingSince: { lt: new Date(Date.now() - STALE_GENERATING_MS) } },
    data: { generating: false, generatingSince: null },
  });
}

async function processAccount(account: CycleAccount) {
  const gotLock = await acquireGenerationLock();
  if (!gotLock) return; // another generation in flight — retried next tick
  try {
    // compare-and-swap claim so two ticks can never process the same account
    const claimed = await prisma.account.updateMany({
      where: { id: account.id, active: true, generating: false },
      data: { generating: true, generatingSince: new Date() },
    });
    if (claimed.count === 0) return;

    const styleId = shuffle(account.styleLinks.map((l) => l.styleId))[0];
    // This post is the first of a fresh cycle if the previous cycle's rest has been served.
    const startsNewCycle = account.cycleLimit != null && account.cyclePostCount >= account.cycleLimit;

    try {
      const generated = await generateVideoPostForStyle(styleId, account.userId, account.layout);
      const postId = generated.postId;
      if (!postId) throw new Error("Generation succeeded but produced no post");

      await prisma.schedule.create({
        data: {
          postId,
          accountId: account.id,
          scheduledAt: new Date(),
          // The style's "Caption" setting decides this (null = no caption).
          title: generated.post?.title ?? null,
          // Automated posts: Public, every interaction allowed, no commercial
          // content. The publisher falls back to Only me if Public isn't
          // available for the account (e.g. before TikTok's audit), and never
          // turns on an interaction the creator has disabled in TikTok.
          automated: true,
          privacyLevel: "PUBLIC_TO_EVERYONE",
          allowComment: true,
          allowDuet: true,
          allowStitch: true,
          brandOrganic: false,
          brandContent: false,
          consentAt: new Date(),
        },
      });
      await prisma.post.update({ where: { id: postId }, data: { status: "SCHEDULED" } });
      await prisma.account.update({
        where: { id: account.id },
        data: {
          generating: false,
          generatingSince: null,
          lastPostedAt: new Date(),
          lastError: null,
          cyclePostCount: startsNewCycle ? 1 : account.cyclePostCount + 1,
        },
      });
    } catch (err) {
      // Failure: don't count it against the cycle, but DO set lastPostedAt so we back off
      // one repost interval instead of retrying every 15s tick.
      await prisma.account.update({
        where: { id: account.id },
        data: {
          generating: false,
          generatingSince: null,
          lastPostedAt: new Date(),
          lastError: (err instanceof Error ? err.message : "Automated generation failed").slice(0, 500),
        },
      });
    }
  } finally {
    await releaseGenerationLock();
  }
}

export async function runAutomationTick() {
  await reclaimStuckAccounts();
  const now = new Date();
  const accounts = await prisma.account.findMany({
    where: { active: true, generating: false },
    include: { styleLinks: { select: { styleId: true } }, postingSchedule: true },
  });
  for (const rawAccount of accounts) {
    // Follow the account's master posting schedule when it has one.
    const account = effectiveCycle(rawAccount);
    if (account.styleLinks.length === 0) continue;
    const dueAt = computeNextDueAt(account, now);
    if (!dueAt || dueAt > now) continue;
    await processAccount(account);
  }
}
