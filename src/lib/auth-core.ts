import "server-only";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { db, newId } from "@/lib/db";

// Built-in email + password authentication (no external auth provider).
// Passwords: scrypt with a per-user salt. Sessions: random 256-bit token in an
// httpOnly cookie; only its SHA-256 hash is stored in the database.

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
export const SESSION_DAYS = 30;

export type User = { id: string; email: string; full_name: string; is_platform_admin: number };

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, saltB64, keyB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64");
  const actual = await scryptAsync(password, Buffer.from(saltB64, "base64"), expected.length);
  return timingSafeEqual(actual, expected);
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createUser(email: string, password: string, fullName: string) {
  const conn = db();
  const exists = conn.prepare("select 1 from users where email = ?").get(email);
  if (exists) return { ok: false as const, error: "An account with this email already exists." };
  const id = newId();
  conn
    .prepare("insert into users (id, email, password_hash, full_name) values (?, ?, ?, ?)")
    .run(id, email.trim().toLowerCase(), await hashPassword(password), fullName);
  return { ok: true as const, userId: id };
}

// Dummy hash so failed lookups take as long as real password checks.
let dummyHash: Promise<string> | null = null;

export async function verifyLogin(email: string, password: string) {
  const row = db()
    .prepare("select id, password_hash from users where email = ?")
    .get(email.trim().toLowerCase()) as { id: string; password_hash: string } | undefined;
  if (!row) {
    dummyHash ??= hashPassword("not-a-real-password");
    await verifyPassword(password, await dummyHash);
    return null;
  }
  return (await verifyPassword(password, row.password_hash)) ? row.id : null;
}

export function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  db()
    .prepare("insert into sessions (token_hash, user_id, expires_at) values (?, ?, ?)")
    .run(hashToken(token), userId, expires.toISOString());
  return { token, expires };
}

export function userFromToken(token: string | undefined): User | null {
  if (!token) return null;
  const row = db()
    .prepare(
      `select u.id, u.email, u.full_name, u.is_platform_admin
         from sessions s join users u on u.id = s.user_id
        where s.token_hash = ? and s.expires_at > ?`,
    )
    .get(hashToken(token), new Date().toISOString()) as User | undefined;
  return row ?? null;
}

export function deleteSession(token: string | undefined) {
  if (token) db().prepare("delete from sessions where token_hash = ?").run(hashToken(token));
}

export function setPlatformAdmin(email: string, value: boolean) {
  const r = db()
    .prepare("update users set is_platform_admin = ? where email = ?")
    .run(value ? 1 : 0, email.trim().toLowerCase());
  return r.changes > 0;
}

// Simple in-memory login throttle (per process): 10 failures per 15 minutes per key.
const failures = new Map<string, { count: number; until: number }>();
export function loginBlocked(key: string) {
  const f = failures.get(key);
  return Boolean(f && f.count >= 10 && f.until > Date.now());
}
export function recordLoginFailure(key: string) {
  const f = failures.get(key);
  const until = Date.now() + 15 * 60_000;
  failures.set(key, f && f.until > Date.now() ? { count: f.count + 1, until } : { count: 1, until });
}
export function clearLoginFailures(key: string) {
  failures.delete(key);
}
