"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { createStage } from "@/components/three/viewer-core";
import { StageFrame } from "@/components/three/stage-frame";

/** Shows an uploaded 3D design (.glb or .obj) that visitors can orbit and zoom. */
export default function ModelViewer({ src, format, label }: { src: string; format: "glb" | "obj"; label: string }) {
  const host = useRef<HTMLDivElement>(null);
  const reset = useRef<() => void>(() => {});
  const [status, setStatus] = useState<string | null>("Loading 3D model…");

  useEffect(() => {
    if (!host.current) return;
    const stage = createStage(host.current);
    reset.current = stage.resetView;
    let cancelled = false;
    const progress = (e: ProgressEvent) => {
      if (!cancelled && e.lengthComputable) setStatus(`Loading 3D model… ${Math.round((e.loaded / e.total) * 100)}%`);
    };
    const fail = () => !cancelled && setStatus("This 3D model could not be displayed.");

    if (format === "glb") {
      const draco = new DRACOLoader().setDecoderPath("/draco/");
      const loader = new GLTFLoader().setDRACOLoader(draco).setMeshoptDecoder(MeshoptDecoder);
      loader.load(src, (gltf) => {
        if (cancelled) return;
        stage.scene.add(gltf.scene);
        stage.frame(gltf.scene);
        setStatus(null);
        draco.dispose();
      }, progress, fail);
    } else {
      new OBJLoader().load(src, (obj) => {
        if (cancelled) return;
        const material = new THREE.MeshStandardMaterial({ color: 0xd9d4cb, roughness: 0.85, side: THREE.DoubleSide });
        obj.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).material = material; });
        stage.scene.add(obj);
        stage.frame(obj);
        setStatus(null);
      }, progress, fail);
    }
    return () => {
      cancelled = true;
      stage.dispose();
    };
  }, [src, format]);

  return <StageFrame hostRef={host} label={label} status={status} onReset={() => reset.current()} />;
}
