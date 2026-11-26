"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Marker, NavigationControl, type Map as MLMap } from "maplibre-gl";
import { createMap, setView, type MapView } from "@/components/map/map-core";
import { ViewToggle } from "@/components/map/view-toggle";
import { saveLocationAction } from "@/lib/actions/listings";
import { APPROX_RADIUS_M } from "@/lib/places";

type Props = {
  listingId: string;
  initial: { lat: number; lng: number; precision: "exact" | "approximate" } | null;
  start: { lat: number; lng: number; zoom: number };
  editable: boolean;
};

/** Owner sets the property's position by clicking the map or dragging the pin. */
export default function LocationPicker({ listingId, initial, start, editable }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [point, setPoint] = useState(initial ? { lat: initial.lat, lng: initial.lng } : null);
  const [precision, setPrecision] = useState<"exact" | "approximate">(initial?.precision ?? "approximate");
  const [view, setViewState] = useState<MapView>("satellite");
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start$] = useTransition();

  useEffect(() => {
    if (!host.current) return;
    const centre = initial ?? start;
    const map = createMap(host.current, { lat: centre.lat, lng: centre.lng, zoom: initial ? 17 : start.zoom, view: "satellite" });
    map.addControl(new NavigationControl({ visualizePitch: true }), "top-right");
    mapRef.current = map;

    const place = (lat: number, lng: number) => {
      setPoint({ lat, lng });
      setDirty(true);
      setMsg(null);
      if (!markerRef.current) {
        markerRef.current = new Marker({ color: "#e8590c", draggable: editable }).setLngLat([lng, lat]).addTo(map);
        markerRef.current.on("dragend", () => {
          const p = markerRef.current!.getLngLat();
          setPoint({ lat: p.lat, lng: p.lng });
          setDirty(true);
          setMsg(null);
        });
      } else markerRef.current.setLngLat([lng, lat]);
    };
    if (initial) {
      markerRef.current = new Marker({ color: "#e8590c", draggable: editable }).setLngLat([initial.lng, initial.lat]).addTo(map);
      markerRef.current.on("dragend", () => {
        const p = markerRef.current!.getLngLat();
        setPoint({ lat: p.lat, lng: p.lng });
        setDirty(true);
        setMsg(null);
      });
    }
    if (editable) map.on("click", (e) => place(e.lngLat.lat, e.lngLat.lng));
    return () => {
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function changeView(v: MapView) {
    setViewState(v);
    if (mapRef.current) setView(mapRef.current, v, () => {});
  }

  function save() {
    if (!point) return;
    start$(async () => {
      setMsg({ ok: true, text: "Saving and finding nearby places…" });
      const res = await saveLocationAction(listingId, { ...point, precision });
      setMsg(res ? { ok: res.ok, text: res.message } : null);
      if (res?.ok) setDirty(false);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ViewToggle value={view} onChange={changeView} views={["satellite", "map", "3d"]} />
        <span className="text-xs text-muted">{point ? `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}` : "No pin yet"}</span>
      </div>
      <div ref={host} className="h-[420px] w-full overflow-hidden rounded-xl border border-border bg-surface-2" aria-label="Map: click to place your property" />
      <p className="text-xs text-muted">{editable ? "Zoom in and click on your building or plot (or drag the pin). Use two fingers or Ctrl + scroll to zoom." : ""}</p>
      {editable ? (
        <>
          <fieldset className="space-y-1 text-sm">
            <legend className="mb-1 font-medium">What buyers see</legend>
            <label className="flex items-start gap-2">
              <input type="radio" name="precision" className="mt-1 accent-[var(--accent)]" checked={precision === "approximate"} onChange={() => { setPrecision("approximate"); setDirty(true); }} />
              <span>Approximate area <span className="text-muted">— a {APPROX_RADIUS_M} m circle; your exact address stays private</span></span>
            </label>
            <label className="flex items-start gap-2">
              <input type="radio" name="precision" className="mt-1 accent-[var(--accent)]" checked={precision === "exact"} onChange={() => { setPrecision("exact"); setDirty(true); }} />
              <span>Exact location <span className="text-muted">— pin, directions and Street View link</span></span>
            </label>
          </fieldset>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary" disabled={!point || pending || !dirty} onClick={save}>
              {pending ? "Saving…" : dirty ? "Save location" : "Location saved"}
            </button>
            {msg ? <p role="status" className={`text-sm ${msg.ok ? "text-ok" : "text-danger"}`}>{msg.text}</p> : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
