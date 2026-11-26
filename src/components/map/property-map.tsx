"use client";

import { useEffect, useRef, useState } from "react";
import { Marker, NavigationControl, Popup, type Map as MLMap, type GeoJSONSource } from "maplibre-gl";
import { circlePolygon, createMap, setView, type MapView } from "@/components/map/map-core";
import { ViewToggle } from "@/components/map/view-toggle";
import { APPROX_RADIUS_M, NEARBY_CATEGORIES, describeDistance, type NearbyPlace } from "@/lib/places";

type Props = { lat: number; lng: number; precision: "exact" | "approximate"; nearby: NearbyPlace[]; title: string };

const COLOR = Object.fromEntries(NEARBY_CATEGORIES.map((c) => [c.key, c.color]));

function dot(color: string, label: string) {
  const el = document.createElement("button");
  el.type = "button";
  el.setAttribute("aria-label", label);
  el.style.cssText = `width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4);cursor:pointer;padding:0`;
  return el;
}

/** Public map: property pin (or approximate circle) plus nearby places. */
export default function PropertyMap({ lat, lng, precision, nearby, title }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [view, setViewState] = useState<MapView>("map");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const markers = useRef<{ category: string; marker: Marker }[]>([]);

  useEffect(() => {
    if (!host.current) return;
    const map = createMap(host.current, { lat, lng, zoom: precision === "exact" ? 15.5 : 14.5, view: "map" });
    map.addControl(new NavigationControl({ visualizePitch: true }), "top-right");
    mapRef.current = map;

    const addArea = () => {
      if (precision !== "approximate" || map.getSource("phx-area")) return;
      map.addSource("phx-area", { type: "geojson", data: circlePolygon(lat, lng, APPROX_RADIUS_M) });
      map.addLayer({ id: "phx-area-fill", type: "fill", source: "phx-area", paint: { "fill-color": "#e8590c", "fill-opacity": 0.18 } });
      map.addLayer({ id: "phx-area-line", type: "line", source: "phx-area", paint: { "line-color": "#e8590c", "line-width": 2 } });
    };
    map.on("style.load", addArea);
    if (precision === "exact") new Marker({ color: "#e8590c" }).setLngLat([lng, lat]).setPopup(new Popup({ offset: 24 }).setText(title)).addTo(map);

    markers.current = nearby.map((p) => {
      const m = new Marker({ element: dot(COLOR[p.category], `${p.name}, ${describeDistance(p.distance)}`) })
        .setLngLat([p.lng, p.lat])
        .setPopup(new Popup({ offset: 10 }).setText(`${p.name} · ${describeDistance(p.distance)}`))
        .addTo(map);
      return { category: p.category, marker: m };
    });
    return () => {
      markers.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng, precision, nearby, title]);

  useEffect(() => {
    for (const { category, marker } of markers.current) marker.getElement().style.display = hidden.has(category) ? "none" : "";
  }, [hidden]);

  function changeView(v: MapView) {
    setViewState(v);
    const map = mapRef.current;
    if (!map) return;
    setView(map, v, () => {
      if (precision === "approximate" && !map.getSource("phx-area")) {
        map.addSource("phx-area", { type: "geojson", data: circlePolygon(lat, lng, APPROX_RADIUS_M) });
        map.addLayer({ id: "phx-area-fill", type: "fill", source: "phx-area", paint: { "fill-color": "#e8590c", "fill-opacity": 0.18 } });
        map.addLayer({ id: "phx-area-line", type: "line", source: "phx-area", paint: { "line-color": "#e8590c", "line-width": 2 } });
      } else (map.getSource("phx-area") as GeoJSONSource | undefined)?.setData(circlePolygon(lat, lng, APPROX_RADIUS_M));
    });
  }

  const present = NEARBY_CATEGORIES.filter((c) => nearby.some((p) => p.category === c.key));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ViewToggle value={view} onChange={changeView} views={["map", "satellite", "3d"]} />
        {precision === "approximate" ? <span className="text-xs text-muted">Approximate area shown for privacy</span> : null}
      </div>
      <div ref={host} className="h-[440px] w-full overflow-hidden rounded-xl border border-border bg-surface-2" role="region" aria-label={`Map of ${title} and nearby places`} />
      {present.length ? (
        <div className="flex flex-wrap gap-2" aria-label="Show or hide places on the map">
          {present.map((c) => (
            <label key={c.key} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs">
              <input
                type="checkbox"
                className="sr-only"
                checked={!hidden.has(c.key)}
                onChange={() => setHidden((h) => { const n = new Set(h); if (n.has(c.key)) n.delete(c.key); else n.add(c.key); return n; })}
              />
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: hidden.has(c.key) ? "transparent" : c.color, border: `2px solid ${c.color}` }} />
              {c.label}
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
