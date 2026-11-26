import "server-only";
import { db, newId, nowIso } from "@/lib/db";
import { AccessDenied, audit, roleOf, type OrgRole } from "@/lib/repo";
import { BoardItems, type Area, type BoardItemT, type StyleName, type Tier } from "@/lib/renovation";

// Renovation concept boards belong to a workspace. Members can view them;
// owners/admins/members can edit. A board linked to a published listing can be
// shown publicly on that listing only when the owner turns that on.

export type Board = {
  id: string;
  org_id: string;
  listing_id: string | null;
  title: string;
  area: Area;
  room_type: string;
  room_size_sqm: number;
  style: StyleName;
  tier: Tier;
  photo_file: string;
  photo_mime: string;
  after_file: string | null;
  after_mime: string | null;
  items: string;
  summary: string;
  suggested_by: "ai" | "rules";
  show_on_listing: number;
  created_at: string;
  updated_at: string;
};

const EDITORS: OrgRole[] = ["owner", "admin", "member"];

function requireRole(userId: string, orgId: string, allowed?: OrgRole[]) {
  const role = roleOf(userId, orgId);
  if (!role || (allowed && !allowed.includes(role))) throw new AccessDenied();
}

export function parseItems(json: string): BoardItemT[] {
  try {
    const r = BoardItems.safeParse(JSON.parse(json));
    return r.success ? r.data : [];
  } catch {
    return [];
  }
}

function load(id: string) {
  return (db().prepare("select * from renovation_boards where id = ?").get(id) as Board | undefined) ?? null;
}

export function getBoard(userId: string, id: string, edit = false) {
  const b = load(id);
  if (!b) return null;
  requireRole(userId, b.org_id, edit ? EDITORS : undefined);
  return b;
}

export function listBoards(userId: string, orgId: string) {
  requireRole(userId, orgId);
  return db()
    .prepare(
      `select b.*, l.title as listing_title from renovation_boards b left join listings l on l.id = b.listing_id
        where b.org_id = ? order by b.created_at desc`,
    )
    .all(orgId) as (Board & { listing_title: string | null })[];
}

export function createBoard(
  userId: string,
  orgId: string,
  b: Pick<Board, "title" | "area" | "room_type" | "room_size_sqm" | "style" | "tier" | "photo_file" | "photo_mime" | "summary" | "suggested_by"> & {
    listing_id: string | null;
    items: BoardItemT[];
  },
) {
  requireRole(userId, orgId, EDITORS);
  if (b.listing_id) {
    const l = db().prepare("select org_id from listings where id = ?").get(b.listing_id) as { org_id: string } | undefined;
    if (!l || l.org_id !== orgId) throw new AccessDenied();
  }
  const id = newId();
  db()
    .prepare(
      `insert into renovation_boards (id, org_id, listing_id, created_by, title, area, room_type, room_size_sqm, style, tier,
         photo_file, photo_mime, items, summary, suggested_by) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, orgId, b.listing_id, userId, b.title, b.area, b.room_type, b.room_size_sqm, b.style, b.tier, b.photo_file,
      b.photo_mime, JSON.stringify(b.items), b.summary, b.suggested_by);
  audit(orgId, userId, "renovation.created", { board_id: id });
  return id;
}

export function updateBoard(
  userId: string,
  id: string,
  u: Pick<Board, "title" | "style" | "tier" | "room_size_sqm"> & { items: BoardItemT[]; show_on_listing: boolean },
) {
  const b = getBoard(userId, id, true);
  if (!b) return false;
  db()
    .prepare(
      `update renovation_boards set title = ?, style = ?, tier = ?, room_size_sqm = ?, items = ?, show_on_listing = ?, updated_at = ?
        where id = ?`,
    )
    .run(u.title, u.style, u.tier, u.room_size_sqm, JSON.stringify(u.items), u.show_on_listing && b.listing_id ? 1 : 0, nowIso(), id);
  return true;
}

export function setAfterImage(userId: string, id: string, file: string | null, mime: string | null) {
  const b = getBoard(userId, id, true);
  if (!b) return null;
  db().prepare("update renovation_boards set after_file = ?, after_mime = ?, updated_at = ? where id = ?").run(file, mime, nowIso(), id);
  return b.after_file; // previous file, for deletion
}

export function deleteBoard(userId: string, id: string) {
  const b = getBoard(userId, id, true);
  if (!b) return null;
  db().prepare("delete from renovation_boards where id = ?").run(id);
  audit(b.org_id, userId, "renovation.deleted", { board_id: id });
  return [b.photo_file, b.after_file].filter(Boolean) as string[];
}

/** Boards the owner chose to show on a published listing. */
export function publicBoardsForListing(listingId: string) {
  return db()
    .prepare(
      `select b.* from renovation_boards b join listings l on l.id = b.listing_id
        where b.listing_id = ? and b.show_on_listing = 1 and l.status = 'published' order by b.created_at`,
    )
    .all(listingId) as Board[];
}

/** Image access: workspace members, or anyone when shown on a published listing. */
export function boardImageForViewer(id: string, which: "before" | "after", userId: string | null) {
  const b = load(id);
  if (!b) return null;
  const file = which === "before" ? b.photo_file : b.after_file;
  const mime = which === "before" ? b.photo_mime : b.after_mime;
  if (!file || !mime) return null;
  const allowedPublic =
    b.show_on_listing === 1 &&
    b.listing_id &&
    db().prepare("select 1 from listings where id = ? and status = 'published'").get(b.listing_id);
  if (allowedPublic) return { file, mime, isPublic: true };
  if (userId && roleOf(userId, b.org_id)) return { file, mime, isPublic: false };
  return null;
}
