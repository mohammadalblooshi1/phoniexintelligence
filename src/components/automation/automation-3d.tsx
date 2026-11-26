"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Automation } from "@/lib/automations";
import { stepsFor } from "@/components/automation/steps";

const ORANGE = 0xf97316;
const SEGMENT_S = 1.3; // seconds for a pulse to travel one link
const THINK_S = 1.8; // seconds the agent "works"

function labelSprite(text: string, sub?: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = sub ? 190 : 120;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(15,23,42,0.86)";
  ctx.beginPath();
  ctx.roundRect(6, 6, 628, canvas.height - 12, 28);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "600 46px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const fit = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
  ctx.fillText(fit(text, 24), 320, sub ? 66 : 62);
  if (sub) {
    ctx.fillStyle = "#fdba74";
    ctx.font = "500 36px system-ui, sans-serif";
    ctx.fillText(fit(sub, 30), 320, 136);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sprite.scale.set(4, (4 * canvas.height) / canvas.width, 1);
  sprite.renderOrder = 10;
  return sprite;
}

/** Interactive 3D view of one automation: trigger → AI agent → approval → actions. */
export default function Automation3D({ automation, runId, onStep }: { automation: Automation; runId: number; onStep: (i: number) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const stepCb = useRef(onStep);
  useEffect(() => {
    stepCb.current = onStep;
  }, [onStep]);
  const steps = useMemo(() => stepsFor(automation), [automation]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.touchAction = "none";
    el.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1220);
    scene.fog = new THREE.Fog(0x0b1220, 22, 46);
    const camera = new THREE.PerspectiveCamera(45, el.clientWidth / el.clientHeight, 0.1, 200);
    const wide = el.clientWidth / el.clientHeight < 1 ? 1.6 : 1;
    camera.position.set(0, 6 * wide, 12.5 * wide);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0.6, 0);
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minDistance = 6;
    controls.maxDistance = 30;
    controls.autoRotate = !reduced;
    controls.autoRotateSpeed = 0.35;

    scene.add(new THREE.HemisphereLight(0xc7d2fe, 0x0b1220, 1.2));
    const key = new THREE.PointLight(ORANGE, 60, 30);
    key.position.set(0, 4, 2);
    scene.add(key);
    const grid = new THREE.GridHelper(40, 40, 0x1e3a5f, 0x14233a);
    grid.position.y = -1.2;
    scene.add(grid);

    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x);

    // ---- nodes
    const nodeMat = (color: number, emissive = 0) =>
      track(new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.15, roughness: 0.35, metalness: 0.3 }));
    const box = track(new THREE.BoxGeometry(1.4, 0.9, 1.4));
    const node = (pos: THREE.Vector3, color: number, title: string, sub?: string) => {
      const mat = nodeMat(color, color);
      const mesh = new THREE.Mesh(box, mat);
      mesh.position.copy(pos);
      scene.add(mesh);
      const label = labelSprite(title, sub);
      label.position.set(pos.x, pos.y + 1.5, pos.z);
      scene.add(label);
      disposables.push(label.material.map!, label.material);
      return { mesh, mat };
    };

    const a = automation;
    const trigger = node(new THREE.Vector3(-7, 0, 0), 0x3b82f6, a.trigger.label, "Trigger");
    const coreMat = track(new THREE.MeshStandardMaterial({ color: ORANGE, emissive: ORANGE, emissiveIntensity: 0.5, roughness: 0.2, metalness: 0.4, flatShading: true }));
    const core = new THREE.Mesh(track(new THREE.IcosahedronGeometry(1.15, 1)), coreMat);
    core.position.set(-1.5, 0.4, 0);
    scene.add(core);
    const ring = new THREE.Mesh(track(new THREE.TorusGeometry(1.8, 0.04, 8, 64)), track(new THREE.MeshBasicMaterial({ color: 0xfdba74 })));
    ring.position.copy(core.position);
    ring.rotation.x = Math.PI / 2.4;
    scene.add(ring);
    const coreLabel = labelSprite(a.agent.label, "AI agent");
    coreLabel.position.set(core.position.x, core.position.y + 2, 0);
    scene.add(coreLabel);
    disposables.push(coreLabel.material.map!, coreLabel.material);

    const gate = a.approval ? node(new THREE.Vector3(2.4, 0, 0), 0xa855f7, "Approval", a.approval) : null;
    const outX = a.approval ? 6.8 : 5.5;
    const spread = 3.2;
    const outs = a.actions.map((act, i) => {
      const z = (i - (a.actions.length - 1) / 2) * spread;
      return node(new THREE.Vector3(outX, 0, z), 0x22c55e, act.label, "Action");
    });

    // ---- links (curved tubes) and the order pulses travel along them
    const linkMat = track(new THREE.MeshBasicMaterial({ color: 0x334155 }));
    const link = (from: THREE.Vector3, to: THREE.Vector3) => {
      const mid = from.clone().lerp(to, 0.5).add(new THREE.Vector3(0, 1.1, 0));
      const curve = new THREE.QuadraticBezierCurve3(from.clone(), mid, to.clone());
      const tube = new THREE.Mesh(track(new THREE.TubeGeometry(curve, 40, 0.045, 8)), linkMat);
      scene.add(tube);
      return curve;
    };
    const toCore = link(trigger.mesh.position, core.position);
    const fromCore = gate ? link(core.position, gate.mesh.position) : null;
    const hub = gate ? gate.mesh.position : core.position;
    const toOuts = outs.map((o) => link(hub, o.mesh.position));

    // ---- pulses
    const pulseGeo = track(new THREE.SphereGeometry(0.17, 16, 16));
    const pulseMat = track(new THREE.MeshBasicMaterial({ color: 0xffedd5 }));
    const pulses = Array.from({ length: Math.max(1, outs.length) }, () => {
      const p = new THREE.Mesh(pulseGeo, pulseMat);
      p.visible = false;
      scene.add(p);
      return p;
    });
    const glowGeo = track(new THREE.SphereGeometry(0.34, 16, 16));
    const glowMat = track(new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.35 }));
    const glows = pulses.map((p) => {
      const g = new THREE.Mesh(glowGeo, glowMat);
      p.add(g);
      return g;
    });

    // ---- timeline: [trigger lights] → pulse to core → core thinks → (gate) → pulses to actions → done
    const tTrigger = 0.8;
    const t1 = tTrigger + SEGMENT_S;
    const t2 = t1 + THINK_S;
    const t3 = gate ? t2 + SEGMENT_S + 1.0 : t2; // travel + wait for approval
    const t4 = t3 + SEGMENT_S;
    const total = t4 + 2.5;
    const gateStep = gate ? 2 : -1;
    const firstAction = gate ? 3 : 2;

    const clock = new THREE.Clock();
    let lastStep = -1;
    const setStep = (i: number) => {
      if (i !== lastStep) {
        lastStep = i;
        stepCb.current(i);
      }
    };
    const glow = (m: THREE.MeshStandardMaterial, on: boolean) => (m.emissiveIntensity = on ? 0.9 : 0.15);

    let frame = 0;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      const t = Math.min(clock.getElapsedTime(), total);
      const spin = t > t1 && t < t2 ? 3 : 0.6;
      core.rotation.y += 0.01 * spin;
      core.rotation.x += 0.004 * spin;
      ring.rotation.z += 0.008 * spin;
      coreMat.emissiveIntensity = t > t1 && t < t2 ? 0.7 + Math.sin(t * 10) * 0.25 : 0.45;

      glow(trigger.mat, t < t1);
      pulses.forEach((p) => (p.visible = false));
      glows.forEach((g) => g.scale.setScalar(1 + Math.sin(t * 12) * 0.15));

      if (t < tTrigger) setStep(0);
      else if (t < t1) {
        setStep(0);
        pulses[0].visible = true;
        pulses[0].position.copy(toCore.getPoint((t - tTrigger) / SEGMENT_S));
      } else if (t < t2) setStep(1);
      else if (gate && fromCore && t < t3) {
        setStep(gateStep);
        const k = Math.min(1, (t - t2) / SEGMENT_S);
        pulses[0].visible = k < 1;
        pulses[0].position.copy(fromCore.getPoint(k));
        glow(gate.mat, k >= 1);
        gate.mat.color.setHex(k >= 1 && t > t3 - 0.4 ? 0x22c55e : 0xa855f7);
      } else if (t < t4) {
        const k = (t - t3) / SEGMENT_S;
        setStep(firstAction + Math.min(outs.length - 1, Math.floor(k * outs.length)));
        toOuts.forEach((c, i) => {
          pulses[i].visible = true;
          pulses[i].position.copy(c.getPoint(Math.min(1, k)));
        });
      } else {
        setStep(steps.length - 1);
        outs.forEach((o) => glow(o.mat, true));
      }
      if (t < t4) outs.forEach((o) => glow(o.mat, false));
      if (gate && t >= t3) gate.mat.color.setHex(0x22c55e);

      controls.update();
      renderer.render(scene, camera);
    };
    tick();

    const resize = new ResizeObserver(() => {
      if (!el.clientWidth) return;
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    });
    resize.observe(el);

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      controls.dispose();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [automation, runId, steps]);

  return (
    <div
      ref={host}
      role="img"
      aria-label={`3D animation of the "${automation.title}" automation: ${steps.map((s) => s.title).join(", then ")}.`}
      className="relative h-[52vh] min-h-[340px] w-full overflow-hidden rounded-xl border border-border bg-[#0b1220]"
    >
      <span className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-white/10 px-2 py-1 text-xs text-white/80">Drag to rotate · scroll to zoom</span>
    </div>
  );
}
