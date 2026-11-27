import "server-only";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, unlinkSync } from "node:fs";
import path from "node:path";

// Local SQLite database (Node's built-in node:sqlite, no external service).
// File location: DATABASE_PATH, default ./data/phoniex.db. Use ":memory:" in tests.

const SCHEMA = `
pragma foreign_keys = on;

create table if not exists users (
  id text primary key,
  email text not null unique collate nocase,
  password_hash text not null,
  full_name text not null default '',
  is_platform_admin integer not null default 0,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

create table if not exists sessions (
  token_hash text primary key,
  user_id text not null references users(id) on delete cascade,
  expires_at text not null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
create index if not exists sessions_user_idx on sessions(user_id);

create table if not exists organizations (
  id text primary key,
  name text not null,
  industry text not null,
  division text not null check (division in ('enterprise','business','home')),
  plan text not null default 'starter' check (plan in ('starter','professional','enterprise')),
  created_by text references users(id) on delete set null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

create table if not exists memberships (
  org_id text not null references organizations(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  role text not null check (role in ('owner','admin','member','viewer')),
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  primary key (org_id, user_id)
);
create index if not exists memberships_user_idx on memberships(user_id);

create table if not exists agents (
  id text primary key,
  org_id text not null references organizations(id) on delete cascade,
  name text not null,
  template text not null,
  role_description text not null default '',
  instructions text not null default '',
  knowledge text not null default '',
  model text not null default 'claude-opus-5-5',
  effort text not null default 'medium' check (effort in ('low','medium','high')),
  approval_policy text not null default 'sensitive' check (approval_policy in ('none','sensitive','all')),
  status text not null default 'draft' check (status in ('draft','active','paused')),
  monthly_message_limit integer not null default 500,
  created_by text references users(id) on delete set null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
create index if not exists agents_org_idx on agents(org_id);

create table if not exists agent_runs (
  id text primary key,
  org_id text not null references organizations(id) on delete cascade,
  agent_id text not null references agents(id) on delete cascade,
  user_id text references users(id) on delete set null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  latency_ms integer not null default 0,
  status text not null check (status in ('ok','demo','refused','error','limited')),
  error text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
create index if not exists agent_runs_org_idx on agent_runs(org_id, created_at);
create index if not exists agent_runs_agent_idx on agent_runs(agent_id, created_at);

create table if not exists project_requests (
  id text primary key,
  org_id text references organizations(id) on delete cascade,
  submitted_by text references users(id) on delete set null,
  contact_name text not null,
  contact_email text not null,
  company text not null,
  industry text not null,
  services text not null default '[]',
  goals text not null,
  budget text,
  timeline text,
  status text not null default 'new',
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

create table if not exists leads (
  id text primary key,
  name text not null,
  email text not null,
  company text,
  phone text,
  industry text,
  message text not null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

create table if not exists audit_logs (
  id integer primary key autoincrement,
  org_id text references organizations(id) on delete cascade,
  actor_id text references users(id) on delete set null,
  action text not null,
  details text not null default '{}',
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
create index if not exists audit_logs_org_idx on audit_logs(org_id, created_at);

-- Owner self-service property listings
create table if not exists listings (
  id text primary key,
  org_id text not null references organizations(id) on delete cascade,
  created_by text references users(id) on delete set null,
  title text not null,
  purpose text not null default 'sale' check (purpose in ('sale','rent')),
  property_type text not null,
  emirate text not null,
  community text not null default '',
  price_aed integer not null,
  bedrooms integer not null default 0,
  bathrooms integer not null default 0,
  size_sqft integer not null default 0,
  description text not null default '',
  permit_number text not null default '',
  contact_name text not null default '',
  contact_phone text not null default '',
  floor_plan text not null default '{"width":20,"height":14,"rooms":[]}',
  status text not null default 'draft' check (status in ('draft','published','sold','archived')),
  agent_notes text not null default '',
  lat real,
  lng real,
  location_precision text not null default 'approximate' check (location_precision in ('exact','approximate')),
  nearby text not null default '',
  nearby_at text,
  model_file text,
  model_format text,
  published_at text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
create index if not exists listings_org_idx on listings(org_id);
create index if not exists listings_status_idx on listings(status, published_at);

create table if not exists listing_media (
  id text primary key,
  listing_id text not null references listings(id) on delete cascade,
  org_id text not null references organizations(id) on delete cascade,
  kind text not null check (kind in ('photo','pano')),
  file text not null,
  mime text not null,
  title text not null default '',
  sort integer not null default 0,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
create index if not exists listing_media_listing_idx on listing_media(listing_id, kind, sort);

create table if not exists listing_enquiries (
  id text primary key,
  listing_id text not null references listings(id) on delete cascade,
  org_id text not null references organizations(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  message text not null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
create index if not exists listing_enquiries_listing_idx on listing_enquiries(listing_id, created_at);

-- Renovation concept boards (before / after ideas with cost estimates)
create table if not exists renovation_boards (
  id text primary key,
  org_id text not null references organizations(id) on delete cascade,
  listing_id text references listings(id) on delete set null,
  created_by text references users(id) on delete set null,
  title text not null,
  area text not null check (area in ('inside','outside')),
  room_type text not null,
  room_size_sqm integer not null default 20,
  style text not null,
  tier text not null default 'mid' check (tier in ('budget','mid','premium')),
  photo_file text not null,
  photo_mime text not null,
  after_file text,
  after_mime text,
  items text not null default '[]',
  summary text not null default '',
  suggested_by text not null default 'rules' check (suggested_by in ('ai','rules')),
  show_on_listing integer not null default 0,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
create index if not exists renovation_boards_org_idx on renovation_boards(org_id, created_at);
create index if not exists renovation_boards_listing_idx on renovation_boards(listing_id);

-- Partnership appointment agent
create table if not exists partner_leads (
  id text primary key,
  name text not null,
  email text not null collate nocase,
  company text not null default '',
  message text not null default '',
  token text not null unique,
  status text not null default 'awaiting_reply'
    check (status in ('awaiting_reply','interested','declined','booked','completed','no_response')),
  confirm_sent_at text,
  followup_sent_at text,
  replied_at text,
  reply_text text,
  meeting_start text,
  meeting_end text,
  thanks_sent_at text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
create index if not exists partner_leads_email_idx on partner_leads(email);
create index if not exists partner_leads_status_idx on partner_leads(status);

create table if not exists partner_events (
  id integer primary key autoincrement,
  lead_id text not null references partner_leads(id) on delete cascade,
  type text not null,
  detail text not null default '',
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
create index if not exists partner_events_lead_idx on partner_events(lead_id, id);

-- Small key/value settings (e.g. the connected Outlook account).
create table if not exists app_settings (
  key text primary key,
  value text not null,
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Emails are stored here instead of being sent (no email provider connected yet).
create table if not exists outbox (
  id text primary key,
  to_addr text not null,
  reply_to text,
  subject text not null,
  body text not null,
  status text not null default 'saved',
  provider_id text,
  error text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
`;

