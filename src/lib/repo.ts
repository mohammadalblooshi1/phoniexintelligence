import "server-only";
import { db, newId, nowIso } from "@/lib/db";

// Tenant-scoped data access. Every workspace function takes the acting user's id
// and checks their membership/role first, so one customer can never read or change
// another customer's data. Pages and API routes must go through these functions.

export type OrgRole = "owner" | "admin" | "member" | "viewer";
export type Workspace = { id: string; name: string; industry: string; division: string; plan: string; role: OrgRole };

export class AccessDenied extends Error {
  constructor(message = "Access denied") {
    super(message);
  }
}

const EDITORS: OrgRole[] = ["owner", "admin", "member"];
const ADMINS: OrgRole[] = ["owner", "admin"];

export function roleOf(userId: string, orgId: string): OrgRole | null {
  const row = db().prepare("select role from memberships where org_id = ? and user_id = ?").get(orgId, userId) as
    | { role: OrgRole }
    | undefined;
  return row?.role ?? null;
}

function requireRole(userId: string, orgId: string, allowed?: OrgRole[]) {
  const role = roleOf(userId, orgId);
  if (!role || (allowed && !allowed.includes(role))) throw new AccessDenied();
  return role;
}

function isAdmin(userId: string) {
  const row = db().prepare("select is_platform_admin from users where id = ?").get(userId) as
    | { is_platform_admin: number }
    | undefined;
  return row?.is_platform_admin === 1;
}

export function audit(orgId: string | null, actorId: string | null, action: string, details: object = {}) {
  db()
    .prepare("insert into audit_logs (org_id, actor_id, action, details) values (?, ?, ?, ?)")
    .run(orgId, actorId, action, JSON.stringify(details));
}

// ---------------------------------------------------------------- workspaces

export function listWorkspaces(userId: string): Workspace[] {
  return db()
    .prepare(
      `select o.id, o.name, o.industry, o.division, o.plan, m.role
         from memberships m join organizations o on o.id = m.org_id
        where m.user_id = ? order by m.created_at`,
    )
    .all(userId) as Workspace[];
}

export function createOrganization(userId: string, name: string, industry: string, division: string) {
  const conn = db();
  const id = newId();
  conn.exec("begin");
  try {
    conn.prepare("insert into organizations (id, name, industry, division, created_by) values (?, ?, ?, ?, ?)")
      .run(id, name, industry, division, userId);
    conn.prepare("insert into memberships (org_id, user_id, role) values (?, ?, 'owner')").run(id, userId);
    audit(id, userId, "organization.created", { name });
    conn.exec("commit");
  } catch (e) {
    conn.exec("rollback");
    throw e;
  }
  return id;
}

export function listMembers(userId: string, orgId: string) {
  requireRole(userId, orgId);
  return db()
    .prepare(
      `select u.email, u.full_name, m.role from memberships m join users u on u.id = m.user_id
        where m.org_id = ? order by m.created_at`,
    )
    .all(orgId) as { email: string; full_name: string; role: OrgRole }[];
}

// ---------------------------------------------------------------- agents

export type Agent = {
  id: string;
  org_id: string;
  name: string;
  template: string;
  role_description: string;
  instructions: string;
  knowledge: string;
  model: string;
  effort: "low" | "medium" | "high";
  approval_policy: "none" | "sensitive" | "all";
  status: "draft" | "active" | "paused";
  monthly_message_limit: number;
  updated_at: string;
};

export function listAgents(userId: string, orgId: string) {
  requireRole(userId, orgId);
  return db().prepare("select * from agents where org_id = ? order by created_at").all(orgId) as Agent[];
}

export function getAgent(userId: string, orgId: string, agentId: string): Agent | null {
  requireRole(userId, orgId);
  const row = db().prepare("select * from agents where id = ? and org_id = ?").get(agentId, orgId) as
    | Agent
    | undefined;
  return row ?? null;
}

