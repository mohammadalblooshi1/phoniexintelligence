"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function ModelUploader({ listingId, hasModel }: { listingId: string; hasModel: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    const file = input.current?.files?.[0];
    if (!file) return setMsg({ ok: false, text: "Choose a .glb or .obj file first." });
    setBusy(true);
    setMsg({ ok: true, text: `Uploading ${(file.size / 1024 / 1024).toFixed(1)} MB…` });
    const body = new FormData();
    body.set("file", file);
    const res = await fetch(`/api/listings/${listingId}/model`, { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg({ ok: false, text: data.error ?? "Upload failed." });
    setMsg({ ok: true, text: "3D model uploaded." });
    if (input.current) input.current.value = "";
    router.refresh();
  }

  async function remove() {
    setBusy(true);
    const res = await fetch(`/api/listings/${listingId}/model`, { method: "DELETE" });
    setBusy(false);
    setMsg(res.ok ? { ok: true, text: "3D model removed." } : { ok: false, text: "Could not remove the model." });
    router.refresh();
  }

  return (
    <form onSubmit={upload} className="flex flex-wrap items-end gap-2">
      <label className="text-xs">3D model (.glb recommended, or .obj · max 50 MB)
        <input ref={input} type="file" accept=".glb,.obj,model/gltf-binary" className="input mt-1 w-72 py-1.5" />
      </label>
      <button className="btn-secondary" disabled={busy}>{busy ? "Working…" : hasModel ? "Replace model" : "Upload model"}</button>
      {hasModel ? <button type="button" className="btn-ghost text-danger" disabled={busy} onClick={remove}>Remove model</button> : null}
      {msg ? <p role="status" className={`w-full text-xs ${msg.ok ? "text-ok" : "text-danger"}`}>{msg.text}</p> : null}
    </form>
  );
}
