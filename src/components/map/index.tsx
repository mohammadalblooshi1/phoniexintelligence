"use client";

import dynamic from "next/dynamic";

// Maps use WebGL and browser APIs, so they load only in the browser.
const placeholder = (h: string) => function MapLoading() {
  return <div className={`${h} w-full animate-pulse rounded-xl bg-surface-2`} />;
};

export const LocationPicker = dynamic(() => import("@/components/map/location-picker"), { ssr: false, loading: placeholder("h-[420px]") });
export const PropertyMap = dynamic(() => import("@/components/map/property-map"), { ssr: false, loading: placeholder("h-[440px]") });
export const PropertiesMap = dynamic(() => import("@/components/map/properties-map"), { ssr: false, loading: placeholder("h-[560px]") });
