"use client";

import { ActionForm } from "@/components/action-form";
import { useActionState } from "react";
import { updateAgent } from "@/lib/actions/workspace";
import type { FormState } from "@/lib/actions/public";
import { FormMessage } from "@/components/form-bits";
import { agentModels } from "@/lib/site";

export type AgentRow = {
  id: string;
  name: string;
  role_description: string;
  instructions: string;
  knowledge: string;
  model: string;
  effort: string;
  approval_policy: string;
  status: string;
  monthly_message_limit: number;
};

export function AgentForm({ agent, readOnly }: { agent: AgentRow; readOnly: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateAgent, null);
  return (
    <ActionForm action={action} className="space-y-4">
      <input type="hidden" name="id" value={agent.id} />
      <fieldset disabled={readOnly} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">Name</label>
            <input id="name" name="name" defaultValue={agent.name} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue={agent.status} className="input">
              <option value="draft">Draft — testing only</option>
              <option value="active">Active — published</option>
              <option value="paused">Paused</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="role_description">Role</label>
          <input id="role_description" name="role_description" defaultValue={agent.role_description} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="instructions">Instructions</label>
          <textarea id="instructions" name="instructions" defaultValue={agent.instructions} rows={5} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="knowledge">Approved knowledge</label>
          <textarea
            id="knowledge"
            name="knowledge"
            defaultValue={agent.knowledge}
            rows={8}
            className="input font-mono text-xs"
            placeholder="Paste FAQs, services and prices, opening hours, policies… The agent answers only from this and says when information is missing."
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="model">Model</label>
            <select id="model" name="model" defaultValue={agent.model} className="input">
              {agentModels.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="effort">Reasoning effort</label>
            <select id="effort" name="effort" defaultValue={agent.effort} className="input">
              <option value="low">Low — fastest, cheapest</option>
              <option value="medium">Medium</option>
              <option value="high">High — most thorough</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="approval_policy">Human approval</label>
            <select id="approval_policy" name="approval_policy" defaultValue={agent.approval_policy} className="input">
              <option value="sensitive">Required for sensitive actions</option>
              <option value="all">Required for every action</option>
              <option value="none">Not required</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="monthly_message_limit">Monthly message limit</label>
            <input id="monthly_message_limit" name="monthly_message_limit" type="number" min={0} defaultValue={agent.monthly_message_limit} className="input" />
          </div>
        </div>
      </fieldset>
      <FormMessage state={state} />
      {!readOnly ? <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : "Save agent"}</button> : null}
    </ActionForm>
  );
}
