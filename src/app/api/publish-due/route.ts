import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { runPublishDueTick } from "@/lib/publishDue";

// Manual trigger for the publish tick (the background worker runs it every 15s).
export async function POST() {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  await runPublishDueTick();
  return NextResponse.json({ ok: true });
}
