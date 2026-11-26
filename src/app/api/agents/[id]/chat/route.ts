import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getUser } from "@/lib/session";
import { getAgentForUser, logRun, runsThisMonth } from "@/lib/repo";
import { anthropic, ALLOWED_MODELS, buildSystemPrompt, demoReply, modelFor, supportsServerFallback } from "@/lib/ai";

export const maxDuration = 120;

const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(8000) }))
    .min(1)
    .max(40),
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Enqueue that ignores a closed stream, so the run finishes and is logged even if the browser disconnects. */
function writer(controller: ReadableStreamDefaultController<Uint8Array>) {
  const encoder = new TextEncoder();
  let open = true;
  return {
    write(text: string) {
      if (!open) return;
      try {
        controller.enqueue(encoder.encode(text));
      } catch {
        open = false;
      }
    },
    close() {
      if (!open) return;
      open = false;
      try {
        controller.close();
      } catch {}
    },
  };
}

export async function POST(request: Request, ctx: RouteContext<"/api/agents/[id]/chat">) {
  const { id } = await ctx.params;
  const user = await getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const messages = parsed.data.messages;
  if (messages[messages.length - 1].role !== "user") {
    return Response.json({ error: "Last message must be from the user" }, { status: 400 });
  }

  // Only returns the agent if the user is a member of its workspace.
  const agent = getAgentForUser(user.id, id);
  if (!agent) return Response.json({ error: "Agent not found" }, { status: 404 });
  if (agent.status === "paused") return Response.json({ error: "This agent is paused" }, { status: 409 });
  if (!ALLOWED_MODELS.includes(agent.model)) return Response.json({ error: "Agent model is not allowed" }, { status: 400 });

  if (runsThisMonth(agent.id) >= agent.monthly_message_limit) {
    logRun(user.id, agent, { status: "limited" });
    return Response.json({ error: "Monthly message limit reached for this agent" }, { status: 429 });
  }

  const client = anthropic();
  const started = Date.now();
  const headers = { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" };

  // Demo mode: no AI key configured. Stream a clearly labelled simulated reply.
  if (!client) {
    const text = demoReply(agent, messages[messages.length - 1].content);
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        logRun(user.id, agent, { status: "demo", latency_ms: Date.now() - started });
        const out = writer(controller);
        for (const word of text.split(/(?<=\s)/)) {
          out.write(word);
          await sleep(15);
        }
        out.close();
      },
    });
    return new Response(body, { headers });
  }

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const out = writer(controller);
      try {
        const stream = client.beta.messages.stream({
          model: modelFor(agent.model),
          max_tokens: 16000,
          system: buildSystemPrompt(agent, agent.org_name),
          messages: messages as Anthropic.Beta.BetaMessageParam[],
          output_config: { effort: agent.effort },
          ...(supportsServerFallback(agent.model)
            ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
            : {}),
        });

        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            out.write(event.delta.text);
          }
        }

        const final = await stream.finalMessage();
        const refused = final.stop_reason === "refusal";
        if (refused) out.write("\n\n[This request was declined by the model's safety system.]");
        else if (final.stop_reason === "max_tokens") out.write("\n\n[Response truncated.]");
        logRun(user.id, agent, {
          status: refused ? "refused" : "ok",
          input_tokens: final.usage.input_tokens,
          output_tokens: final.usage.output_tokens,
          latency_ms: Date.now() - started,
        });
      } catch (err) {
        let message = "The AI service failed. Please try again.";
        if (err instanceof Anthropic.RateLimitError) message = "The AI service is busy. Please retry in a moment.";
        else if (err instanceof Anthropic.AuthenticationError) message = "The AI API key is invalid.";
        else if (err instanceof Anthropic.APIError) message = `AI service error (${err.status}).`;
        console.error("[agent chat]", err);
        logRun(user.id, agent, {
          status: "error",
          latency_ms: Date.now() - started,
          error: err instanceof Error ? err.message.slice(0, 500) : "unknown",
        });
        out.write(`\n\n[${message}]`);
      } finally {
        out.close();
      }
    },
  });

  return new Response(body, { headers });
}
