import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { findOwnedStyle } from "@/lib/styles";
import { addLibraryItemsToStyle } from "@/lib/library";

// POST { itemIds: string[] } — add existing library media to this template.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const style = await findOwnedStyle(id, auth.userId);
  if (!style) return jsonError("Style not found", 404);

  const body = await req.json().catch(() => null);
  const itemIds: string[] = Array.isArray(body?.itemIds) ? body.itemIds.filter((x: unknown) => typeof x === "string") : [];
  if (!itemIds.length) return jsonError("Choose at least one item");

  const items = await prisma.libraryItem.findMany({ where: { id: { in: itemIds }, userId: auth.userId } });
  if (items.length !== new Set(itemIds).size) return jsonError("Library item not found", 404);

  const result = await addLibraryItemsToStyle(style, items);
  return NextResponse.json(result, { status: 201 });
}
