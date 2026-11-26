"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { BoardItems, STYLE_NAMES, TIERS } from "@/lib/renovation";
import * as R from "@/lib/renovations";
import { deleteImage } from "@/lib/media";
import { AccessDenied } from "@/lib/repo";
import type { FormState } from "@/lib/actions/public";

const Update = z.object({
  title: z.string().trim().min(2, "Give the idea a name").max(80),
  style: z.enum(STYLE_NAMES),
  tier: z.enum(TIERS),
  room_size_sqm: z.number().int().min(2).max(2000),
  items: BoardItems,
  show_on_listing: z.boolean(),
});

export async function saveBoardAction(boardId: string, data: unknown): Promise<FormState> {
  const user = await requireUser();
  const parsed = Update.safeParse(data);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid data" };
  try {
    if (!R.updateBoard(user.id, boardId, parsed.data)) return { ok: false, message: "Not found." };
  } catch (e) {
    if (e instanceof AccessDenied) return { ok: false, message: "You don't have permission to edit this idea." };
    throw e;
  }
  const board = R.getBoard(user.id, boardId);
  if (board?.listing_id) revalidatePath(`/properties/${board.listing_id}`);
  return { ok: true, message: "Saved." };
}

export async function deleteBoardAction(formData: FormData) {
  const user = await requireUser();
  const files = R.deleteBoard(user.id, String(formData.get("id") ?? ""));
  for (const f of files ?? []) await deleteImage(f);
  redirect("/app/renovations");
}
