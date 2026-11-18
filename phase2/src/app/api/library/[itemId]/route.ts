import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { unlinkMediaUrl } from "@/lib/files";
import { TOTAL_DURATION_SEC } from "@/lib/videoConstants";

type Params = { params: Promise<{ itemId: string }> };

// PATCH { text?, clipStarts? }
// - text: a caption's text or an audio track's default label (templates keep
//   their own copies; this changes what future adds get).
// - clipStarts: an audio track's chosen 12-second clip start times, in seconds.
//   These apply everywhere the song is used.
export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  const { itemId } = await params;

  const item = await prisma.libraryItem.findFirst({ where: { id: itemId, userId: auth.userId } });
  if (!item) return jsonError("Library item not found", 404);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return jsonError("Invalid request body");
  const data: { text?: string | null; clipStarts?: string } = {};

  if ("text" in body) {
    if (item.kind !== "CAPTION" && item.kind !== "AUDIO") return jsonError("Only captions and audio labels can be edited");
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (item.kind === "CAPTION" && !text) return jsonError("Caption text is required");
    data.text = text || null;
  }

  if ("clipStarts" in body) {
    if (item.kind !== "AUDIO") return jsonError("Timestamps are only for audio");
    if (!Array.isArray(body.clipStarts) || body.clipStarts.length > 100) return jsonError("Invalid timestamps");
    const maxStart = Math.max(0, (item.durationSec ?? 0) - TOTAL_DURATION_SEC);
    const starts: number[] = [];
    for (const raw of body.clipStarts) {
      const n = Number(raw);
      if (!Number.isFinite(n)) return jsonError("Invalid timestamps");
      starts.push(Math.round(Math.min(Math.max(0, n), maxStart) * 10) / 10);
    }
    data.clipStarts = JSON.stringify(starts);
  }

  const updated = await prisma.libraryItem.update({ where: { id: item.id }, data });
  return NextResponse.json(updated);
}

// DELETE — removes the item from the library and from every template using it
// (Style* rows cascade), and deletes its file.
export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  const { itemId } = await params;

  const item = await prisma.libraryItem.findFirst({ where: { id: itemId, userId: auth.userId } });
  if (!item) return jsonError("Library item not found", 404);
  await prisma.libraryItem.delete({ where: { id: item.id } });
  await unlinkMediaUrl(item.url);
  return NextResponse.json({ ok: true });
}
