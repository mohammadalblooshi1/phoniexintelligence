"use client";

import { useEffect, useRef } from "react";
import { LngLatBounds, Marker, NavigationControl, Popup } from "maplibre-gl";
import { createMap } from "@/components/map/map-core";

type Pin = { id: string; lat: number; lng: number; title: string; price: string };

/** Map of search results. */
export default function PropertiesMap({ pins }: { pins: Pin[] }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return;
    const map = createMap(host.current, { lat: 24.9, lng: 55.2, zoom: 7, view: "map" });
    map.addControl(new NavigationControl(), "top-right");
    const bounds = new LngLatBounds();
    for (const p of pins) {
      const html = document.createElement("div");
      const a = document.createElement("a");
      a.href = `/properties/${p.id}`;
      a.textContent = p.title;
      a.style.cssText = "font-weight:600;color:#c2410c;text-decoration:underline";
      const price = document.createElement("div");
      price.textContent = p.price;
      html.append(a, price);
      new Marker({ color: "#e8590c" }).setLngLat([p.lng, p.lat]).setPopup(new Popup({ offset: 24 }).setDOMContent(html)).addTo(map);
      bounds.extend([p.lng, p.lat]);
    }
    if (pins.length) map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 0 });
    return () => map.remove();
  }, [pins]);
  return <div ref={host} className="h-[560px] w-full overflow-hidden rounded-xl border border-border bg-surface-2" role="region" aria-label="Map of properties" />;
}
