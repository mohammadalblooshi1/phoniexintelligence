import { getUser } from "@/lib/session";
import { boardImageForViewer } from "@/lib/renovations";
import { readImage } from "@/lib/media";

export async function GET(_req: Request, ctx: RouteContext<"/renovation-media/[id]/[which]">) {
  const { id, which } = await ctx.params;
  if (which !== "before" && which !== "after") return new Response("Not found", { status: 404 });
  const user = await getUser();
  const img = boardImageForViewer(id, which, user?.id ?? null);
  if (!img) return new Response("Not found", { status: 404 });
  const data = await readImage(img.file);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": img.mime,
      "Cache-Control": img.isPublic ? "public, max-age=600" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
