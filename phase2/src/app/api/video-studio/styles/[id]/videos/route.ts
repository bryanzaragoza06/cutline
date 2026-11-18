import { handleStyleUpload } from "@/lib/styleUpload";

// Uploads go into the user's media library and are added to this template.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleStyleUpload(req, id, "VIDEO");
}
