import { getUser } from "@/lib/session";
import { addMedia, countMedia, getListingForOwner, MAX_PANOS, MAX_PHOTOS } from "@/lib/listings";
import { AccessDenied, roleOf } from "@/lib/repo";
import { deleteImage, storeImage } from "@/lib/media";

// Upload one photo or 360° panorama to a listing (multipart form: kind, title, file).
export async function POST(request: Request, ctx: RouteContext<"/api/listings/[id]/media">) {
  const { id } = await ctx.params;
  const user = await getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  let listing;
  try {
    listing = getListingForOwner(user.id, id);
  } catch (e) {
    if (e instanceof AccessDenied) return Response.json({ error: "Not found" }, { status: 404 });
    throw e;
  }
  if (!listing) return Response.json({ error: "Not found" }, { status: 404 });
  const role = roleOf(user.id, listing.org_id);
  if (role === "viewer") return Response.json({ error: "You have view-only access" }, { status: 403 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const kind = form?.get("kind");
  const title = String(form?.get("title") ?? "").trim().slice(0, 40);
  if (!(file instanceof File) || (kind !== "photo" && kind !== "pano")) {
    return Response.json({ error: "Invalid upload" }, { status: 400 });
  }
  if (kind === "pano" && !title) return Response.json({ error: "Give the 360° photo a room name" }, { status: 400 });
  const max = kind === "photo" ? MAX_PHOTOS : MAX_PANOS;
  if (countMedia(id, kind) >= max) return Response.json({ error: `Limit of ${max} reached` }, { status: 400 });

  const stored = await storeImage(file, kind);
  if (!stored.ok) return Response.json({ error: stored.error }, { status: 400 });
  try {
    const mediaId = addMedia(user.id, id, { kind, file: stored.file, mime: stored.mime, title });
    return Response.json({ id: mediaId });
  } catch (e) {
    await deleteImage(stored.file);
    throw e;
  }
}
