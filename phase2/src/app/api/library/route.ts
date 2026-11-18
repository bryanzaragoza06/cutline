import { NextResponse } from "next/server";
import type { LibraryKind } from "@prisma/client";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { UPLOAD_TOO_LARGE } from "@/lib/styles";
import { ingestUploads, LIBRARY_KINDS, UPLOAD_FIELD, usageCounts, type UploadFailure, type UploadKind } from "@/lib/library";

// GET /api/library?kind=IMAGE — the user's library (optionally one kind), newest first,
// with how many templates use each item.
export async function GET(req: Request) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  const kindParam = new URL(req.url).searchParams.get("kind");
  const kind = kindParam && (LIBRARY_KINDS as string[]).includes(kindParam) ? (kindParam as LibraryKind) : undefined;

  const items = await prisma.libraryItem.findMany({
    where: { userId: auth.userId, ...(kind ? { kind } : {}) },
    orderBy: { createdAt: "desc" },
  });
  const counts = await usageCounts(items.map((i) => i.id));
  return NextResponse.json(items.map((item) => ({ ...item, usedIn: counts[item.id] ?? 0 })));
}

// POST /api/library — multipart upload straight into the library
// (fields: images, videos, audio).
export async function POST(req: Request) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError(UPLOAD_TOO_LARGE, 413);
  }

  const created = [];
  const failed: UploadFailure[] = [];
  const skipped: { filename: string }[] = [];
  for (const kind of ["IMAGE", "VIDEO", "AUDIO"] as UploadKind[]) {
    const files = form.getAll(UPLOAD_FIELD[kind]).filter((f): f is File => f instanceof File);
    if (!files.length) continue;
    const result = await ingestUploads(auth.userId, kind, files);
    created.push(...result.created);
    failed.push(...result.failed);
    skipped.push(...result.skipped);
  }
  if (!created.length && !failed.length && !skipped.length) return jsonError("Choose at least one file");
  // Duplicates are "bypassed", not errors.
  return NextResponse.json({ created, failed, skipped }, { status: created.length || skipped.length ? 201 : 400 });
}
