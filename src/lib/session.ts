import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, deleteSession, SESSION_DAYS, userFromToken } from "@/lib/auth-core";
import { listWorkspaces, type OrgRole, type Workspace } from "@/lib/repo";

export const SESSION_COOKIE = "phx_session";
export const ORG_COOKIE = "phx_org";
export type { OrgRole, Workspace };

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function startSession(userId: string) {
  const { token, expires } = createSession(userId);
  (await cookies()).set(SESSION_COOKIE, token, { ...cookieOpts, expires });
}

export async function endSession() {
  const jar = await cookies();
  deleteSession(jar.get(SESSION_COOKIE)?.value);
  jar.delete(SESSION_COOKIE);
  jar.delete(ORG_COOKIE);
}

export async function setActiveOrg(orgId: string) {
  (await cookies()).set(ORG_COOKIE, orgId, { ...cookieOpts, maxAge: SESSION_DAYS * 86400 });
}

/** The signed-in user, or null. */
export const getUser = cache(async () => userFromToken((await cookies()).get(SESSION_COOKIE)?.value));

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export const getWorkspaces = cache(async (): Promise<Workspace[]> => {
  const user = await getUser();
  return user ? listWorkspaces(user.id) : [];
});

/** The active workspace (from cookie, else the first one). Redirects to onboarding if none. */
export async function requireWorkspace() {
  const user = await requireUser();
  const workspaces = await getWorkspaces();
  if (workspaces.length === 0) redirect("/onboarding");
  const selected = (await cookies()).get(ORG_COOKIE)?.value;
  const ws = workspaces.find((w) => w.id === selected) ?? workspaces[0];
  return { user, ws };
}

export function canEdit(role: OrgRole) {
  return role === "owner" || role === "admin" || role === "member";
}

export async function isPlatformAdmin() {
  return (await getUser())?.is_platform_admin === 1;
}
