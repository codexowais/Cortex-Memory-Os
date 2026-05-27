"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Brain, CalendarClock, CircleDot, Network, Send, Sparkles, TimerReset } from "lucide-react";
import {
  DailyCognitiveSummary,
  Memory,
  MemoryGraph as MemoryGraphType,
  ProactiveInsight
} from "@/lib/memory/types";

const MemoryGraph = dynamic(() => import("@/components/memory-graph").then((mod) => mod.MemoryGraph), {
  ssr: false,
  loading: () => (
    <div className="grid h-[430px] place-items-center rounded-lg border border-white/10 bg-black/20 text-sm text-muted">
      Loading cognitive map...
    </div>
  )
});

type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

type InsightPayload = {
  memories: Memory[];
  insights: ProactiveInsight[];
  summary: DailyCognitiveSummary;
  graph: MemoryGraphType;
};

const starters = [
  "I usually code better after midnight.",
  "Remind me to finish the Supabase schema before the demo.",
  "I felt scattered today but got momentum after planning the architecture."
];

export function CortexDashboard() {
  const [message, setMessage] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      role: "assistant",
      content:
        "I'm Cortex. Tell me what you're working on, how you operate, or what you do not want to forget. I'll turn it into durable context."
    }
  ]);
  const [data, setData] = useState<InsightPayload | null>(null);

  async function refreshInsights() {
    const response = await fetch("/api/insights", { cache: "no-store" });
    setData(await response.json());
  }

  useEffect(() => {
    refreshInsights();
  }, []);

  async function sendMessage(nextMessage = message) {
    if (!nextMessage.trim() || isThinking) return;

    setIsThinking(true);
    setMessage("");
    setTurns((current) => [...current, { role: "user", content: nextMessage }]);

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: nextMessage })
    });
    const payload = await response.json();

    setTurns((current) => [...current, { role: "assistant", content: payload.response }]);
    await refreshInsights();
    setIsThinking(false);
  }

  const topMemory = useMemo(() => data?.memories?.[0], [data]);

  return (
    <main className="min-h-screen px-5 py-5 text-foreground md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-4 py-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-sm text-muted">
              <CircleDot className="h-3.5 w-3.5 text-mint" />
              Persistent cognitive layer online
            </div>
            <h1 className="text-4xl font-semibold tracking-normal md:text-6xl">Cortex Memory OS</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
              Conversational memory, semantic recall, behavior patterns, and proactive continuity in one calm workspace.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-lg border border-white/10 bg-white/[0.035] p-2">
            <Metric label="Memories" value={data?.summary.stats.total ?? 0} />
            <Metric label="Goals" value={data?.summary.stats.goals ?? 0} />
            <Metric label="Loops" value={data?.summary.stats.tasks ?? 0} />
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="glass flex min-h-[680px] flex-col rounded-lg p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-signal">Continuity Chat</p>
                <h2 className="text-xl font-medium">Talk to the layer</h2>
              </div>
              <Brain className="h-6 w-6 text-mint" />
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {turns.map((turn, index) => (
                <div
                  key={`${turn.role}-${index}`}
                  className={`max-w-[86%] rounded-lg px-4 py-3 text-sm leading-6 transition ${
                    turn.role === "assistant"
                      ? "border border-white/10 bg-white/[0.045] text-slate-100"
                      : "ml-auto bg-signal/15 text-sky-50 ring-1 ring-signal/25"
                  }`}
                >
                  {turn.content}
                </div>
              ))}
              {isThinking ? (
                <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-4 py-3 text-sm text-muted">
                  <Sparkles className="h-4 w-4 animate-pulse text-signal" />
                  Extracting memory and retrieving context...
                </div>
              ) : null}
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-3">
              {starters.map((starter) => (
                <button
                  key={starter}
                  onClick={() => sendMessage(starter)}
                  className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-left text-xs leading-5 text-muted transition hover:border-signal/40 hover:text-foreground"
                >
                  {starter}
                </button>
              ))}
            </div>

            <form
              className="mt-3 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                sendMessage();
              }}
            >
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Share a goal, routine, task, feeling, or pattern..."
                className="min-h-12 flex-1 rounded-lg border border-white/10 bg-black/25 px-4 text-sm outline-none transition placeholder:text-muted focus:border-signal/50"
              />
              <button
                type="submit"
                className="grid h-12 w-12 place-items-center rounded-lg bg-signal text-black transition hover:bg-mint disabled:opacity-50"
                disabled={isThinking}
                aria-label="Send message"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          </div>

          <div className="grid gap-5">
            <Panel icon={<CalendarClock className="h-5 w-5 text-mint" />} title="Daily Cognitive Summary">
              <p className="text-sm leading-6 text-muted">{data?.summary.headline ?? "Loading today's context..."}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <SummarySignal label="Main focus" value={data?.summary.mainFocus} />
                <SummarySignal label="Peak productivity" value={data?.summary.peakProductivity} />
                <SummarySignal label="Recurring concern" value={data?.summary.recurringConcern} />
                <SummarySignal label="Emotional trend" value={data?.summary.emotionalTrend} />
              </div>
              <div className="mt-3 rounded-lg border border-mint/20 bg-mint/[0.06] px-3 py-2 text-sm leading-6">
                {data?.summary.suggestedAction ?? "Waiting for enough signal to suggest the next move."}
              </div>
            </Panel>

            <Panel icon={<Sparkles className="h-5 w-5 text-amber" />} title="Proactive Suggestions">
              <div className="space-y-3">
                {(data?.insights ?? []).map((insight) => (
                  <div key={insight.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-medium">{insight.title}</h3>
                      <span className="text-xs text-mint">{Math.round(insight.confidence * 100)}%</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted">{insight.body}</p>
                    {insight.suggestedAction ? (
                      <p className="mt-2 text-xs leading-5 text-slate-200">{insight.suggestedAction}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </Panel>

            <Panel icon={<TimerReset className="h-5 w-5 text-rose" />} title="Most Recent Memory">
              <p className="text-sm leading-6 text-muted">
                {topMemory ? topMemory.content : "No memory captured yet. Start with a real habit or open loop."}
              </p>
              {topMemory ? (
                <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                  <span className="rounded-full bg-white/[0.06] px-2 py-1">{topMemory.category}</span>
                  <span>importance {topMemory.importance}/10</span>
                </div>
              ) : null}
            </Panel>
          </div>
        </section>

        <section className="glass rounded-lg p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-signal">Memory Graph</p>
              <h2 className="text-xl font-medium">How context connects</h2>
            </div>
            <Network className="h-6 w-6 text-signal" />
          </div>
          {data?.graph ? <MemoryGraph graph={data.graph} /> : null}
        </section>
      </div>
    </main>
  );
}

function SummarySignal({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2">
      <div className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</div>
      <div className="mt-1 text-sm text-slate-100">{value ?? "learning"}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-20 rounded-md bg-black/20 px-3 py-2 text-center">
      <div className="text-xl font-semibold">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

function Panel({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-lg p-4">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h2 className="text-lg font-medium">{title}</h2>
      </div>
      {children}
    </section>
  );
}
