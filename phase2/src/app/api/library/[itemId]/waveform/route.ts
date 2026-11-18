import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, errorMessage } from "@/lib/api";
import { mediaUrlToAbsolutePath } from "@/lib/storage";
import { computeWaveform } from "@/lib/ffmpeg";

// GET — waveform peaks (0–100) for an audio item; computed once, then cached.
export async function GET(_req: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  const { itemId } = await params;

  const item = await prisma.libraryItem.findFirst({ where: { id: itemId, userId: auth.userId, kind: "AUDIO" } });
  if (!item || !item.url) return jsonError("Audio not found", 404);

  if (item.waveform) {
    return NextResponse.json({ peaks: JSON.parse(item.waveform), durationSec: item.durationSec });
  }
  try {
    const peaks = await computeWaveform(mediaUrlToAbsolutePath(item.url), item.durationSec ?? 0);
    await prisma.libraryItem.update({ where: { id: item.id }, data: { waveform: JSON.stringify(peaks) } });
    return NextResponse.json({ peaks, durationSec: item.durationSec });
  } catch (err) {
    return jsonError(errorMessage(err, "Couldn't draw the waveform"), 500);
  }
}
