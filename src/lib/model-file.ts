// Validates uploaded 3D model files before they are stored or shown to anyone.
// Supported: GLB (binary glTF 2.0, the standard export from SketchUp, Revit,
// Blender, Archicad and phone 3D-scan apps) and OBJ (plain geometry).

export const MAX_MODEL_BYTES = 50 * 1024 * 1024;

export type ModelCheck = { ok: true; format: "glb" | "obj" } | { ok: false; error: string };

const isData = (uri: unknown) => typeof uri === "string" && uri.startsWith("data:");

export function checkModel(bytes: Uint8Array): ModelCheck {
  if (bytes.length === 0) return { ok: false, error: "The file is empty." };
  if (bytes.length > MAX_MODEL_BYTES) return { ok: false, error: "The model is larger than 50 MB. Export it with compression (Draco) or fewer details." };

  const magic = String.fromCharCode(...bytes.slice(0, 4));
  if (magic === "glTF") {
    if (bytes.length < 20) return { ok: false, error: "This GLB file is damaged." };
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const version = view.getUint32(4, true);
    const total = view.getUint32(8, true);
    const jsonLength = view.getUint32(12, true);
    const jsonType = view.getUint32(16, true);
    if (version !== 2) return { ok: false, error: "Only glTF 2.0 models are supported." };
    if (total > bytes.length || jsonType !== 0x4e4f534a || 20 + jsonLength > bytes.length) return { ok: false, error: "This GLB file is damaged." };
    let gltf: { buffers?: { uri?: string }[]; images?: { uri?: string }[]; extensionsRequired?: string[] };
    try {
      gltf = JSON.parse(new TextDecoder().decode(bytes.slice(20, 20 + jsonLength)));
    } catch {
      return { ok: false, error: "This GLB file is damaged." };
    }
    // Everything must be inside the file — no links to other websites.
    if ((gltf.buffers ?? []).some((b) => b.uri !== undefined && !isData(b.uri))) {
      return { ok: false, error: "This model links to outside files. Export it as a single self-contained .glb file." };
    }
    if ((gltf.images ?? []).some((i) => i.uri !== undefined && !isData(i.uri))) {
      return { ok: false, error: "This model's textures are separate files. Export as a single .glb with embedded textures." };
    }
    if ((gltf.extensionsRequired ?? []).includes("KHR_texture_basisu")) {
      return { ok: false, error: "KTX2/Basis textures aren't supported yet. Export with JPEG or PNG textures." };
    }
    return { ok: true, format: "glb" };
  }

  // OBJ is plain text with vertex lines ("v x y z").
  const head = new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(0, 256 * 1024));
  if (/\u0000/.test(head)) return { ok: false, error: "Upload a .glb or .obj 3D model." };
  if (/^\s*v\s+-?[\d.]/m.test(head) && /^\s*f\s+\d/m.test(new TextDecoder().decode(bytes.slice(0, 4 * 1024 * 1024)))) {
    return { ok: true, format: "obj" };
  }
  return { ok: false, error: "Upload a .glb or .obj 3D model." };
}
