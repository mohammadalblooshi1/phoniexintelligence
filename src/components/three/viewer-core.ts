"use client";

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";

/** A three.js stage: renderer, camera, orbit controls, lights and auto-framing. */
export function createStage(host: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.xr.enabled = true;
  renderer.domElement.style.touchAction = "none";
  host.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe9edf2);
  const camera = new THREE.PerspectiveCamera(45, host.clientWidth / host.clientHeight, 0.05, 5000);
  camera.position.set(12, 10, 14);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa0aa, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(20, 30, 10);
  scene.add(sun);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.495; // don't go under the ground

  let grid: THREE.GridHelper | null = null;

  /** Centres the object on the ground and moves the camera to show all of it. */
  function frame(object: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());
    object.position.x -= centre.x;
    object.position.z -= centre.z;
    object.position.y -= box.min.y;
    const radius = Math.max(size.x, size.y, size.z) || 1;
    const sphere = new THREE.Box3().setFromObject(object).getBoundingSphere(new THREE.Sphere());
    if (grid) scene.remove(grid);
    grid = new THREE.GridHelper(Math.ceil(radius * 3), Math.min(200, Math.ceil(radius * 3)), 0xb8c0cc, 0xd5dae1);
    scene.add(grid);
    camera.near = radius / 1000;
    camera.far = radius * 100;
    // distance that fits the whole object in view, seen from a three-quarter angle above
    const fit = (sphere.radius / Math.sin((camera.fov * Math.PI) / 360)) * 0.95;
    const dir = new THREE.Vector3(0.9, 0.85, 1.1).normalize();
    camera.position.copy(dir.multiplyScalar(fit));
    camera.updateProjectionMatrix();
    controls.target.set(0, size.y * 0.25, 0);
    controls.maxDistance = radius * 8;
    controls.update();
    home = { position: camera.position.clone(), target: controls.target.clone() };
  }
  let home: { position: THREE.Vector3; target: THREE.Vector3 } | null = null;
  function resetView() {
    if (!home) return;
    camera.position.copy(home.position);
    controls.target.copy(home.target);
    controls.update();
  }

  const resize = new ResizeObserver(() => {
    if (renderer.xr.isPresenting || !host.clientWidth) return;
    camera.aspect = host.clientWidth / host.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(host.clientWidth, host.clientHeight);
  });
  resize.observe(host);
  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });

  let vrButton: HTMLElement | null = null;
  navigator.xr?.isSessionSupported("immersive-vr").then((ok) => {
    if (!ok) return;
    vrButton = VRButton.createButton(renderer);
    host.appendChild(vrButton);
  }).catch(() => {});

  function dispose() {
    resize.disconnect();
    renderer.setAnimationLoop(null);
    controls.dispose();
    vrButton?.remove();
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose?.();
      const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
      for (const m of mats) {
        for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose();
        m.dispose();
      }
    });
    renderer.dispose();
    renderer.domElement.remove();
  }

  return { THREE, renderer, scene, camera, controls, frame, resetView, dispose };
}
