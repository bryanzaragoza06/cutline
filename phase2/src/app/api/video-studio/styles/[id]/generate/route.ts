import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { jsonError, errorMessage } from "@/lib/api";
import { acquireGenerationLock, releaseGenerationLock } from "@/lib/generationLock";
import { generateVideoPostForStyle } from "@/lib/videoGeneration";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  // 16:9 landscape is the default.
  const layout = body?.layout === "PORTRAIT_9_16" ? "PORTRAIT_9_16" : "LANDSCAPE_16_9";

  if (!(await acquireGenerationLock())) {
    return jsonError("Another video is generating right now — try again in a few seconds.", 409);
  }
  try {
    const generated = await generateVideoPostForStyle(id, auth.userId, layout);
    return NextResponse.json(generated, { status: 201 });
  } catch (err) {
    const message = errorMessage(err, "Video generation failed");
    return jsonError(message, /not found/i.test(message) ? 404 : 400);
  } finally {
    await releaseGenerationLock();
  }
}
