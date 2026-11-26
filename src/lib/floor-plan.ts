import { z } from "zod";

// Floor-plan diagram format, shared by the editor (client) and the server.
// Units are metres; x/y is the room's top-left corner.

export const ROOM_KINDS = ["living", "bedroom", "kitchen", "bathroom", "dining", "balcony", "storage", "other"] as const;
export type RoomKind = (typeof ROOM_KINDS)[number];

export const ROOM_COLORS: Record<RoomKind, string> = {
  living: "#f6c28b",
  bedroom: "#9cc5f0",
  kitchen: "#f3a6a0",
  bathroom: "#9fe0d3",
  dining: "#f7dc8f",
  balcony: "#b9e3a1",
  storage: "#cfc6e8",
  other: "#d9dde4",
};

const Room = z.object({
  id: z.string().min(1).max(40),
  name: z.string().trim().min(1).max(40),
  kind: z.enum(ROOM_KINDS),
  x: z.number().min(0).max(200),
  y: z.number().min(0).max(200),
  w: z.number().min(0.5).max(200),
  h: z.number().min(0.5).max(200),
  panoId: z.string().max(40).nullable().optional(),
});

export const FloorPlan = z
  .object({
    width: z.number().min(4).max(200),
    height: z.number().min(4).max(200),
    rooms: z.array(Room).max(60),
  })
  .refine((p) => p.rooms.every((r) => r.x + r.w <= p.width + 1e-6 && r.y + r.h <= p.height + 1e-6), {
    message: "Every room must fit inside the plot",
  });

export type FloorPlanT = z.infer<typeof FloorPlan>;
export type RoomT = FloorPlanT["rooms"][number];

export const EMPTY_PLAN: FloorPlanT = { width: 20, height: 14, rooms: [] };

export function parsePlan(json: string): FloorPlanT {
  try {
    const r = FloorPlan.safeParse(JSON.parse(json));
    return r.success ? r.data : EMPTY_PLAN;
  } catch {
    return EMPTY_PLAN;
  }
}

export const roomArea = (r: RoomT) => r.w * r.h;
export const totalArea = (p: FloorPlanT) => p.rooms.reduce((s, r) => s + roomArea(r), 0);
export const SQFT_PER_M2 = 10.7639;
