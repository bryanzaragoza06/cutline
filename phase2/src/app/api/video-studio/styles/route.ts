import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";

const COUNT_SELECT = {
  _count: { select: { images: true, videoClips: true, audioClips: true, captions: true, generatedVideos: true } },
} as const;

const KINDS = ["AESTHETIC_SLIDESHOW", "VIDEO_COMPILATION"] as const;

export async function GET() {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  const styles = await prisma.videoStyle.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: "asc" },
    include: COUNT_SELECT,
  });
  return NextResponse.json(styles);
}

export async function POST(req: Request) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const kind = body?.kind;
  if (!name) return jsonError("Name is required");
  if (!KINDS.includes(kind)) return jsonError("Choose a style type");

  const style = await prisma.videoStyle.create({
    data: { userId: auth.userId, name, kind },
    include: COUNT_SELECT,
  });
  return NextResponse.json(style, { status: 201 });
}
