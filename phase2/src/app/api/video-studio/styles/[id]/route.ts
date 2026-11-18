import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { clampCrossfade, clampSecondsPerImage } from "@/lib/videoConstants";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const style = await prisma.videoStyle.findFirst({
    where: { id, userId: auth.userId },
    include: {
      images: { orderBy: { createdAt: "desc" } },
      videoClips: { orderBy: { createdAt: "desc" } },
      audioClips: {
        orderBy: { createdAt: "desc" },
        include: { libraryItem: { select: { id: true, clipStarts: true, durationSec: true } } },
      },
      captions: { orderBy: { createdAt: "desc" } },
      _count: { select: { accountLinks: true } },
      generatedVideos: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { post: true },
      },
    },
  });
  if (!style) return jsonError("Style not found", 404);
  return NextResponse.json(style);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const style = await prisma.videoStyle.findFirst({ where: { id, userId: auth.userId } });
  if (!style) return jsonError("Style not found", 404);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return jsonError("Invalid request body");

  const data: {
    name?: string;
    secondsPerImage?: number;
    crossfadeSec?: number;
    titleOnScreen?: boolean;
    titleAsCaption?: boolean;
  } = {};

  if ("name" in body) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return jsonError("Name is required");
    data.name = name;
  }
  if ("titleOnScreen" in body) {
    if (typeof body.titleOnScreen !== "boolean") return jsonError("titleOnScreen must be true or false");
    data.titleOnScreen = body.titleOnScreen;
  }
  if ("titleAsCaption" in body) {
    if (typeof body.titleAsCaption !== "boolean") return jsonError("titleAsCaption must be true or false");
    data.titleAsCaption = body.titleAsCaption;
  }
  if ("crossfadeSec" in body) {
    const value = Number(body.crossfadeSec);
    if (!Number.isFinite(value)) return jsonError("Fade duration must be a number");
    data.crossfadeSec = Math.round(clampCrossfade(value) * 100) / 100;
  }
  if ("secondsPerImage" in body) {
    const value = Number(body.secondsPerImage);
    if (!Number.isFinite(value)) return jsonError("Seconds per image must be a number");
    data.secondsPerImage = clampSecondsPerImage(value);
  }

  const updated = await prisma.videoStyle.update({ where: { id }, data });
  return NextResponse.json(updated);
}

// DELETE — removes the template. Its images/clips/audio/captions stay in the
// user's library (template rows only point to library items) and videos it
// generated stay on Posts. Accounts lose this template; any account left with
// no templates is paused rather than silently doing nothing.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const style = await prisma.videoStyle.findFirst({ where: { id, userId: auth.userId } });
  if (!style) return jsonError("Style not found", 404);

  const links = await prisma.accountStyleLink.findMany({ where: { styleId: id }, select: { accountId: true } });
  await prisma.videoStyle.delete({ where: { id } });

  const affected = links.map((l) => l.accountId);
  const paused = await prisma.account.updateMany({
    where: { id: { in: affected }, active: true, styleLinks: { none: {} } },
    data: { active: false, lastError: `Paused: the "${style.name}" video template was deleted — link another template to start again.` },
  });
  return NextResponse.json({ ok: true, accountsAffected: affected.length, accountsPaused: paused.count });
}
