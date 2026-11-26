import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { newId } from "@/lib/db";

// Local file storage for listing photos and 360° panoramas.
// Files get server-generated names; the type is detected from the file's bytes.

export const LIMITS = { photo: 15 * 1024 * 1024, pano: 30 * 1024 * 1024 } as const;

function uploadsDir() {
  return process.env.UPLOADS_DIR ?? path.join(/* turbopackIgnore: true */ process.cwd(), "data", "uploads");
}

export function sniffImage(bytes: Uint8Array): { mime: string; ext: string } | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { mime: "image/png", ext: "png" };
  const riff = String.fromCharCode(...bytes.slice(0, 4));
  const webp = String.fromCharCode(...bytes.slice(8, 12));
  if (riff === "RIFF" && webp === "WEBP") return { mime: "image/webp", ext: "webp" };
  return null;
}

export async function storeImage(file: File, kind: keyof typeof LIMITS) {
  if (file.size === 0) return { ok: false as const, error: "Empty file." };
  if (file.size > LIMITS[kind]) {
    return { ok: false as const, error: `File too large (max ${LIMITS[kind] / 1024 / 1024} MB).` };
  }
  return storeBytes(new Uint8Array(await file.arrayBuffer()));
}

/** Stores already-read image bytes under a new server-generated name. */
export async function storeBytes(bytes: Uint8Array) {
  const type = sniffImage(bytes);
  if (!type) return { ok: false as const, error: "Only JPEG, PNG or WebP images are allowed." };
  const name = `${newId()}.${type.ext}`;
  await mkdir(uploadsDir(), { recursive: true });
  await writeFile(path.join(/* turbopackIgnore: true */ uploadsDir(), name), bytes);
  return { ok: true as const, file: name, mime: type.mime };
}

const SAFE_NAME = /^[0-9a-f-]{36}\.(jpg|png|webp|glb|obj)$/;

/** Stores an already-validated 3D model file. */
export async function storeModelBytes(bytes: Uint8Array, format: "glb" | "obj") {
  const name = `${newId()}.${format}`;
  await mkdir(uploadsDir(), { recursive: true });
  await writeFile(path.join(/* turbopackIgnore: true */ uploadsDir(), name), bytes);
  return name;
}

export async function readImage(name: string) {
  if (!SAFE_NAME.test(name)) return null;
  try {
    return await readFile(path.join(/* turbopackIgnore: true */ uploadsDir(), name));
  } catch {
    return null;
  }
}

export async function deleteImage(name: string) {
  if (!SAFE_NAME.test(name)) return;
  await unlink(path.join(/* turbopackIgnore: true */ uploadsDir(), name)).catch(() => {});
}
