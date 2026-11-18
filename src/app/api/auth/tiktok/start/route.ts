import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { buildAuthUrl, generateState } from "@/lib/tiktok";

export async function GET() {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  const state = generateState();
  const res = NextResponse.redirect(buildAuthUrl(state));
  res.cookies.set("tiktok_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
