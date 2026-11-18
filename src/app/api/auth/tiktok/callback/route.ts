import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomItem } from "@/lib/api";
import { exchangeCodeForToken, fetchUserInfo, tokenColumns } from "@/lib/tiktok";

const AVATAR_COLORS = ["#f43f5e", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#6366f1", "#a855f7", "#ec4899"];

/**
 * Behind Railway's proxy req.url is the container's internal address, so the
 * public origin comes from the configured redirect URI instead.
 */
function accountsUrl(params: Record<string, string>): URL {
  const origin = new URL(process.env.TIKTOK_REDIRECT_URI ?? "http://localhost:3000").origin;
  const url = new URL("/accounts", origin);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url;
}

function finish(params: Record<string, string>) {
  const res = NextResponse.redirect(accountsUrl(params));
  res.cookies.delete("tiktok_oauth_state");
  return res;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return finish({ connect_error: "Please sign in before connecting a TikTok account." });

  const params = req.nextUrl.searchParams;
  const oauthError = params.get("error");
  if (oauthError) {
    return finish({ connect_error: params.get("error_description") || `TikTok returned an error: ${oauthError}` });
  }

  const code = params.get("code");
  const state = params.get("state");
  const expectedState = req.cookies.get("tiktok_oauth_state")?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    return finish({ connect_error: "State mismatch — please try connecting again." });
  }

  try {
    const token = await exchangeCodeForToken(code);
    const user = await fetchUserInfo(token.access_token);
    const tokenData = tokenColumns(token); // tokens are encrypted before they are stored
    // If this TikTok account was connected under a different Cutline login, whoever just proved
    // control of it on TikTok takes it over — and the previous owner's scheduled posts are dropped.
    const existing = await prisma.account.findUnique({ where: { openId: user.open_id }, select: { id: true, userId: true } });
    if (existing && existing.userId !== userId) {
      await prisma.schedule.deleteMany({ where: { accountId: existing.id, status: "PENDING" } });
    }
    await prisma.account.upsert({
      where: { openId: user.open_id },
      create: {
        userId,
        openId: user.open_id,
        displayName: user.display_name,
        handle: user.display_name,
        avatarColor: randomItem(AVATAR_COLORS),
        ...tokenData,
      },
      update: { userId, displayName: user.display_name, handle: user.display_name, ...tokenData },
    });
    return finish({ connected: "1" });
  } catch (err) {
    console.error("[tiktok] OAuth callback failed", err);
    const message = err instanceof Error ? err.message : "Couldn't connect your TikTok account";
    return finish({ connect_error: message.slice(0, 300) });
  }
}
