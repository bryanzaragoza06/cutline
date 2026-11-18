import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, errorMessage } from "@/lib/api";
import { getValidAccessToken, queryCreatorInfo } from "@/lib/tiktok";

// Live creator settings for the manual review screen (privacy options etc.).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const account = await prisma.account.findFirst({ where: { id, userId: auth.userId } });
  if (!account) return jsonError("Account not found", 404);
  if (!account.openId) return jsonError("This account isn't connected via TikTok — reconnect it from the Accounts page.");

  try {
    const accessToken = await getValidAccessToken(account);
    return NextResponse.json(await queryCreatorInfo(accessToken));
  } catch (err) {
    return jsonError(errorMessage(err, "Couldn't reach TikTok"), 502);
  }
}
