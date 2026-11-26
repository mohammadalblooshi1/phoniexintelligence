"use client";

import dynamic from "next/dynamic";

// 3D viewers use WebGL, so they load only in the browser.
const loading = () => <div className="h-[60vh] max-h-[560px] min-h-[320px] w-full animate-pulse rounded-xl bg-surface-2" />;
export const ModelViewer = dynamic(() => import("@/components/three/model-viewer"), { ssr: false, loading });
export const Plan3D = dynamic(() => import("@/components/three/plan-3d"), { ssr: false, loading });
