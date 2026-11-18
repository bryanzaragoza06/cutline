import { unlink } from "fs/promises";
import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma, SAFE_ACCOUNT_SELECT } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { TITLE_MAX } from "@/lib/postSettings";
import { getPostsBucketId, MAX_UPLOAD_BYTES, MAX_UPLOAD_MB, saveVideoUpload, VIDEO_EXTENSIONS, videoExtension } from "@/lib/uploads";
import { probeVideo } from "@/lib/videoProbe";

// POST /api/posts/upload — a creator uploads one of their own videos. It becomes a
// draft post that they can then post to TikTok now or schedule.
export async function POST(req: Request) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError(`Upload failed — the video may be larger than ${MAX_UPLOAD_MB} MB.`, 413);
  }

  const file = form.get("video");
  if (!(file instanceof File) || file.size === 0) return jsonError("Choose a video file to upload");
  const ext = videoExtension(file.name);
  if (!ext) return jsonError(`Upload an ${VIDEO_EXTENSIONS.map((e) => e.slice(1).toUpperCase()).join(", ")} video`);
  if (file.size > MAX_UPLOAD_BYTES) return jsonError(`That video is larger than ${MAX_UPLOAD_MB} MB`, 413);

  const captionInput = form.get("caption");
  const caption = typeof captionInput === "string" ? captionInput.trim().slice(0, TITLE_MAX) : "";

  const saved = await saveVideoUpload(file, auth.userId, ext);
  let durationSec: number;
  try {
    ({ durationSec } = await probeVideo(saved.absolutePath));
  } catch (err) {
    await unlink(saved.absolutePath).catch(() => {});
    return jsonError(err instanceof Error ? err.message : "We couldn't read that video");
  }

  const bucketId = await getPostsBucketId(auth.userId);
  const post = await prisma.post.create({
    data: {
      bucketId,
      caption: caption || file.name.replace(/\.[^.]+$/, "").slice(0, 100) || "Untitled video",
      title: caption || null,
      mediaNote: `Uploaded: ${file.name.slice(0, 120)}`,
      videoUrl: saved.url,
      durationSec,
      source: "UPLOAD",
      status: "DRAFT",
    },
    include: { schedules: { orderBy: { scheduledAt: "asc" }, include: { account: { select: SAFE_ACCOUNT_SELECT } } } },
  });
  return NextResponse.json(post, { status: 201 });
}
