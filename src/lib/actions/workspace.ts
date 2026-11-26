"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canEdit, getWorkspaces, requireUser, requireWorkspace, setActiveOrg } from "@/lib/session";
import * as repo from "@/lib/repo";
import { industries, templateByKey, agentModels } from "@/lib/site";
import type { FormState } from "@/lib/actions/public";

const industrySlugs = [...industries.map((i) => i.slug), "other"] as const;

const NewOrg = z.object({
  name: z.string().trim().min(2, "Enter your business name").max(120),
  industry: z.enum(industrySlugs, "Choose an industry"),
});

export async function createWorkspace(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = NewOrg.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const division = industries.find((i) => i.slug === parsed.data.industry)?.division ?? "business";
  const orgId = repo.createOrganization(user.id, parsed.data.name, parsed.data.industry, division);
  await setActiveOrg(orgId);
  redirect("/app");
}

export async function switchWorkspace(formData: FormData) {
  await requireUser();
  const id = String(formData.get("org_id") ?? "");
  if ((await getWorkspaces()).some((w) => w.id === id)) await setActiveOrg(id);
  redirect("/app");
}

const modelIds = agentModels.map((m) => m.id) as [string, ...string[]];

const AgentInput = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
  role_description: z.string().trim().max(500),
  instructions: z.string().trim().max(6000),
  knowledge: z.string().trim().max(30000, "Knowledge is limited to 30,000 characters for now"),
  model: z.enum(modelIds),
  effort: z.enum(["low", "medium", "high"]),
  approval_policy: z.enum(["none", "sensitive", "all"]),
  status: z.enum(["draft", "active", "paused"]),
  monthly_message_limit: z.coerce.number().int().min(0).max(100000),
});

export async function createAgentFromTemplate(formData: FormData) {
  const { user, ws } = await requireWorkspace();
  if (!canEdit(ws.role)) redirect("/app/agents?error=permission");
  const template = templateByKey(String(formData.get("template") ?? ""));
  if (!template) redirect("/app/agents/new");
  const id = repo.createAgent(user.id, ws.id, {
    name: template.name,
    template: template.key,
    role_description: template.role,
    instructions: template.instructions,
  });
  redirect(`/app/agents/${id}`);
}

export async function updateAgent(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, ws } = await requireWorkspace();
  if (!canEdit(ws.role)) return { ok: false, message: "You have view-only access." };
  const parsed = AgentInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const id = String(formData.get("id") ?? "");
  if (!repo.updateAgent(user.id, ws.id, id, parsed.data)) return { ok: false, message: "Could not save the agent." };
  revalidatePath(`/app/agents/${id}`);
  return { ok: true, message: "Saved." };
}

export async function deleteAgent(formData: FormData) {
  const { user, ws } = await requireWorkspace();
  if (ws.role !== "owner" && ws.role !== "admin") redirect("/app/agents?error=permission");
  repo.deleteAgent(user.id, ws.id, String(formData.get("id") ?? ""));
  redirect("/app/agents");
}
