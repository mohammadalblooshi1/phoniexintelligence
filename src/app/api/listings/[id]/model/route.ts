import { getUser } from "@/lib/session";
import { setModel } from "@/lib/listings";
import { AccessDenied } from "@/lib/repo";
import { checkModel, MAX_MODEL_BYTES } from "@/lib/model-file";
import { deleteImage, storeModelBytes } from "@/lib/media";

export const maxDuration = 120;

/** Upload (or replace) a listing's 3D model: .glb or .obj, max 50 MB. */
export async function POST(request: Request, ctx: RouteContext<"/api/listings/[id]/model">) {
  const { id } = await ctx.params;
  const user = await getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Choose a 3D model file" }, { status: 400 });
  if (file.size > MAX_MODEL_BYTES) return Response.json({ error: "The model is larger than 50 MB." }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = checkModel(bytes);
  if (!check.ok) return Response.json({ error: check.error }, { status: 400 });
  const name = await storeModelBytes(bytes, check.format);
  try {
    const previous = setModel(user.id, id, name, check.format);
    if (previous === undefined) {
      await deleteImage(name);
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    if (previous) await deleteImage(previous);
    return Response.json({ ok: true, format: check.format });
  } catch (e) {
    await deleteImage(name);
    if (e instanceof AccessDenied) return Response.json({ error: "Not found" }, { status: 404 });
    throw e;
  }
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/listings/[id]/model">) {
  const { id } = await ctx.params;
  const user = await getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  try {
    const previous = setModel(user.id, id, null, null);
    if (previous === undefined) return Response.json({ error: "Not found" }, { status: 404 });
    if (previous) await deleteImage(previous);
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof AccessDenied) return Response.json({ error: "Not found" }, { status: 404 });
    throw e;
  }
}
