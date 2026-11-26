"use client";

import { useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export function AgentChat({ agentId, agentName }: { agentId: string; agentName: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setError(null);
    setInput("");
    const history: Msg[] = [...messages, { role: "user", content: text }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setBusy(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-40) }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let reply = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", content: reply }]);
        bottom.current?.scrollIntoView({ block: "nearest" });
      }
    } catch (err) {
      setMessages(history.slice(0, -1));
      setInput(text);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[32rem] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-border bg-bg p-3" aria-live="polite">
        {messages.length === 0 ? (
          <p className="text-sm text-muted">Send a message to test {agentName}. Conversations here are test runs and are logged for usage.</p>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "ml-auto bg-accent text-accent-fg" : "bg-surface-2"}`}>
              {m.content || (busy && i === messages.length - 1 ? "…" : "")}
            </div>
          ))
        )}
        <div ref={bottom} />
      </div>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      <form onSubmit={send} className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="input"
          placeholder="Ask the agent something…"
          maxLength={8000}
          aria-label="Message"
        />
        <button className="btn-primary" disabled={busy || !input.trim()}>{busy ? "…" : "Send"}</button>
      </form>
      <p className="mt-2 text-xs text-muted">AI-generated responses. Verify important information before acting on it.</p>
    </div>
  );
}
