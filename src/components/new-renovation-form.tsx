"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ROOM_TYPES, STYLES, STYLE_NAMES, TIERS, TIER_LABEL, type Area } from "@/lib/renovation";

/** Shrinks big phone photos in the browser before upload (max 1600 px, JPEG). */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", 0.86));
}

export function NewRenovationForm({ listings, defaultListing }: { listings: { id: string; title: string }[]; defaultListing?: string }) {
  const router = useRouter();
  const [area, setArea] = useState<Area>("inside");
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [style, setStyle] = useState<string>(STYLE_NAMES[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return setError("Choose a photo of the room or outside area.");
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    form.set("photo", await shrink(file), "photo.jpg");
    const res = await fetch("/api/renovations", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      return setError(data.error ?? "Something went wrong. Please try again.");
    }
    router.push(`/app/renovations/${data.id}`);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="label" htmlFor="photo">Photo of the room or outside area</label>
          <input
            id="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="input py-1.5"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              setPreview(f ? URL.createObjectURL(f) : null);
            }}
          />
          <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-surface-2 text-sm text-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {preview ? <img src={preview} alt="Selected photo" className="h-full w-full object-cover" /> : "Your photo appears here"}
          </div>
        </div>
        <div className="space-y-4">
          <fieldset>
            <legend className="label">Inside or outside?</legend>
            <div className="flex gap-2">
              {(["inside", "outside"] as Area[]).map((a) => (
                <label key={a} className={`btn cursor-pointer border ${area === a ? "border-accent bg-accent-soft text-accent" : "border-border"}`}>
                  <input type="radio" name="area" value={a} checked={area === a} onChange={() => setArea(a)} className="sr-only" />
                  {a === "inside" ? "Inside" : "Outside"}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">Room / space
              <select name="room_type" className="input mt-1" key={area}>
                {ROOM_TYPES[area].map((r) => <option key={r}>{r}</option>)}
              </select>
            </label>
            <label className="text-sm">Approx. size (m²)
              <input name="size" type="number" min={2} max={2000} defaultValue={area === "inside" ? 20 : 60} key={area} className="input mt-1" />
            </label>
          </div>
          <div>
            <label className="label" htmlFor="style">Style</label>
            <select id="style" name="style" className="input" value={style} onChange={(e) => setStyle(e.target.value)}>
              {STYLE_NAMES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <p className="mt-1 flex items-center gap-2 text-xs text-muted">
              <span className="flex gap-0.5">{STYLES[style as keyof typeof STYLES].palette.map((c) => <span key={c} className="h-3 w-3 rounded-full border border-border" style={{ background: c }} />)}</span>
              {STYLES[style as keyof typeof STYLES].note}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">Budget level
              <select name="tier" className="input mt-1" defaultValue="mid">
                {TIERS.map((t) => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}
              </select>
            </label>
            <label className="text-sm">For a listing (optional)
              <select name="listing_id" className="input mt-1" defaultValue={defaultListing ?? ""}>
                <option value="">Just for my home</option>
                {listings.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
              </select>
            </label>
          </div>
          <label className="block text-sm">Name (optional)
            <input name="title" maxLength={80} className="input mt-1" placeholder="e.g. Majlis makeover" />
          </label>
        </div>
      </div>
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      <button className="btn-primary" disabled={busy}>{busy ? "Designing your concept…" : "Create renovation concept"}</button>
    </form>
  );
}
