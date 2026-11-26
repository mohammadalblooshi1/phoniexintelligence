import { getUser } from "@/lib/session";
import { getMediaForViewer } from "@/lib/listings";
import { readImage } from "@/lib/media";

// Serves listing images. Published listings are public; drafts only to their workspace.
export async function GET(_req: Request, ctx: RouteContext<"/media/[id]">) {
  const { id } = await ctx.params;
  const user = await getUser();
  const media = getMediaForViewer(id, user?.id ?? null);
  if (!media) return new Response("Not found", { status: 404 });
  const data = await readImage(media.file);
  if (!data) return new Response("Not found", { status: 404 });
  const isPublic = media.status === "published" || media.status === "sold";
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": media.mime,
      "Cache-Control": isPublic ? "public, max-age=3600" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
