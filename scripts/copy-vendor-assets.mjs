// Copies browser-side helper files from node_modules into public/ so they can be
// loaded at runtime: MapLibre's web worker and three.js's Draco mesh decoder.
import { copyFileSync, mkdirSync, existsSync } from "node:fs";

const copies = [
  ["node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", "public/maplibre/maplibre-gl-worker.mjs"],
  ["node_modules/three/examples/jsm/libs/draco/gltf/draco_decoder.js", "public/draco/draco_decoder.js"],
  ["node_modules/three/examples/jsm/libs/draco/gltf/draco_decoder.wasm", "public/draco/draco_decoder.wasm"],
  ["node_modules/three/examples/jsm/libs/draco/gltf/draco_wasm_wrapper.js", "public/draco/draco_wasm_wrapper.js"],
];
for (const [src, dest] of copies) {
  if (!existsSync(src)) continue;
  mkdirSync(dest.slice(0, dest.lastIndexOf("/")), { recursive: true });
  copyFileSync(src, dest);
}
