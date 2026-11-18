import { prisma } from "@/lib/prisma";
import { unlinkMediaUrl } from "@/lib/files";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// Uploaded videos are deleted from the server volume once they're no longer needed:
//  - 24 hours after every one of the post's schedules has been published, or
//  - after 14 days if the video was never posted (or only failed).
// A post that is waiting to publish (PENDING) or uploading (PROCESSING) is never touched.
const AFTER_POSTED_MS = DAY_MS;
const UNUSED_MS = 14 * DAY_MS;

export async function cleanupUploadedVideos(): Promise<number> {
  const now = Date.now();
  const posts = await prisma.post.findMany({
    where: { videoUrl: { not: null }, source: "UPLOAD" },
    select: {
      id: true,
      videoUrl: true,
      createdAt: true,
      schedules: { select: { status: true, postedAt: true } },
    },
    take: 500,
  });

  let removed = 0;
  for (const post of posts) {
    if (post.schedules.some((s) => s.status === "PENDING" || s.status === "PROCESSING")) continue;

    const allPosted = post.schedules.length > 0 && post.schedules.every((s) => s.status === "POSTED");
    const lastPostedAt = Math.max(0, ...post.schedules.map((s) => s.postedAt?.getTime() ?? 0));
    const expired =
      (allPosted && now - lastPostedAt > AFTER_POSTED_MS) || now - post.createdAt.getTime() > UNUSED_MS;
    if (!expired) continue;

    await unlinkMediaUrl(post.videoUrl);
    await prisma.post.update({
      where: { id: post.id },
      data: { videoUrl: null, mediaNote: "Video file removed from our servers" },
    });
    removed++;
  }
  if (removed) console.log(`[cleanup] removed ${removed} uploaded video file(s)`);
  return removed;
}
