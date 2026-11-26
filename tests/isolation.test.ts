import { test } from "node:test";
import assert from "node:assert/strict";
import { createUser, verifyLogin, createSession, userFromToken, deleteSession } from "@/lib/auth-core";
import * as repo from "@/lib/repo";
import { db } from "@/lib/db";

// DATABASE_PATH=:memory: is set by `npm test`.

async function makeUser(email: string) {
  const r = await createUser(email, "correct-horse-battery", "Test " + email);
  assert.ok(r.ok);
  return r.userId;
}

test("passwords are hashed and verified", async () => {
  const id = await makeUser("alice@example.com");
  const row = db().prepare("select password_hash from users where id = ?").get(id) as { password_hash: string };
  assert.ok(row.password_hash.startsWith("scrypt$"));
  assert.ok(!row.password_hash.includes("correct-horse-battery"));
  assert.equal(await verifyLogin("ALICE@example.com", "correct-horse-battery"), id);
  assert.equal(await verifyLogin("alice@example.com", "wrong-password"), null);
  assert.equal(await verifyLogin("nobody@example.com", "correct-horse-battery"), null);
  assert.equal((await createUser("alice@example.com", "another-password", "Dup")).ok, false);
});

test("sessions resolve to the user and can be revoked", async () => {
  const id = await makeUser("sess@example.com");
  const { token } = createSession(id);
  assert.equal(userFromToken(token)?.id, id);
  assert.equal(userFromToken("forged-token"), null);
  const stored = db().prepare("select token_hash from sessions where user_id = ?").get(id) as { token_hash: string };
  assert.notEqual(stored.token_hash, token, "raw token must not be stored");
  deleteSession(token);
  assert.equal(userFromToken(token), null);
});

test("one workspace cannot read or change another workspace's data", async () => {
  const a = await makeUser("owner-a@example.com");
  const b = await makeUser("owner-b@example.com");
  const orgA = repo.createOrganization(a, "Alpha Salon", "salons", "business");
  const orgB = repo.createOrganization(b, "Beta Factory", "factories", "enterprise");
  const agentA = repo.createAgent(a, orgA, { name: "Receptionist", template: "customer_service", role_description: "", instructions: "" });

  assert.deepEqual(repo.listWorkspaces(b).map((w) => w.id), [orgB]);
  assert.throws(() => repo.listAgents(b, orgA), repo.AccessDenied);
  assert.throws(() => repo.getAgent(b, orgA, agentA), repo.AccessDenied);
  assert.equal(repo.getAgent(b, orgB, agentA), null, "agent id from another org is not visible via own org");
  assert.equal(repo.getAgentForUser(b, agentA), null);
  assert.throws(() => repo.createAgent(b, orgA, { name: "x", template: "sales", role_description: "", instructions: "" }), repo.AccessDenied);
  assert.throws(() => repo.deleteAgent(b, orgA, agentA), repo.AccessDenied);
  assert.equal(repo.deleteAgent(b, orgB, agentA), false, "cannot delete another org's agent through own org");
  assert.throws(() => repo.listMembers(b, orgA), repo.AccessDenied);
  assert.throws(() => repo.dashboard(b, orgA, new Date(0).toISOString()), repo.AccessDenied);
  assert.throws(() => repo.listProjects(b, orgA), repo.AccessDenied);
  assert.ok(repo.getAgent(a, orgA, agentA));
});

test("viewers cannot edit; members cannot delete", async () => {
  const owner = await makeUser("owner-c@example.com");
  const viewer = await makeUser("viewer-c@example.com");
  const member = await makeUser("member-c@example.com");
  const org = repo.createOrganization(owner, "Gamma Gym", "gyms", "business");
  db().prepare("insert into memberships (org_id, user_id, role) values (?, ?, 'viewer'), (?, ?, 'member')").run(org, viewer, org, member);
  const agent = repo.createAgent(owner, org, { name: "Coach", template: "sales", role_description: "", instructions: "" });

  assert.ok(repo.getAgent(viewer, org, agent), "viewer can read");
  assert.throws(() => repo.createAgent(viewer, org, { name: "x", template: "sales", role_description: "", instructions: "" }), repo.AccessDenied);
  assert.throws(() => repo.deleteAgent(member, org, agent), repo.AccessDenied);
  assert.ok(repo.createAgent(member, org, { name: "Member agent", template: "sales", role_description: "", instructions: "" }));
});

test("project requests cannot be attached to a workspace the user is not in", async () => {
  const a = await makeUser("pa@example.com");
  const b = await makeUser("pb@example.com");
  const orgA = repo.createOrganization(a, "Alpha", "salons", "business");
  repo.createProjectRequest(
    { contact_name: "B", contact_email: "pb@example.com", company: "B Co", industry: "salons", services: [], goals: "Trying to inject into org A" },
    b,
    orgA,
  );
  assert.equal(repo.listProjects(a, orgA).length, 0);
});

test("platform admin overview is restricted", async () => {
  const u = await makeUser("plain@example.com");
  assert.throws(() => repo.adminOverview(u, new Date(0).toISOString()), repo.AccessDenied);
  db().prepare("update users set is_platform_admin = 1 where id = ?").run(u);
  assert.ok(repo.adminOverview(u, new Date(0).toISOString()).orgs.length >= 1);
});

test("rows are plain objects (safe to pass to client components)", async () => {
  const u = await makeUser("plainrow@example.com");
  const org = repo.createOrganization(u, "Plain", "salons", "business");
  const id = repo.createAgent(u, org, { name: "Agent", template: "sales", role_description: "", instructions: "" });
  assert.equal(Object.getPrototypeOf(repo.getAgent(u, org, id)), Object.prototype);
  assert.equal(Object.getPrototypeOf(repo.listAgents(u, org)[0]), Object.prototype);
});
