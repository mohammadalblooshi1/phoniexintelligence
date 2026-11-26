"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** Uploads listing photos (several at once) or one named 360° panorama. */
export function MediaUploader({ listingId, kind }: { listingId: string; kind: "photo" | "pano" }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    const files = Array.from(input.current?.files ?? []);
    if (!files.length) return setStatus({ ok: false, text: "Choose a file first." });
    if (kind === "pano" && !title.trim()) return setStatus({ ok: false, text: "Enter the room name for this 360° photo." });
    setBusy(true);
    setStatus(null);
    let done = 0;
    for (const file of files) {
      const body = new FormData();
      body.set("kind", kind);
      body.set("title", kind === "pano" ? title : "");
      body.set("file", file);
      const res = await fetch(`/api/listings/${listingId}/media`, { method: "POST", body });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus({ ok: false, text: `${file.name}: ${data.error ?? "upload failed"}` });
        break;
      }
      done++;
      setStatus({ ok: true, text: `Uploaded ${done} of ${files.length}…` });
    }
    setBusy(false);
    if (done) {
      setStatus({ ok: true, text: `Uploaded ${done} file${done > 1 ? "s" : ""}.` });
      setTitle("");
      if (input.current) input.current.value = "";
      router.refresh();
    }
  }

  return (
    <form onSubmit={upload} className="flex flex-wrap items-end gap-2">
      {kind === "pano" ? (
        <label className="text-xs">Room name
          <input className="input mt-1 w-44" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={40} placeholder="e.g. Living room" />
        </label>
      ) : null}
      <label className="text-xs">{kind === "pano" ? "360° photo (2:1 equirectangular)" : "Photos (JPEG, PNG, WebP · max 15 MB)"}
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple={kind === "photo"} className="input mt-1 w-64 py-1.5" />
      </label>
      <button className="btn-secondary" disabled={busy}>{busy ? "Uploading…" : "Upload"}</button>
      {status ? <p role="status" className={`w-full text-xs ${status.ok ? "text-ok" : "text-danger"}`}>{status.text}</p> : null}
    </form>
  );
}
