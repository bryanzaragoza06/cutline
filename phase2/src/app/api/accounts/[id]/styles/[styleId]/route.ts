import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";

type Params = { params: Promise<{ id: string; styleId: string }> };

export async function POST(_req: Request, { params }: Params) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  const { id, styleId } = await params;

  const [account, style] = await Promise.all([
    prisma.account.findFirst({ where: { id, userId: auth.userId }, select: { id: true } }),
    prisma.videoStyle.findFirst({ where: { id: styleId, userId: auth.userId }, select: { id: true } }),
  ]);
  if (!account) return jsonError("Account not found", 404);
  if (!style) return jsonError("Style not found", 404);

  const link = await prisma.accountStyleLink.upsert({
    where: { accountId_styleId: { accountId: id, styleId } },
    create: { accountId: id, styleId },
    update: {},
  });
  return NextResponse.json(link, { status: 201 });
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  const { id, styleId } = await params;

  const account = await prisma.account.findFirst({ where: { id, userId: auth.userId }, select: { id: true } });
  if (!account) return jsonError("Account not found", 404);
  await prisma.accountStyleLink.deleteMany({ where: { accountId: id, styleId } });
  return NextResponse.json({ ok: true });
}
