import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { canEdit, requireUser } from "@/lib/session";
import { getBoard, parseItems } from "@/lib/renovations";
import { getListingForOwner } from "@/lib/listings";
import { AccessDenied, roleOf } from "@/lib/repo";
import { deleteBoardAction } from "@/lib/actions/renovations";
import { RenovationEditor } from "@/components/renovation-editor";

export const metadata: Metadata = { title: "Renovation concept" };

export default async function RenovationBoardPage(props: PageProps<"/app/renovations/[id]">) {
  const { id } = await props.params;
  const user = await requireUser();
  let board;
  try {
    board = getBoard(user.id, id);
  } catch (e) {
    if (e instanceof AccessDenied) notFound();
    throw e;
  }
  if (!board) notFound();
  const role = roleOf(user.id, board.org_id);
  const editable = role !== null && canEdit(role);
  const listing = board.listing_id ? getListingForOwner(user.id, board.listing_id) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/app/renovations" className="text-sm text-muted hover:text-fg">← Renovation ideas</Link>
          <h1 className="text-2xl font-bold">{board.title}</h1>
          <p className="text-sm text-muted">
            {board.area === "inside" ? "Inside" : "Outside"} · {board.room_type}
            {listing ? <> · for <Link href={`/app/listings/${listing.id}`} className="text-accent underline">{listing.title}</Link></> : null}
          </p>
        </div>
        {editable ? (
          <form action={deleteBoardAction}>
            <input type="hidden" name="id" value={board.id} />
            <button className="btn-ghost text-danger">Delete concept</button>
          </form>
        ) : null}
      </div>
      <RenovationEditor
        editable={editable}
        initialItems={parseItems(board.items)}
        board={{
          id: board.id, title: board.title, area: board.area, room_type: board.room_type, room_size_sqm: board.room_size_sqm,
          style: board.style, tier: board.tier, summary: board.summary, suggested_by: board.suggested_by,
          listing_id: board.listing_id, listing_title: listing?.title ?? null, show_on_listing: board.show_on_listing === 1,
          has_after: Boolean(board.after_file),
        }}
      />
    </div>
  );
}
