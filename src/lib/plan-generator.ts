import type { FloorPlanT, RoomKind } from "@/lib/floor-plan";

// Generates a starter floor-plan diagram from the property type and bedroom
// count. Used by the AI listing agent; owners can then
// adjust it in the floor-plan editor.

export type PlanKind = "villa" | "apartment" | "penthouse" | "townhouse";
export type PanoSlot = "living" | "bedroom" | "terrace";

/** Which starter plan fits a property type (none for land, offices etc.). */
export function planKindFor(propertyType: string): PlanKind | null {
  switch (propertyType) {
    case "Villa": return "villa";
    case "Apartment": return "apartment";
    case "Penthouse": return "penthouse";
    case "Townhouse": return "townhouse";
    default: return null;
  }
}

function room(id: string, name: string, kind: RoomKind, x: number, y: number, w: number, h: number, panoId: string | null = null) {
  return { id, name, kind, x, y, w, h, panoId };
}

export function buildPlan(kind: PlanKind, beds: number, pano: Partial<Record<PanoSlot, string>> = {}): FloorPlanT {
  if (kind === "villa") {
    const rooms = [
      room("liv", "Living room", "living", 0, 0, 8, 6, pano.living ?? null),
      room("din", "Dining", "dining", 8, 0, 5, 6),
      room("kit", "Kitchen", "kitchen", 13, 0, 5, 5),
      room("maid", "Maid's room", "storage", 13, 5, 5, 3),
      room("ter", "Terrace", "balcony", 0, 6, 8, 5, pano.terrace ?? null),
      room("mbed", "Master bedroom", "bedroom", 8, 6, 5, 5, pano.bedroom ?? null),
      room("mbath", "Master bath", "bathroom", 13, 8, 5, 3),
    ];
    for (let i = 2; i <= Math.min(beds, 5); i++) rooms.push(room(`bed${i}`, `Bedroom ${i}`, "bedroom", (i - 2) * 5, 11, 5, 4));
    return { width: 20, height: 15, rooms };
  }
  if (kind === "penthouse") {
    return { width: 24, height: 14, rooms: [
      room("liv", "Living & dining", "living", 0, 0, 10, 7, pano.living ?? null),
      room("kit", "Kitchen", "kitchen", 10, 0, 5, 5),
      room("mbed", "Master suite", "bedroom", 15, 0, 9, 6, pano.bedroom ?? null),
      room("bed2", "Bedroom 2", "bedroom", 10, 5, 5, 4),
      room("bed3", "Bedroom 3", "bedroom", 15, 6, 5, 4),
      room("bed4", "Bedroom 4", "bedroom", 20, 6, 4, 4),
      room("ter", "Wrap-around terrace", "balcony", 0, 10, 24, 4, pano.terrace ?? null),
    ] };
  }
  if (kind === "townhouse") {
    return { width: 12, height: 14, rooms: [
      room("liv", "Living room", "living", 0, 0, 7, 5, pano.living ?? null),
      room("kit", "Kitchen", "kitchen", 7, 0, 5, 5),
      room("mbed", "Master bedroom", "bedroom", 0, 5, 6, 4.5),
      room("bed2", "Bedroom 2", "bedroom", 6, 5, 4, 4.5),
      room("bath", "Bath", "bathroom", 10, 5, 2, 4.5),
      room("bed3", "Bedroom 3", "bedroom", 0, 9.5, 5, 4.5),
      room("gar", "Garden", "balcony", 5, 9.5, 7, 4.5),
    ] };
  }
  // apartment (studio up to 4 bedrooms)
  const extra = Math.max(0, Math.min(beds, 4) - 2);
  const width = 10 + extra * 4;
  const rooms = [
    room("liv", beds === 0 ? "Studio living & sleeping" : "Living room", "living", 0, 0, 6, 5, pano.living ?? null),
    room("kit", "Kitchen", "kitchen", 6, 0, 3.5, 3.5),
    room("bath", "Bathroom", "bathroom", 6, 3.5, 3.5, 2.5),
    room("bal", "Balcony", "balcony", 0, 9, width - 0.5, 1.5),
  ];
  if (beds >= 1) rooms.push(room("mbed", "Bedroom 1", "bedroom", 0, 5, 5, 4, pano.bedroom ?? null));
  if (beds >= 2) rooms.push(room("bed2", "Bedroom 2", "bedroom", 5, 6, 4.5, 3));
  for (let i = 3; i <= Math.min(beds, 4); i++) rooms.push(room(`bed${i}`, `Bedroom ${i}`, "bedroom", 10 + (i - 3) * 4, 0, 4, 4.5));
  return { width, height: 11, rooms };
}