const globalForDb = globalThis as unknown as { __phoniexDb?: DatabaseSync };

export function db(): DatabaseSync {
  if (globalForDb.__phoniexDb) return globalForDb.__phoniexDb;
  const file = process.env.DATABASE_PATH ?? path.join(/* turbopackIgnore: true */ process.cwd(), "data", "phoniex.db");
  if (file !== ":memory:") mkdirSync(path.dirname(file), { recursive: true });
  const conn = new DatabaseSync(file);
  if (file !== ":memory:") conn.exec("pragma journal_mode = wal;");
  conn.exec(SCHEMA);
  migrate(conn);
  plainRows(conn);
  globalForDb.__phoniexDb = conn;
  return conn;
}

/** Small additive migrations for databases created by earlier versions. */
function migrate(conn: DatabaseSync) {
  const cols = conn.prepare("pragma table_info(listings)").all() as { name: string }[];
  if (cols.some((c) => c.name === "is_sample")) removeLegacySamples(conn);
  if (!cols.some((c) => c.name === "agent_notes")) {
    conn.exec("alter table listings add column agent_notes text not null default ''");
  }
  if (!cols.some((c) => c.name === "model_file")) {
    conn.exec("alter table listings add column model_file text; alter table listings add column model_format text;");
  }
  if (!cols.some((c) => c.name === "lat")) {
    conn.exec(`alter table listings add column lat real;
      alter table listings add column lng real;
      alter table listings add column location_precision text not null default 'approximate';
      alter table listings add column nearby text not null default '';
      alter table listings add column nearby_at text;`);
  }
  const outboxCols = conn.prepare("pragma table_info(outbox)").all() as { name: string }[];
  if (!outboxCols.some((c) => c.name === "status")) {
    conn.exec("alter table outbox add column status text not null default 'saved'; alter table outbox add column provider_id text; alter table outbox add column error text;");
  }
  const mediaCols = conn.prepare("pragma table_info(listing_media)").all() as { name: string }[];
  if (mediaCols.some((c) => c.name === "is_illustration")) removeLegacyIllustrations(conn);
}

