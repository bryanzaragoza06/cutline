import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const PUBLIC_PAGES = new Set(["/", "/login", "/signup", "/privacy", "/terms", "/how-it-works", "/faq", "/favicon.ico", "/api/signup"]);

function isPublic(pathname: string): boolean {
  if (PUBLIC_PAGES.has(pathname)) return true;
  // Generated media URLs are unguessable UUIDs and must be fetchable by
  // <video> tags without extra auth plumbing.
  if (pathname.startsWith("/media/")) return true;
  // Auth.js's own endpoints are public, but the TikTok connect flow needs a
  // signed-in user to attach the account to.
  if (pathname.startsWith("/api/auth/") && !pathname.startsWith("/api/auth/tiktok/")) return true;
  return false;
}

export const proxy = auth((req) => {
  const { pathname, search } = req.nextUrl;
  if (isPublic(pathname) || req.auth?.user) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const loginUrl = new URL("/login", req.nextUrl.origin);
  loginUrl.searchParams.set("next", pathname + search);
  return NextResponse.redirect(loginUrl);
});

export const config = {
  // .txt is excluded on purpose so a TikTok URL-verification file in /public works.
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|webp|ico|txt)$).*)"],
};
