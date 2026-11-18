import { prisma } from "@/lib/prisma";

/** A style the user owns, or null (callers respond 404). */
export function findOwnedStyle(id: string, userId: string) {
  return prisma.videoStyle.findFirst({ where: { id, userId } });
}

export const UPLOAD_TOO_LARGE =
  "Upload failed — the file(s) may be too large. Try uploading fewer or smaller files at once.";
