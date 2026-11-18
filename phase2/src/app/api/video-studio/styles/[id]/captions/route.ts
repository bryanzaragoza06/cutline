import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { findOwnedStyle } from "@/lib/styles";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const style = await findOwnedStyle(id, auth.userId);
  if (!style) return jsonError("Style not found", 404);

  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return jsonError("Caption text is required");

  // Saved to the library too, so it can be reused in other templates.
  const item = await prisma.libraryItem.create({ data: { userId: auth.userId, kind: "CAPTION", text } });
  const caption = await prisma.styleCaption.create({ data: { videoStyleId: style.id, text, libraryItemId: item.id } });
  return NextResponse.json(caption, { status: 201 });
}
