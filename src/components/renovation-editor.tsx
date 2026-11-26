"use client";

import { useRef, useState, useTransition } from "react";
import { BeforeAfter } from "@/components/before-after";
import { saveBoardAction } from "@/lib/actions/renovations";
import {
  CATALOG, STYLES, STYLE_NAMES, TIERS, TIER_LABEL, catalogItem, formatRange, itemCost, totalCost, unitLabel,
  type Area, type BoardItemT, type StyleName, type Tier,
} from "@/lib/renovation";

type BoardProps = {
  id: string; title: string; area: Area; room_type: string; room_size_sqm: number; style: StyleName; tier: Tier;
  summary: string; suggested_by: "ai" | "rules"; listing_id: string | null; listing_title: string | null;
  show_on_listing: boolean; has_after: boolean;
};

const CATEGORIES = ["Furniture", "Finishes", "Lighting", "Fixtures", "Outdoor", "Decor"] as const;

export function RenovationEditor({ board, initialItems, editable }: { board: BoardProps; initialItems: BoardItemT[]; editable: boolean }) {
  const [title, setTitle] = useState(board.title);
  const [style, setStyle] = useState<StyleName>(board.style);
  const [tier, setTier] = useState<Tier>(board.tier);
  const [size, setSize] = useState(board.room_size_sqm);
  const [items, setItems] = useState<BoardItemT[]>(initialItems);
  const [showOnListing, setShowOnListing] = useState(board.show_on_listing);
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<"plan" | "compare">("plan");
  const [afterVersion, setAfterVersion] = useState(board.has_after ? 1 : 0);
  const hasAfter = afterVersion > 0;
  const [useAfter, setUseAfter] = useState(board.has_after);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const photoRef = useRef<HTMLDivElement>(null);
  const dragId = useRef<string | null>(null);

  const before = `/renovation-media/${board.id}/before`;
  const after = `/renovation-media/${board.id}/after?v=${afterVersion}`;
  const s = STYLES[style];
  const total = totalCost(items, tier);
  const touch = () => { setDirty(true); setMsg(null); };
  const change = (id: string, patch: Partial<BoardItemT>) => { setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x))); touch(); };

  function posFrom(e: React.PointerEvent) {
    const r = photoRef.current!.getBoundingClientRect();
    return {
      x: Math.min(98, Math.max(2, ((e.clientX - r.left) / r.width) * 100)),
      y: Math.min(98, Math.max(2, ((e.clientY - r.top) / r.height) * 100)),
    };
  }

  function addItem(key: string) {
    const c = catalogItem(key);
    if (!c) return;
    const id = `u${Date.now().toString(36)}`;
    setItems((xs) => [...xs, { id, key, x: 50, y: 50, qty: c.unit === "sqm" ? size : 1, note: "" }]);
    setSelected(id);
    setView("plan");
    touch();
  }

  function save() {
    start(async () => {
      const res = await saveBoardAction(board.id, { title, style, tier, room_size_sqm: size, items, show_on_listing: showOnListing });
      setMsg(res ? { ok: res.ok, text: res.message } : null);
      if (res?.ok) setDirty(false);
    });
  }

  async function uploadAfter(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    const body = new FormData();
    body.set("file", file);
    const res = await fetch(`/api/renovations/${board.id}/after`, { method: "POST", body });
    setUploading(false);
    if (!res.ok) return setMsg({ ok: false, text: (await res.json().catch(() => ({}))).error ?? "Upload failed" });
    setAfterVersion((v) => v + 1);
    setUseAfter(true);
    setView("compare");
  }

  async function removeAfter() {
    const res = await fetch(`/api/renovations/${board.id}/after`, { method: "DELETE" });
    if (!res.ok) return setMsg({ ok: false, text: "Could not remove the image" });
    setAfterVersion(0);
    setUseAfter(false);
  }

  const available = CATALOG.filter((c) => c.area === board.area || c.area === "both");
  const byCategory = CATEGORIES.map((cat) => ({
    cat,
    range: totalCost(items.filter((i) => catalogItem(i.key)?.category === cat), tier),
  })).filter((c) => c.range[1] > 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <section className="card min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1" role="tablist" aria-label="View">
              <button type="button" role="tab" aria-selected={view === "plan"} onClick={() => setView("plan")} className={view === "plan" ? "btn-primary px-3 py-1.5" : "btn-secondary px-3 py-1.5"}>Plan the changes</button>
              <button type="button" role="tab" aria-selected={view === "compare"} onClick={() => setView("compare")} className={view === "compare" ? "btn-primary px-3 py-1.5" : "btn-secondary px-3 py-1.5"}>Before / after</button>
            </div>
            {view === "compare" && hasAfter ? (
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={useAfter} onChange={(e) => setUseAfter(e.target.checked)} className="accent-[var(--accent)]" />
                Show my uploaded “after” image
              </label>
            ) : null}
          </div>

          {view === "plan" ? (
            <div
              ref={photoRef}
              className="relative w-full touch-none select-none overflow-hidden rounded-xl bg-surface-2"
              onPointerMove={(e) => { if (dragId.current) change(dragId.current, posFrom(e)); }}
              onPointerUp={() => (dragId.current = null)}
              onPointerLeave={() => (dragId.current = null)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={before} alt={`${board.room_type} photo`} className="block h-auto w-full" draggable={false} />
              {items.map((it, i) => (
                <button
                  key={it.id}
                  type="button"
                  aria-label={`Item ${i + 1}: ${catalogItem(it.key)?.label}. ${editable ? "Drag to move." : ""}`}
                  onPointerDown={(e) => {
                    setSelected(it.id);
                    if (!editable) return;
                    dragId.current = it.id;
                    (e.target as Element).setPointerCapture?.(e.pointerId);
                  }}
                  onKeyDown={(e) => {
                    if (!editable) return;
                    const d: Record<string, [number, number]> = { ArrowLeft: [-2, 0], ArrowRight: [2, 0], ArrowUp: [0, -2], ArrowDown: [0, 2] };
                    if (d[e.key]) { e.preventDefault(); change(it.id, { x: Math.min(98, Math.max(2, it.x + d[e.key][0])), y: Math.min(98, Math.max(2, it.y + d[e.key][1])) }); }
                  }}
                  className={`absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-sm font-bold shadow ${selected === it.id ? "border-accent bg-white text-accent" : "border-white bg-accent text-accent-fg"} ${editable ? "cursor-grab" : ""}`}
                  style={{ left: `${it.x}%`, top: `${it.y}%` }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          ) : (
            <BeforeAfter
              before={before}
              after={useAfter && hasAfter ? after : null}
              conceptFilter={s.filter}
              palette={s.palette}
              markers={items.map((it, i) => ({ id: it.id, n: i + 1, x: it.x, y: it.y, label: catalogItem(it.key)?.label ?? "" }))}
              alt={title}
            />
          )}
          <p className="text-xs text-muted">
            {board.suggested_by === "ai" ? "Changes suggested by AI from your photo." : "Starter suggestions for this kind of space."}{" "}
            {editable ? "Drag the numbered markers to where each change goes, or add and remove items below." : ""}
          </p>
          {board.summary ? <p className="text-sm">{board.summary}</p> : null}
        </section>

        <aside className="space-y-4">
          <div className="card space-y-1">
            <p className="text-sm text-muted">Estimated cost · {TIER_LABEL[tier]}</p>
            <p className="text-2xl font-bold tabular-nums">{formatRange(total)}</p>
            <ul className="mt-2 space-y-0.5 text-xs text-muted">
              {byCategory.map((c) => (
                <li key={c.cat} className="flex justify-between gap-2"><span>{c.cat}</span><span className="tabular-nums">{formatRange(c.range)}</span></li>
              ))}
            </ul>
            <p className="pt-2 text-xs text-muted">Indicative UAE prices for planning. Get quotes from contractors before deciding.</p>
          </div>

          <fieldset disabled={!editable} className="card space-y-3">
            <label className="block text-sm">Name
              <input className="input mt-1" value={title} maxLength={80} onChange={(e) => { setTitle(e.target.value); touch(); }} />
            </label>
            <label className="block text-sm">Style
              <select className="input mt-1" value={style} onChange={(e) => { setStyle(e.target.value as StyleName); touch(); }}>
                {STYLE_NAMES.map((n) => <option key={n}>{n}</option>)}
              </select>
              <span className="mt-1 block text-xs text-muted">{s.note}</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm">Budget
                <select className="input mt-1" value={tier} onChange={(e) => { setTier(e.target.value as Tier); touch(); }}>
                  {TIERS.map((t) => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}
                </select>
              </label>
              <label className="text-sm">Size (m²)
                <input type="number" min={2} max={2000} className="input mt-1" value={size} onChange={(e) => { setSize(Math.max(2, Math.min(2000, Math.round(Number(e.target.value) || 2)))); touch(); }} />
              </label>
            </div>
            {board.listing_id ? (
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1 accent-[var(--accent)]" checked={showOnListing} onChange={(e) => { setShowOnListing(e.target.checked); touch(); }} />
                <span>Show on my listing “{board.listing_title}”<span className="block text-xs text-muted">Buyers see it labelled as a concept with the cost estimate.</span></span>
              </label>
            ) : null}
          </fieldset>

          {editable ? (
            <div className="card space-y-2 text-sm">
              <p className="font-medium">Your own “after” image (optional)</p>
              <p className="text-xs text-muted">Have a designer&apos;s render or a photo after the work? Upload it to compare with the original.</p>
              <input type="file" accept="image/jpeg,image/png,image/webp" className="input py-1.5" disabled={uploading} onChange={(e) => uploadAfter(e.target.files?.[0])} aria-label="Upload after image" />
              {hasAfter ? <button type="button" className="btn-ghost px-2 py-1 text-xs text-danger" onClick={removeAfter}>Remove after image</button> : null}
            </div>
          ) : null}

          {editable ? (
            <div className="space-y-2">
              <button type="button" className="btn-primary w-full" disabled={pending || !dirty} onClick={save}>
                {pending ? "Saving…" : dirty ? "Save changes" : "Saved"}
              </button>
              {msg ? <p role="status" className={`text-xs ${msg.ok ? "text-ok" : "text-danger"}`}>{msg.text}</p> : null}
            </div>
          ) : null}
        </aside>
      </div>

      <section className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Planned changes ({items.length})</h2>
          {editable ? (
            <select className="input w-auto" value="" onChange={(e) => e.target.value && addItem(e.target.value)} aria-label="Add an item">
              <option value="">+ Add an item…</option>
              {CATEGORIES.map((cat) => {
                const opts = available.filter((c) => c.category === cat);
                return opts.length ? (
                  <optgroup key={cat} label={cat}>
                    {opts.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </optgroup>
                ) : null;
              })}
            </select>
          ) : null}
        </div>
        {items.length === 0 ? <p className="text-sm text-muted">No items yet. Add one from the list.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs text-muted">
                <tr><th className="w-8 py-1">#</th><th>Item</th><th className="w-36">Quantity</th><th className="w-48 text-right">Estimate</th><th className="w-10" /></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((it, i) => {
                  const c = catalogItem(it.key)!;
                  return (
                    <tr key={it.id} className={selected === it.id ? "bg-accent-soft" : ""} onClick={() => setSelected(it.id)}>
                      <td className="py-2 font-bold text-accent">{i + 1}</td>
                      <td className="py-2 pr-3">
                        <p className="font-medium">{c.label}</p>
                        <input
                          className="mt-1 w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-muted hover:border-border focus:border-border focus:outline-none"
                          value={it.note}
                          maxLength={200}
                          placeholder={editable ? "Add a note…" : ""}
                          disabled={!editable}
                          onChange={(e) => change(it.id, { note: e.target.value })}
                          aria-label={`Note for ${c.label}`}
                        />
                      </td>
                      <td className="py-2">
                        <span className="flex items-center gap-1">
                          <input type="number" min={0.5} step={c.unit === "each" ? 1 : 0.5} value={it.qty} disabled={!editable}
                            onChange={(e) => change(it.id, { qty: Math.max(0.5, Math.min(2000, Number(e.target.value) || 0.5)) })}
                            className="input w-20 py-1" aria-label={`Quantity of ${c.label}`} />
                          <span className="text-xs text-muted">{unitLabel(c.unit)}</span>
                        </span>
                      </td>
                      <td className="py-2 text-right tabular-nums">{formatRange(itemCost(it, tier))}</td>
                      <td className="py-2 text-right">
                        {editable ? (
                          <button type="button" className="btn-ghost px-2 py-1 text-xs text-danger" aria-label={`Remove ${c.label}`}
                            onClick={(e) => { e.stopPropagation(); setItems((xs) => xs.filter((x) => x.id !== it.id)); touch(); }}>✕</button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
