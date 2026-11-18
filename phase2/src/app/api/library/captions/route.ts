import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";

// POST /api/library/captions { text } — save a caption to the library.
export async function POST(req: Request) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return jsonError("Caption text is required");

  const item = await prisma.libraryItem.create({ data: { userId: auth.userId, kind: "CAPTION", text } });
  return NextResponse.json({ ...item, usedIn: 0 }, { status: 201 });
}
