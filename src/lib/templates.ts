import "server-only";
import { agentTemplates, type AgentTemplate } from "@/lib/site";
import { AGENT_TEAM } from "@/lib/agent-team";

// All Agent Builder templates: the general business agents plus the six
// partnership-team agents. Server-only, so agent instructions never reach the browser.
export const allTemplates: AgentTemplate[] = [
  ...agentTemplates,
  ...AGENT_TEAM.map((a) => ({ key: `team_${a.key}`, name: a.name, role: a.role, instructions: a.instructions })),
];

export const findTemplate = (key: string) => allTemplates.find((t) => t.key === key);
