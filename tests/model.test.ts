import { test } from "node:test";
import assert from "node:assert/strict";
import { checkModel } from "@/lib/model-file";
import { createUser } from "@/lib/auth-core";
import * as repo from "@/lib/repo";
import * as L from "@/lib/listings";

/** Builds a minimal GLB file around a glTF JSON object. */
export function glb(json: object, version = 2) {
  let text = JSON.stringify(json);
  while (text.length % 4) text += " ";
  const jsonBytes = new TextEncoder().encode(text);
  const out = new Uint8Array(20 + jsonBytes.length);
  const v = new DataView(out.buffer);
  out.set(new TextEncoder().encode("glTF"), 0);
  v.setUint32(4, version, true);
  v.setUint32(8, out.length, true);
  v.setUint32(12, jsonBytes.length, true);
  v.setUint32(16, 0x4e4f534a, true);
  out.set(jsonBytes, 20);
  return out;
}

test("accepts self-contained GLB and OBJ models", () => {
  assert.deepEqual(checkModel(glb({ asset: { version: "2.0" }, buffers: [{ byteLength: 0 }] })), { ok: true, format: "glb" });
  assert.deepEqual(checkModel(glb({ asset: { version: "2.0" }, images: [{ uri: "data:image/png;base64,AAAA" }] })), { ok: true, format: "glb" });
  const obj = new TextEncoder().encode("# villa\nmtllib villa.mtl\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n");
  assert.deepEqual(checkModel(obj), { ok: true, format: "obj" });
});

test("rejects models that link to outside files, damaged files and non-models", () => {
  const ext = checkModel(glb({ asset: { version: "2.0" }, buffers: [{ uri: "https://tracker.example/b.bin", byteLength: 4 }] }));
  assert.equal(ext.ok, false);
  assert.equal(checkModel(glb({ asset: { version: "2.0" }, images: [{ uri: "texture.jpg" }] })).ok, false);
  assert.equal(checkModel(glb({ asset: { version: "2.0" }, extensionsRequired: ["KHR_texture_basisu"] })).ok, false);
  assert.equal(checkModel(glb({ asset: { version: "1.0" } }, 1)).ok, false, "glTF 1.0");
  const broken = glb({ asset: { version: "2.0" } });
  new DataView(broken.buffer).setUint32(12, 999999, true);
  assert.equal(checkModel(broken).ok, false, "chunk length beyond file");
  assert.equal(checkModel(new TextEncoder().encode("<html><script>alert(1)</script>")).ok, false);
  assert.equal(checkModel(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0])).ok, false, "a JPEG is not a model");
  assert.equal(checkModel(new Uint8Array()).ok, false);
});

test("only the owner's workspace can set a model; drafts stay private", async () => {
  const mk = async (email: string) => {
    const r = await createUser(email, "correct-horse-battery", email);
    assert.ok(r.ok);
    return { user: r.userId, org: repo.createOrganization(r.userId, "Org " + email, "homes-villas", "home") };
  };
  const a = await mk("m-a@example.com");
  const b = await mk("m-b@example.com");
  const id = L.createListing(a.user, a.org, { title: "Villa with 3D model", purpose: "sale", property_type: "Villa", emirate: "Dubai", community: "",
    price_aed: 5_000_000, bedrooms: 4, bathrooms: 4, size_sqft: 4000, description: "", permit_number: "", contact_name: "", contact_phone: "" });
  assert.throws(() => L.setModel(b.user, id, "x.glb", "glb"), repo.AccessDenied);
  assert.equal(L.setModel(a.user, id, "55555555-5555-5555-5555-555555555555.glb", "glb"), null, "no previous model");
  assert.equal(L.getModelForViewer(id, null), null, "draft: hidden from the public");
  assert.equal(L.getModelForViewer(id, b.user), null, "draft: hidden from other workspaces");
  assert.ok(L.getModelForViewer(id, a.user));
  L.setListingStatus(a.user, id, "published");
  assert.equal(L.getModelForViewer(id, null)?.isPublic, true);
  assert.equal(L.setModel(a.user, id, null, null), "55555555-5555-5555-5555-555555555555.glb", "returns old file for deletion");
  assert.equal(L.getModelForViewer(id, null), null);
});
