import { getUser } from "@/lib/session";
import { setAfterImage } from "@/lib/renovations";
import { AccessDenied } from "@/lib/repo";
import { deleteImage, storeImage } from "@/lib/media";

// Owner uploads their own "after" image (e.g. a designer's render), or removes it.
export async function POST(request: Request, ctx: RouteContext<"/api/renovations/[id]/after">) {
  const { id } = await ctx.params;
  const user = await getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Choose an image" }, { status: 400 });
  const stored = await storeImage(file, "photo");
  if (!stored.ok) return Response.json({ error: stored.error }, { status: 400 });
  try {
    const previous = setAfterImage(user.id, id, stored.file, stored.mime);
    if (previous === null) {
      await deleteImage(stored.file);
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    if (previous) await deleteImage(previous);
    return Response.json({ ok: true });
  } catch (e) {
    await deleteImage(stored.file);
    if (e instanceof AccessDenied) return Response.json({ error: "Not found" }, { status: 404 });
    throw e;
  }
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/renovations/[id]/after">) {
  const { id } = await ctx.params;
  const user = await getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  try {
    const previous = setAfterImage(user.id, id, null, null);
    if (previous === null) return Response.json({ error: "Not found" }, { status: 404 });
    if (previous) await deleteImage(previous);
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof AccessDenied) return Response.json({ error: "Not found" }, { status: 404 });
    throw e;
  }
}
