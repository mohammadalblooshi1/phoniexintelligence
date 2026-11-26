"use client";

import { useEffect, useRef, useState } from "react";

type AgentCard = { key: string; name: string; arabic: string; role: string; does: string[] };
type Msg = { role: "user" | "assistant"; content: string };

/** Pick one of the six agents and ask it for help. */
export function AgentTeamChat({ agents }: { agents: AgentCard[] }) {
  const [active, setActive] = useState(agents[0].key);
  const [threads, setThreads] = useState<Record<string, Msg[]>>({});
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const agent = agents.find((a) => a.key === active)!;
  const messages = threads[active] ?? [];

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [messages.length, busy]);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (text.length < 2 || busy) return;
    setError(null);
    setInput("");
    const history = messages.slice(-8);
    setThreads((t) => ({ ...t, [active]: [...(t[active] ?? []), { role: "user", content: text }] }));
    setBusy(true);
    try {
      const res = await fetch("/api/agent-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: active, message: text, history }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
      setThreads((t) => ({ ...t, [active]: [...(t[active] ?? []), { role: "assistant", content: data.answer }] }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1" role="tablist" aria-label="Choose an agent">
        {agents.map((a, i) => (
          <button
            key={a.key}
            type="button"
            role="tab"
            aria-selected={a.key === active}
            onClick={() => { setActive(a.key); setError(null); }}
            className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${a.key === active ? "border-accent bg-accent-soft" : "border-border bg-surface hover:border-accent"}`}
          >
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${a.key === active ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted"}`}>{i + 1}</span>
            <span className="min-w-0">
              <span className="block font-semibold">{a.name} <span className="font-normal text-muted">· {a.arabic}</span></span>
              <span className="block text-xs text-muted">{a.role}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="flex min-h-[520px] min-w-0 flex-col rounded-2xl border border-border bg-surface" role="tabpanel" aria-label={agent.name}>
        <div className="border-b border-border p-4">
          <p className="font-semibold">{agent.name} <span className="font-normal text-muted">· {agent.arabic}</span></p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {agent.does.map((d) => <li key={d} className="badge">{d}</li>)}
          </ul>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
          {messages.length === 0 ? (
            <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-2 text-center text-sm text-muted">
              <p className="text-base font-medium text-fg">How can I help?</p>
              <p className="max-w-sm">Ask the {agent.name} anything about its work, in English or Arabic.</p>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "ml-auto bg-accent text-accent-fg" : "bg-surface-2"}`} dir="auto">
                {m.content}
              </div>
            ))
          )}
          {busy ? <div className="w-fit rounded-2xl bg-surface-2 px-4 py-2.5 text-sm text-muted">Thinking…</div> : null}
          <div ref={bottom} />
        </div>
        {error ? <p role="alert" className="px-4 text-sm text-danger">{error}</p> : null}
        <form onSubmit={ask} className="flex gap-2 border-t border-border p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="input"
            placeholder={`Ask the ${agent.name} for help…`}
            maxLength={500}
            aria-label={`Message the ${agent.name}`}
            dir="auto"
          />
          <button className="btn-primary" disabled={busy || input.trim().length < 2}>Ask</button>
        </form>
      </div>
    </div>
  );
}