export function createAgent(
  userId: string,
  orgId: string,
  input: { name: string; template: string; role_description: string; instructions: string },
) {
  requireRole(userId, orgId, EDITORS);
  const id = newId();
  db()
    .prepare(
      `insert into agents (id, org_id, name, template, role_description, instructions, created_by)
       values (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, orgId, input.name, input.template, input.role_description, input.instructions, userId);
  audit(orgId, userId, "agent.created", { agent_id: id, template: input.template });
  return id;
}

export type AgentUpdate = Pick<
  Agent,
  "name" | "role_description" | "instructions" | "knowledge" | "model" | "effort" | "approval_policy" | "status" | "monthly_message_limit"
>;

export function updateAgent(userId: string, orgId: string, agentId: string, u: AgentUpdate) {
  requireRole(userId, orgId, EDITORS);
  const r = db()
    .prepare(
      `update agents set name = ?, role_description = ?, instructions = ?, knowledge = ?, model = ?, effort = ?,
              approval_policy = ?, status = ?, monthly_message_limit = ?, updated_at = ?
        where id = ? and org_id = ?`,
    )
    .run(u.name, u.role_description, u.instructions, u.knowledge, u.model, u.effort, u.approval_policy, u.status,
      u.monthly_message_limit, nowIso(), agentId, orgId);
  if (r.changes === 0) return false;
  audit(orgId, userId, "agent.updated", { agent_id: agentId, status: u.status, model: u.model });
  return true;
}

export function deleteAgent(userId: string, orgId: string, agentId: string) {
  requireRole(userId, orgId, ADMINS);
  const r = db().prepare("delete from agents where id = ? and org_id = ?").run(agentId, orgId);
  if (r.changes) audit(orgId, userId, "agent.deleted", { agent_id: agentId });
  return r.changes > 0;
}

// ---------------------------------------------------------------- agent runs

export type RunStatus = "ok" | "demo" | "refused" | "error" | "limited";

export function logRun(
  userId: string,
  agent: Pick<Agent, "id" | "org_id" | "model">,
  r: { status: RunStatus; input_tokens?: number; output_tokens?: number; latency_ms?: number; error?: string },
) {
  requireRole(userId, agent.org_id);
  db()
    .prepare(
      `insert into agent_runs (id, org_id, agent_id, user_id, model, input_tokens, output_tokens, latency_ms, status, error)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(newId(), agent.org_id, agent.id, userId, agent.model, r.input_tokens ?? 0, r.output_tokens ?? 0,
      r.latency_ms ?? 0, r.status, r.error ?? null);
}

export function runsThisMonth(agentId: string) {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const row = db()
    .prepare("select count(*) as n from agent_runs where agent_id = ? and status in ('ok','demo') and created_at >= ?")
    .get(agentId, start.toISOString()) as { n: number };
  return row.n;
}

export function recentRuns(userId: string, orgId: string, agentId: string, limit = 10) {
  requireRole(userId, orgId);
  return db()
    .prepare(
      `select id, status, input_tokens, output_tokens, latency_ms, created_at from agent_runs
        where agent_id = ? and org_id = ? order by created_at desc limit ?`,
    )
    .all(agentId, orgId, limit) as {
    id: string; status: RunStatus; input_tokens: number; output_tokens: number; latency_ms: number; created_at: string;
  }[];
}

// ---------------------------------------------------------------- dashboard

export function dashboard(userId: string, orgId: string, sinceIso: string) {
  requireRole(userId, orgId);
  const conn = db();
  const agents = conn.prepare("select id, name, status from agents where org_id = ? order by created_at").all(orgId) as {
    id: string; name: string; status: string;
  }[];
  const runs = conn
    .prepare("select status, input_tokens, output_tokens, latency_ms from agent_runs where org_id = ? and created_at >= ?")
    .all(orgId, sinceIso) as { status: RunStatus; input_tokens: number; output_tokens: number; latency_ms: number }[];
  const projects = (conn.prepare("select count(*) as n from project_requests where org_id = ?").get(orgId) as { n: number }).n;
  const activity = conn
    .prepare("select id, action, created_at from audit_logs where org_id = ? order by id desc limit 10")
    .all(orgId) as { id: number; action: string; created_at: string }[];
  return { agents, runs, projects, activity };
}

// ---------------------------------------------------------------- projects & leads

export type ProjectInput = {
  contact_name: string; contact_email: string; company: string; industry: string;
  services: string[]; goals: string; budget?: string; timeline?: string;
};

/** Public submission. If a signed-in user names a workspace, they must belong to it. */
export function createProjectRequest(input: ProjectInput, userId: string | null, orgId: string | null) {
  const org = userId && orgId && roleOf(userId, orgId) ? orgId : null;
  db()
    .prepare(
      `insert into project_requests (id, org_id, submitted_by, contact_name, contact_email, company, industry, services, goals, budget, timeline)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(newId(), org, userId, input.contact_name, input.contact_email, input.company, input.industry,
      JSON.stringify(input.services), input.goals, input.budget ?? null, input.timeline ?? null);
  if (org) audit(org, userId, "project.requested", { company: input.company });
}

export function listProjects(userId: string, orgId: string) {
  requireRole(userId, orgId);
  const rows = db()
    .prepare("select id, company, industry, services, goals, status, created_at from project_requests where org_id = ? order by created_at desc")
    .all(orgId) as { id: string; company: string; industry: string; services: string; goals: string; status: string; created_at: string }[];
  return rows.map((r) => ({ ...r, services: JSON.parse(r.services) as string[] }));
}

export function createLead(l: { name: string; email: string; company?: string; phone?: string; industry?: string; message: string }) {
  db()
    .prepare("insert into leads (id, name, email, company, phone, industry, message) values (?, ?, ?, ?, ?, ?, ?)")
    .run(newId(), l.name, l.email, l.company ?? null, l.phone ?? null, l.industry ?? null, l.message);
}

// ---------------------------------------------------------------- platform admin

export function adminOverview(userId: string, sinceIso: string) {
  if (!isAdmin(userId)) throw new AccessDenied();
  const conn = db();
  return {
    orgs: conn.prepare("select id, name, industry, plan, created_at from organizations order by created_at desc limit 50").all() as {
      id: string; name: string; industry: string; plan: string; created_at: string;
    }[],
    leads: conn.prepare("select id, name, email, company, message, created_at from leads order by created_at desc limit 25").all() as {
      id: string; name: string; email: string; company: string | null; message: string; created_at: string;
    }[],
    requests: conn.prepare("select id, company, contact_email, industry, status, created_at from project_requests order by created_at desc limit 25").all() as {
      id: string; company: string; contact_email: string; industry: string; status: string; created_at: string;
    }[],
    runs: conn.prepare("select count(*) as n, coalesce(sum(input_tokens + output_tokens), 0) as tokens from agent_runs where created_at >= ?").get(sinceIso) as {
      n: number; tokens: number;
    },
    outbox: conn.prepare("select id, to_addr, subject, body, status, error, created_at from outbox order by created_at desc limit 25").all() as {
      id: string; to_addr: string; subject: string; body: string; status: string; error: string | null; created_at: string;
    }[],
  };
}

/** An agent the user can access in any of their workspaces, with the workspace name. */
export function getAgentForUser(userId: string, agentId: string) {
  const row = db()
    .prepare(
      `select a.*, o.name as org_name from agents a
         join memberships m on m.org_id = a.org_id and m.user_id = ?
         join organizations o on o.id = a.org_id
        where a.id = ?`,
    )
    .get(userId, agentId) as (Agent & { org_name: string }) | undefined;
  return row ?? null;
}
