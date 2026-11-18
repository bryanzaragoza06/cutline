import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { STORAGE_DIR } from "@/lib/storage";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  // Uploaded clips/audio keep their original container, so previews need these too.
  ".m4a": "audio/mp4",
  ".wav": "audio/wav",
  ".mov": "video/quicktime",
  ".m4v": "video/mp4",
  ".webm": "video/webm",
};

// The SQLite database lives in STORAGE_DIR too (on Railway it's the same
// volume), so only these subtrees are ever served.
const SERVABLE_ROOTS = new Set(["uploads", "generated"]);

function notFound() {
  return new Response("Not found", { status: 404 });
}

function nodeStreamToWeb(filePath: string, start: number, end: number): ReadableStream<Uint8Array> {
  const nodeStream = createReadStream(filePath, { start, end });
  return new ReadableStream<Uint8Array>({
    start(controller) {
      nodeStream.on("data", (chunk) => controller.enqueue(typeof chunk === "string" ? new TextEncoder().encode(chunk) : new Uint8Array(chunk)));
      nodeStream.on("end", () => controller.close());
      nodeStream.on("error", (err) => controller.error(err));
    },
    cancel() {
      nodeStream.destroy();
    },
  });
}

// Creators' uploaded videos (uploads/videos/<userId>/…) are only served to the
// signed-in owner; everything else under /media is an unguessable UUID URL.
export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  if (!segments?.length || segments.some((s) => s === ".." || s.includes("\0"))) return notFound();
  if (segments.length < 2 || !SERVABLE_ROOTS.has(segments[0])) return notFound();
  if (segments[0] === "uploads" && segments[1] === "videos") {
    const session = await auth();
    if (!session?.user?.id || segments[2] !== session.user.id) return notFound();
  }

  const filePath = path.resolve(STORAGE_DIR, ...segments);
  if (!filePath.startsWith(STORAGE_DIR + path.sep)) return notFound();

  let size: number;
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return notFound();
    size = info.size;
  } catch {
    return notFound();
  }

  const headers = new Headers({
    "Content-Type": CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=31536000, immutable",
  });

  const range = req.headers.get("range");
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    let start: number;
    let end: number;
    if (!match || (match[1] === "" && match[2] === "")) {
      start = NaN;
      end = NaN;
    } else if (match[1] === "") {
      // Suffix range: last N bytes.
      start = Math.max(0, size - Number(match[2]));
      end = size - 1;
    } else {
      start = Number(match[1]);
      end = match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
    }
    if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) {
      headers.set("Content-Range", `bytes */${size}`);
      return new Response(null, { status: 416, headers });
    }
    headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
    headers.set("Content-Length", String(end - start + 1));
    return new Response(nodeStreamToWeb(filePath, start, end), { status: 206, headers });
  }

  headers.set("Content-Length", String(size));
  if (size === 0) return new Response(null, { status: 200, headers });
  return new Response(nodeStreamToWeb(filePath, 0, size - 1), { status: 200, headers });
}
