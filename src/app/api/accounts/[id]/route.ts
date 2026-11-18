import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { revokeAccess } from "@/lib/tiktok";

type Params = { params: Promise<{ id: string }> };

// Disconnects a TikTok account: revokes Cutline's access at TikTok, then deletes
// the stored tokens and any scheduled posts for it.
export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const account = await prisma.account.findFirst({ where: { id, userId: auth.userId } });
  if (!account) return jsonError("Account not found", 404);

  await revokeAccess(account);
  await prisma.account.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
