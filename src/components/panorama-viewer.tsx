"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";

/**
 * 360° panorama viewer for equirectangular photos (2:1 images from 360° cameras
 * or phone panorama modes). Drag / swipe to look around, scroll or pinch-zoom
 * buttons to zoom, and "Enter VR" on WebXR headsets (e.g. Meta Quest browser).
 */
export function PanoramaViewer({ src, label }: { src: string; label: string }) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ setSrc: (s: string) => void; zoom: (d: number) => void } | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [vr, setVr] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.xr.enabled = true;
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.style.cursor = "grab";
    el.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, el.clientWidth / el.clientHeight, 0.1, 1100);
    const geometry = new THREE.SphereGeometry(500, 64, 40);
    geometry.scale(-1, 1, 1); // view the sphere from the inside
    const material = new THREE.MeshBasicMaterial({ color: 0x222222 });
    scene.add(new THREE.Mesh(geometry, material));

    let lon = 0;
    let lat = 0;
    let dragging = false;
    let interacted = false;
    let start = { x: 0, y: 0, lon: 0, lat: 0 };
    let texture: THREE.Texture | null = null;
    const loader = new THREE.TextureLoader();

    const setSrc = (url: string) => {
      setLoading(true);
      setFailed(false);
      loader.load(
        url,
        (t) => {
          t.colorSpace = THREE.SRGBColorSpace;
          texture?.dispose();
          texture = t;
          material.map = t;
          material.color.set(0xffffff);
          material.needsUpdate = true;
          lon = 0;
          lat = 0;
          setLoading(false);
        },
        undefined,
        () => {
          setLoading(false);
          setFailed(true);
        },
      );
    };

    const zoom = (delta: number) => {
      camera.fov = THREE.MathUtils.clamp(camera.fov + delta, 30, 95);
      camera.updateProjectionMatrix();
    };

    const onDown = (e: PointerEvent) => {
      dragging = interacted = true;
      start = { x: e.clientX, y: e.clientY, lon, lat };
      renderer.domElement.setPointerCapture(e.pointerId);
      renderer.domElement.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const speed = 0.1 * (camera.fov / 75);
      lon = start.lon - (e.clientX - start.x) * speed;
      lat = start.lat + (e.clientY - start.y) * speed;
    };
    const onUp = () => {
      dragging = false;
      renderer.domElement.style.cursor = "grab";
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoom(e.deltaY * 0.05);
    };
    const onKey = (e: KeyboardEvent) => {
      const step = 5;
      if (e.key === "ArrowLeft") lon -= step;
      else if (e.key === "ArrowRight") lon += step;
      else if (e.key === "ArrowUp") lat += step;
      else if (e.key === "ArrowDown") lat -= step;
      else return;
      interacted = true;
      e.preventDefault();
    };

    const canvas = renderer.domElement;
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("keydown", onKey);

    const resize = new ResizeObserver(() => {
      if (renderer.xr.isPresenting) return;
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    });
    resize.observe(el);

    const target = new THREE.Vector3();
    renderer.setAnimationLoop(() => {
      if (!renderer.xr.isPresenting) {
        if (!interacted) lon += 0.03; // gentle auto-rotate until the user takes over
        lat = THREE.MathUtils.clamp(lat, -85, 85);
        const phi = THREE.MathUtils.degToRad(90 - lat);
        const theta = THREE.MathUtils.degToRad(lon);
        target.setFromSphericalCoords(1, phi, theta);
        camera.lookAt(target);
      }
      renderer.render(scene, camera);
    });

    // Only offer VR when the browser and device support it.
    let vrButton: HTMLElement | null = null;
    navigator.xr?.isSessionSupported("immersive-vr").then((ok) => {
      if (!ok || !host.current) return;
      vrButton = VRButton.createButton(renderer);
      host.current.appendChild(vrButton);
      setVr(true);
    }).catch(() => {});

    api.current = { setSrc, zoom };

    return () => {
      api.current = null;
      resize.disconnect();
      el.removeEventListener("keydown", onKey);
      renderer.setAnimationLoop(null);
      vrButton?.remove();
      texture?.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, []);

  useEffect(() => {
    api.current?.setSrc(src);
  }, [src]);

  return (
    <div
      ref={host}
      tabIndex={0}
      role="application"
      aria-label={`360° view of ${label}. Drag or use arrow keys to look around.`}
      className="relative h-[60vh] max-h-[560px] min-h-[320px] w-full overflow-hidden rounded-xl bg-black outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
        360° · {label}
      </div>
      <div className="absolute right-3 top-3 flex gap-1">
        <button type="button" onClick={() => api.current?.zoom(-10)} className="rounded-md bg-black/60 px-2.5 py-1 text-sm text-white hover:bg-black/80" aria-label="Zoom in">+</button>
        <button type="button" onClick={() => api.current?.zoom(10)} className="rounded-md bg-black/60 px-2.5 py-1 text-sm text-white hover:bg-black/80" aria-label="Zoom out">−</button>
        <button
          type="button"
          onClick={() => (document.fullscreenElement ? document.exitFullscreen() : host.current?.requestFullscreen())}
          className="rounded-md bg-black/60 px-2.5 py-1 text-xs text-white hover:bg-black/80"
        >
          Full screen
        </button>
      </div>
      {loading ? <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-white/80">Loading 360° view…</div> : null}
      {failed ? <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">Could not load this 360° photo.</div> : null}
      {!vr ? (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-black/60 px-2 py-1 text-xs text-white/90">
          Drag to look around · open on a VR headset browser for VR mode
        </div>
      ) : null}
    </div>
  );
}
