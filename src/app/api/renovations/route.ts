import { z } from "zod";
import { getUser, getWorkspaces } from "@/lib/session";
import { cookies } from "next/headers";
import { ORG_COOKIE, canEdit } from "@/lib/session";
import { createBoard } from "@/lib/renovations";
import { suggestRenovation } from "@/lib/renovation-agent";
import { ALL_ROOM_TYPES, ROOM_TYPES, STYLE_NAMES, TIERS } from "@/lib/renovation";
import { deleteImage, readImage, storeImage } from "@/lib/media";
import { AccessDenied } from "@/lib/repo";

export const maxDuration = 120;

const Input = z.object({
  area: z.enum(["inside", "outside"]),
  room_type: z.enum(ALL_ROOM_TYPES),
  style: z.enum(STYLE_NAMES),
  tier: z.enum(TIERS),
  size: z.coerce.number().int().min(2).max(2000),
  title: z.string().trim().max(80).optional(),
  listing_id: z.string().max(40).optional(),
});

/** Create a renovation concept board from an uploaded room photo. */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  const workspaces = await getWorkspaces();
  const active = (await cookies()).get(ORG_COOKIE)?.value;
  const ws = workspaces.find((w) => w.id === active) ?? workspaces[0];
  if (!ws) return Response.json({ error: "Create a workspace first" }, { status: 400 });
  if (!canEdit(ws.role)) return Response.json({ error: "You have view-only access" }, { status: 403 });

  const form = await request.formData().catch(() => null);
  const photo = form?.get("photo");
  if (!form || !(photo instanceof File)) return Response.json({ error: "Choose a photo" }, { status: 400 });
  const parsed = Input.safeParse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string" && v !== "")));
  if (!parsed.success) return Response.json({ error: "Please complete all fields" }, { status: 400 });
  const d = parsed.data;
  if (!(ROOM_TYPES[d.area] as readonly string[]).includes(d.room_type)) {
    return Response.json({ error: "Room type does not match inside/outside" }, { status: 400 });
  }

  const stored = await storeImage(photo, "photo");
  if (!stored.ok) return Response.json({ error: stored.error }, { status: 400 });
  try {
    const bytes = await readImage(stored.file);
    const suggestion = await suggestRenovation({
      photo: new Uint8Array(bytes!),
      mime: stored.mime as "image/jpeg" | "image/png" | "image/webp",
      area: d.area,
      roomType: d.room_type,
      style: d.style,
      tier: d.tier,
      sizeSqm: d.size,
    });
    const id = createBoard(user.id, ws.id, {
      title: d.title || `${d.style} ${d.room_type.toLowerCase()}`,
      area: d.area,
      room_type: d.room_type,
      room_size_sqm: d.size,
      style: d.style,
      tier: d.tier,
      photo_file: stored.file,
      photo_mime: stored.mime,
      listing_id: d.listing_id || null,
      items: suggestion.items,
      summary: suggestion.summary,
      suggested_by: suggestion.mode,
    });
    return Response.json({ id });
  } catch (e) {
    await deleteImage(stored.file);
    if (e instanceof AccessDenied) return Response.json({ error: "That listing is not in your workspace" }, { status: 403 });
    throw e;
  }
}
