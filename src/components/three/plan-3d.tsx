"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createStage } from "@/components/three/viewer-core";
import { StageFrame } from "@/components/three/stage-frame";
import { ROOM_COLORS, type FloorPlanT } from "@/lib/floor-plan";

const WALL = 0.12;

function label(text: string, size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.beginPath();
  ctx.roundRect(8, 24, 496, 80, 24);
  ctx.fill();
  ctx.fillStyle = "#13203a";
  ctx.font = "600 44px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text.length > 18 ? `${text.slice(0, 17)}…` : text, 256, 66);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
  sprite.scale.set(size, size / 4, 1);
  sprite.renderOrder = 10;
  return sprite;
}

/** Cutaway walls (1 m) show the layout from above; full height (2.8 m) shows the real volume. */
function setWallHeights(meshes: THREE.Mesh[], cutaway: boolean) {
  for (const w of meshes) {
    const h = cutaway ? Math.min(1.0, w.userData.full) : w.userData.full;
    w.scale.y = h;
    w.position.y = h / 2 + 0.06;
  }
}

/** Turns the 2D floor-plan diagram into a 3D "dollhouse" model. */
export default function Plan3D({ plan, label: title }: { plan: FloorPlanT; label: string }) {
  const host = useRef<HTMLDivElement>(null);
  const reset = useRef<() => void>(() => {});
  const walls = useRef<THREE.Mesh[]>([]);
  const [cutaway, setCutaway] = useState(true);

  useEffect(() => {
    if (!host.current) return;
    const stage = createStage(host.current);
    reset.current = stage.resetView;
    const house = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf6f3ee, roughness: 0.9 });
    const ground = new THREE.Mesh(
      new THREE.BoxGeometry(plan.width, 0.04, plan.height),
      new THREE.MeshStandardMaterial({ color: 0xcfc8ba, roughness: 1 }),
    );
    ground.position.set(plan.width / 2, -0.02, plan.height / 2);
    house.add(ground);
    walls.current = [];

    for (const r of plan.rooms) {
      const floor = new THREE.Mesh(
        new THREE.BoxGeometry(r.w, 0.06, r.h),
        new THREE.MeshStandardMaterial({ color: ROOM_COLORS[r.kind], roughness: 0.8 }),
      );
      floor.position.set(r.x + r.w / 2, 0.03, r.y + r.h / 2);
      house.add(floor);
      const open = r.kind === "balcony"; // terraces get low railings only
      const edges: [number, number, number, number][] = [
        [r.x + r.w / 2, r.y, r.w, WALL], [r.x + r.w / 2, r.y + r.h, r.w, WALL],
        [r.x, r.y + r.h / 2, WALL, r.h], [r.x + r.w, r.y + r.h / 2, WALL, r.h],
      ];
      for (const [cx, cz, sx, sz] of edges) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(sx, 1, sz), wallMat);
        wall.userData.full = open ? 1.1 : 2.8;
        wall.position.set(cx, 0, cz);
        house.add(wall);
        walls.current.push(wall);
      }
      const tag = label(r.name, Math.max(1.6, Math.min(4, r.w * 0.7)));
      tag.position.set(r.x + r.w / 2, 1.6, r.y + r.h / 2);
      house.add(tag);
    }
    stage.scene.add(house);
    stage.frame(house);
    return () => stage.dispose();
  }, [plan]);

  useEffect(() => setWallHeights(walls.current, cutaway), [cutaway, plan]);

  return (
    <StageFrame hostRef={host} label={title} onReset={() => reset.current()}>
      <button type="button" onClick={() => setCutaway((c) => !c)} className="rounded-md bg-black/60 px-2.5 py-1 text-xs text-white hover:bg-black/80">
        {cutaway ? "Full-height walls" : "Cutaway walls"}
      </button>
    </StageFrame>
  );
}