/**
 * An earlier version could add demo "sample" listings. The platform now starts
 * empty and only shows listings created by clients, so delete any leftovers.
 */
function removeLegacySamples(conn: DatabaseSync) {
  const files = conn
    .prepare("select m.file from listing_media m join listings l on l.id = m.listing_id where l.is_sample = 1")
    .all() as { file: string }[];
  if (!files.length && !conn.prepare("select 1 from listings where is_sample = 1").get()) return;
  conn.exec("delete from listings where is_sample = 1");
  conn.exec("delete from organizations where name = 'PHONIEX Sample Properties'");
  conn.exec("delete from users where email = 'samples@phoniex.local'");
  deleteUploadFiles(files.map((f) => f.file));
}

/** An earlier version could add illustration pictures to drafts; photos now come only from clients. */
function removeLegacyIllustrations(conn: DatabaseSync) {
  const rows = conn.prepare("select file from listing_media where is_illustration = 1").all() as { file: string }[];
  if (!rows.length) return;
  conn.exec("delete from listing_media where is_illustration = 1");
  deleteUploadFiles(rows.map((r) => r.file));
}

function deleteUploadFiles(files: string[]) {
  const dir = process.env.UPLOADS_DIR ?? path.join(/* turbopackIgnore: true */ process.cwd(), "data", "uploads");
  for (const file of files) {
    if (/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(file)) {
      try {
        unlinkSync(path.join(/* turbopackIgnore: true */ dir, file));
      } catch {}
    }
  }
}

/**
 * node:sqlite returns rows as null-prototype objects, which React cannot pass
 * from Server to Client Components. Make every get()/all() return plain objects.
 */
function plainRows(conn: DatabaseSync) {
  const prepare = conn.prepare.bind(conn);
  conn.prepare = ((sql: string) => {
    const stmt = prepare(sql);
    const get = stmt.get.bind(stmt);
    const all = stmt.all.bind(stmt);
    stmt.get = ((...args: Parameters<typeof get>) => {
      const row = get(...args);
      return row ? { ...row } : row;
    }) as typeof stmt.get;
    stmt.all = ((...args: Parameters<typeof all>) => all(...args).map((r) => ({ ...r }))) as typeof stmt.all;
    return stmt;
  }) as typeof conn.prepare;
}

/** Closes and forgets the connection (used by tests). */
export function resetDb() {
  globalForDb.__phoniexDb?.close();
  globalForDb.__phoniexDb = undefined;
}

export function newId() {
  return crypto.randomUUID();
}

export function nowIso() {
  return new Date().toISOString();
}
