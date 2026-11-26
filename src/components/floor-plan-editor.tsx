"use client";

import { useRef, useState, useTransition } from "react";
import { FloorPlanSvg } from "@/components/floor-plan-svg";
import { ROOM_KINDS, SQFT_PER_M2, totalArea, type FloorPlanT, type RoomKind } from "@/lib/floor-plan";
import { saveFloorPlanAction } from "@/lib/actions/listings";

const snap = (v: number) => Math.round(v * 2) / 2; // 0.5 m grid
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const KIND_LABEL: Record<RoomKind, string> = {
  living: "Living room", bedroom: "Bedroom", kitchen: "Kitchen", bathroom: "Bathroom",
  dining: "Dining", balcony: "Balcony / terrace", storage: "Storage / maid", other: "Other",
};

export function FloorPlanEditor({
  listingId,
  initial,
  panoramas,
  readOnly,
}: {
  listingId: string;
  initial: FloorPlanT;
  panoramas: { id: string; title: string }[];
  readOnly: boolean;
}) {
  const [plan, setPlan] = useState<FloorPlanT>(initial);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; mode: "move" | "resize"; dx: number; dy: number } | null>(null);

  const selected = plan.rooms.find((r) => r.id === selectedId) ?? null;
  const area = totalArea(plan);

  function update(next: FloorPlanT) {
    setPlan(next);
    setDirty(true);
    setMessage(null);
  }
  function updateRoom(id: string, patch: Partial<FloorPlanT["rooms"][number]>) {
    update({
      ...plan,
      rooms: plan.rooms.map((r) => {
        if (r.id !== id) return r;
        const n = { ...r, ...patch };
        n.w = clamp(n.w, 0.5, plan.width);
        n.h = clamp(n.h, 0.5, plan.height);
        n.x = clamp(n.x, 0, plan.width - n.w);
        n.y = clamp(n.y, 0, plan.height - n.h);
        return n;
      }),
    });
  }

  function toPlan(e: React.PointerEvent | PointerEvent) {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  }

  function onRoomPointerDown(e: React.PointerEvent, id: string, mode: "move" | "resize") {
    if (readOnly) return;
    e.preventDefault();
    setSelectedId(id);
    const r = plan.rooms.find((x) => x.id === id)!;
    const p = toPlan(e);
    drag.current = { id, mode, dx: p.x - (mode === "move" ? r.x : r.x + r.w), dy: p.y - (mode === "move" ? r.y : r.y + r.h) };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const r = plan.rooms.find((x) => x.id === d.id);
    if (!r) return;
    const p = toPlan(e);
    if (d.mode === "move") updateRoom(d.id, { x: snap(p.x - d.dx), y: snap(p.y - d.dy) });
    else updateRoom(d.id, { w: snap(p.x - d.dx - r.x), h: snap(p.y - d.dy - r.y) });
  }

  function addRoom(kind: RoomKind) {
    const w = kind === "bathroom" || kind === "storage" ? 2.5 : 4;
    const h = kind === "bathroom" || kind === "storage" ? 2.5 : 4;
    // first free grid spot, scanning left-to-right, top-to-bottom
    let pos = { x: 0, y: 0 };
    outer: for (let y = 0; y + h <= plan.height; y += 0.5) {
      for (let x = 0; x + w <= plan.width; x += 0.5) {
        if (!plan.rooms.some((r) => x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y)) {
          pos = { x, y };
          break outer;
        }
      }
    }
    const count = plan.rooms.filter((r) => r.kind === kind).length + 1;
    const name = kind === "bedroom" ? `Bedroom ${count}` : kind === "bathroom" ? `Bath ${count}` : KIND_LABEL[kind].split(" /")[0];
    const room = { id: crypto.randomUUID().slice(0, 8), name, kind, ...pos, w, h, panoId: null };
    update({ ...plan, rooms: [...plan.rooms, room] });
    setSelectedId(room.id);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!selected || readOnly) return;
    const move: Record<string, [number, number]> = { ArrowLeft: [-0.5, 0], ArrowRight: [0.5, 0], ArrowUp: [0, -0.5], ArrowDown: [0, 0.5] };
    if (move[e.key]) {
      e.preventDefault();
      updateRoom(selected.id, { x: selected.x + move[e.key][0], y: selected.y + move[e.key][1] });
    } else if (e.key === "Delete" || e.key === "Backspace") {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      update({ ...plan, rooms: plan.rooms.filter((r) => r.id !== selected.id) });
      setSelectedId(null);
    }
  }

  function save() {
    startTransition(async () => {
      const clean = { ...plan, rooms: plan.rooms.map((r) => ({ ...r, name: r.name.trim() || "Room" })) };
      const res = await saveFloorPlanAction(listingId, clean);
      setMessage(res ? { ok: res.ok, text: res.message } : null);
      if (res?.ok) setDirty(false);
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]" onKeyDown={onKeyDown}>
      <div
        className="rounded-lg border border-border bg-bg p-2 outline-none focus-visible:ring-2 focus-visible:ring-accent"
        tabIndex={0}
        aria-label="Floor plan canvas. Select a room, then drag it or use arrow keys to move it."
        onPointerMove={onPointerMove}
        onPointerUp={() => (drag.current = null)}
        onPointerLeave={() => (drag.current = null)}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget || (e.target as Element).tagName === "svg") setSelectedId(null);
        }}
      >
        <FloorPlanSvg ref={svgRef} plan={plan} selectedId={selectedId} editable={!readOnly} onRoomPointerDown={onRoomPointerDown} />
      </div>

      <div className="space-y-4 text-sm">
        <div className="rounded-lg border border-border p-3">
          <p className="font-medium">Total floor area</p>
          <p className="text-2xl font-bold tabular-nums">{area.toFixed(1)} m²</p>
          <p className="text-xs text-muted">≈ {Math.round(area * SQFT_PER_M2).toLocaleString()} sq ft (sum of rooms drawn)</p>
        </div>

        {!readOnly ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs">Plot width (m)
                <input type="number" min={4} max={200} value={plan.width} className="input mt-1"
                  onChange={(e) => {
                    const width = clamp(Number(e.target.value) || 4, Math.max(4, ...plan.rooms.map((r) => r.x + r.w)), 200);
                    update({ ...plan, width });
                  }} />
              </label>
              <label className="text-xs">Plot depth (m)
                <input type="number" min={4} max={200} value={plan.height} className="input mt-1"
                  onChange={(e) => {
                    const height = clamp(Number(e.target.value) || 4, Math.max(4, ...plan.rooms.map((r) => r.y + r.h)), 200);
                    update({ ...plan, height });
                  }} />
              </label>
            </div>

            <div>
              <p className="mb-1 text-xs font-medium">Add a room</p>
              <div className="flex flex-wrap gap-1">
                {ROOM_KINDS.map((k) => (
                  <button key={k} type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => addRoom(k)} disabled={plan.rooms.length >= 60}>
                    + {KIND_LABEL[k]}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : null}

        {selected && !readOnly ? (
          <div className="space-y-2 rounded-lg border border-accent p-3">
            <p className="font-medium">Selected room</p>
            <label className="block text-xs">Name
              <input className="input mt-1" value={selected.name} maxLength={40} onChange={(e) => updateRoom(selected.id, { name: e.target.value })} />
            </label>
            <label className="block text-xs">Type
              <select className="input mt-1" value={selected.kind} onChange={(e) => updateRoom(selected.id, { kind: e.target.value as RoomKind })}>
                {ROOM_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs">Width (m)
                <input type="number" step={0.5} min={0.5} className="input mt-1" value={selected.w} onChange={(e) => updateRoom(selected.id, { w: Number(e.target.value) || 0.5 })} />
              </label>
              <label className="text-xs">Depth (m)
                <input type="number" step={0.5} min={0.5} className="input mt-1" value={selected.h} onChange={(e) => updateRoom(selected.id, { h: Number(e.target.value) || 0.5 })} />
              </label>
            </div>
            <label className="block text-xs">360° photo for this room
              <select className="input mt-1" value={selected.panoId ?? ""} onChange={(e) => updateRoom(selected.id, { panoId: e.target.value || null })}>
                <option value="">None</option>
                {panoramas.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </label>
            {panoramas.length === 0 ? <p className="text-xs text-muted">Upload 360° photos below to link them to rooms.</p> : null}
            <button type="button" className="btn-ghost px-2 py-1 text-xs text-danger"
              onClick={() => { update({ ...plan, rooms: plan.rooms.filter((r) => r.id !== selected.id) }); setSelectedId(null); }}>
              Delete room
            </button>
          </div>
        ) : !readOnly ? (
          <p className="text-xs text-muted">Click a room to select it. Drag to move, drag the orange corner to resize, or use arrow keys.</p>
        ) : null}

        {!readOnly ? (
          <div className="space-y-2">
            <button type="button" className="btn-primary w-full" onClick={save} disabled={pending || !dirty}>
              {pending ? "Saving…" : dirty ? "Save floor plan" : "Saved"}
            </button>
            {message ? <p role="status" className={`text-xs ${message.ok ? "text-ok" : "text-danger"}`}>{message.text}</p> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
