import { getUser } from "@/lib/session";
import { getModelForViewer } from "@/lib/listings";
import { readImage } from "@/lib/media";

// Serves a listing's 3D model (public for published listings, private for drafts).
export async function GET(_req: Request, ctx: RouteContext<"/model/[id]">) {
  const { id } = await ctx.params;
  const user = await getUser();
  const model = getModelForViewer(id, user?.id ?? null);
  if (!model) return new Response("Not found", { status: 404 });
  const data = await readImage(model.file);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": model.format === "glb" ? "model/gltf-binary" : "application/octet-stream",
      "Content-Disposition": "inline",
      "Cache-Control": model.isPublic ? "public, max-age=600" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
