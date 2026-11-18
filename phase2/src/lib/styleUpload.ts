import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { findOwnedStyle, UPLOAD_TOO_LARGE } from "@/lib/styles";
import { addLibraryItemsToStyle, ingestUploads, UPLOAD_FIELD, type UploadKind } from "@/lib/library";

const EMPTY_MESSAGE: Record<UploadKind, string> = {
  IMAGE: "Choose at least one image",
  VIDEO: "Choose at least one video clip",
  AUDIO: "Choose at least one audio file",
};

/**
 * Upload into a template: files are saved to the user's library first, then
 * added to the template. Returns { created, failed } per file.
 */
export async function handleStyleUpload(req: Request, styleId: string, kind: UploadKind) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  const style = await findOwnedStyle(styleId, auth.userId);
  if (!style) return jsonError("Style not found", 404);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError(UPLOAD_TOO_LARGE, 413);
  }

  const files = form.getAll(UPLOAD_FIELD[kind]).filter((f): f is File => f instanceof File);
  if (files.length === 0) return jsonError(EMPTY_MESSAGE[kind]);

  const { created, failed, duplicates, skipped } = await ingestUploads(auth.userId, kind, files);
  // A clip that's already in the library isn't stored again, but it's still
  // added to this template if the template doesn't have it yet.
  await addLibraryItemsToStyle(style, [...created, ...duplicates]);
  return NextResponse.json({ created, failed, skipped }, { status: created.length || skipped.length ? 201 : 400 });
}
