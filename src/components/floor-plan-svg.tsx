"use client";

import { forwardRef } from "react";
import { ROOM_COLORS, roomArea, type FloorPlanT } from "@/lib/floor-plan";

type Props = {
  plan: FloorPlanT;
  selectedId?: string | null;
  /** Public view: rooms that have a linked 360° photo become clickable. */
  onRoomClick?: (roomId: string) => void;
  activeRoomId?: string | null;
  editable?: boolean;
  onRoomPointerDown?: (e: React.PointerEvent, roomId: string, mode: "move" | "resize") => void;
};

/** Floor-plan diagram drawn in metres (1 SVG unit = 1 m). */
export const FloorPlanSvg = forwardRef<SVGSVGElement, Props>(function FloorPlanSvg(
  { plan, selectedId, onRoomClick, activeRoomId, editable, onRoomPointerDown },
  ref,
) {
  const pad = 0.6;
  const font = Math.max(0.35, Math.min(plan.width, plan.height) / 32);
  const gridLines = [];
  for (let x = 1; x < plan.width; x++) gridLines.push(<line key={`x${x}`} x1={x} y1={0} x2={x} y2={plan.height} />);
  for (let y = 1; y < plan.height; y++) gridLines.push(<line key={`y${y}`} x1={0} y1={y} x2={plan.width} y2={y} />);

  return (
    <svg
      ref={ref}
      viewBox={`${-pad} ${-pad} ${plan.width + pad * 2} ${plan.height + pad * 2}`}
      className="h-auto w-full select-none"
      style={{ touchAction: editable ? "none" : "auto" }}
      role="img"
      aria-label={`Floor plan with ${plan.rooms.length} rooms`}
    >
      <rect x={0} y={0} width={plan.width} height={plan.height} fill="var(--surface)" stroke="var(--border)" strokeWidth={0.06} />
      <g stroke="var(--border)" strokeWidth={0.02}>{gridLines}</g>
      {plan.rooms.map((r) => {
        const clickable = Boolean(onRoomClick && r.panoId);
        const selected = r.id === selectedId || r.id === activeRoomId;
        const area = roomArea(r);
        return (
          <g
            key={r.id}
            onPointerDown={editable ? (e) => onRoomPointerDown?.(e, r.id, "move") : undefined}
            onClick={clickable ? () => onRoomClick!(r.id) : undefined}
            onKeyDown={clickable ? (e) => (e.key === "Enter" || e.key === " ") && onRoomClick!(r.id) : undefined}
            tabIndex={clickable ? 0 : undefined}
            role={clickable ? "button" : undefined}
            aria-label={clickable ? `Open 360° view of ${r.name}` : undefined}
            style={{ cursor: editable ? "move" : clickable ? "pointer" : "default" }}
          >
            <rect
              x={r.x}
              y={r.y}
              width={r.w}
              height={r.h}
              fill={ROOM_COLORS[r.kind]}
              fillOpacity={0.85}
              stroke={selected ? "var(--accent)" : "#33415c"}
              strokeWidth={selected ? 0.14 : 0.08}
            />
            <text x={r.x + r.w / 2} y={r.y + r.h / 2 - font * 0.2} textAnchor="middle" fontSize={font} fontWeight={600} fill="#13203a">
              {r.name}
            </text>
            <text x={r.x + r.w / 2} y={r.y + r.h / 2 + font * 1.0} textAnchor="middle" fontSize={font * 0.8} fill="#33415c">
              {area.toFixed(1)} m²
            </text>
            {r.panoId ? (
              <text x={r.x + 0.2} y={r.y + font * 1.1} fontSize={font * 0.8} fontWeight={700} fill="#b8420a">360°</text>
            ) : null}
            {editable && r.id === selectedId ? (
              <rect
                x={r.x + r.w - 0.45}
                y={r.y + r.h - 0.45}
                width={0.45}
                height={0.45}
                fill="var(--accent)"
                style={{ cursor: "nwse-resize" }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onRoomPointerDown?.(e, r.id, "resize");
                }}
              />
            ) : null}
          </g>
        );
      })}
      <text x={0} y={plan.height + pad * 0.85} fontSize={font * 0.8} fill="var(--muted)">
        {plan.width} m × {plan.height} m plot · grid = 1 m
      </text>
    </svg>
  );
});
