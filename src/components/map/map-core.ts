"use client";

import { Map as MLMap, setWorkerUrl, type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Free map sources, no account or API key needed:
//  - Street map + 3D buildings: OpenFreeMap (OpenStreetMap data)
//  - Satellite: Esri World Imagery
// Override with NEXT_PUBLIC_MAP_STYLE_URL / NEXT_PUBLIC_SATELLITE_TILE_URL to use another provider.

export type MapView = "map" | "satellite" | "3d";

const STREET_STYLE = process.env.NEXT_PUBLIC_MAP_STYLE_URL || "https://tiles.openfreemap.org/styles/liberty";
const SATELLITE_TILES =
  process.env.NEXT_PUBLIC_SATELLITE_TILE_URL ||
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    satellite: {
      type: "raster",
      tiles: [SATELLITE_TILES],
      tileSize: 256,
      maxzoom: 19,
      attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
    },
  },
  layers: [{ id: "satellite", type: "raster", source: "satellite" }],
};

let workerSet = false;

export function createMap(container: HTMLElement, opts: { lat: number; lng: number; zoom: number; view: MapView; interactive?: boolean }) {
  if (!workerSet) {
    setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
    workerSet = true;
  }
  const map = new MLMap({
    container,
    style: opts.view === "satellite" ? SATELLITE_STYLE : STREET_STYLE,
    center: [opts.lng, opts.lat],
    zoom: opts.zoom,
    pitch: opts.view === "3d" ? 60 : 0,
    bearing: opts.view === "3d" ? -20 : 0,
    maxPitch: 70,
    interactive: opts.interactive ?? true,
    attributionControl: { compact: true },
    cooperativeGestures: true, // two fingers / Ctrl+scroll to move the map, so the page still scrolls
  });
  if (opts.view === "3d") map.once("style.load", () => add3dBuildings(map));
  return map;
}

/** Adds extruded buildings if the street style doesn't already have them. */
export function add3dBuildings(map: MLMap) {
  const style = map.getStyle();
  if (!style?.layers) return;
  if (style.layers.some((l) => l.type === "fill-extrusion")) return;
  const vector = Object.entries(style.sources ?? {}).find(([, s]) => (s as { type: string }).type === "vector")?.[0];
  if (!vector) return;
  const firstSymbol = style.layers.find((l) => l.type === "symbol")?.id;
  map.addLayer(
    {
      id: "phx-3d-buildings",
      type: "fill-extrusion",
      source: vector,
      "source-layer": "building",
      minzoom: 14,
      paint: {
        "fill-extrusion-color": "#d9d2c5",
        "fill-extrusion-height": ["coalesce", ["get", "render_height"], ["get", "height"], 8],
        "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], ["get", "min_height"], 0],
        "fill-extrusion-opacity": 0.85,
      },
    },
    firstSymbol,
  );
}

/** Switches between street map, satellite and 3D, then calls `afterStyle` to restore overlays. */
export function setView(map: MLMap, view: MapView, afterStyle: () => void) {
  map.once("style.load", () => {
    if (view === "3d") add3dBuildings(map);
    afterStyle();
  });
  map.setStyle(view === "satellite" ? SATELLITE_STYLE : STREET_STYLE);
  map.easeTo(
    view === "3d"
      ? { pitch: 60, bearing: -20, zoom: Math.max(map.getZoom(), 16) }
      : { pitch: 0, bearing: 0 },
  );
}

/** GeoJSON polygon approximating a circle (for "approximate location"). */
export function circlePolygon(lat: number, lng: number, radiusM: number) {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * 2 * Math.PI;
    const dLat = (radiusM / 111320) * Math.cos(a);
    const dLng = (radiusM / (111320 * Math.cos((lat * Math.PI) / 180))) * Math.sin(a);
    pts.push([lng + dLng, lat + dLat]);
  }
  return { type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates: [pts] } };
}
