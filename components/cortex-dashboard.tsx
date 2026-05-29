"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  Brain,
  CalendarClock,
  CircleDot,
  History,
  Lightbulb,
  Network,
  RotateCcw,
  Send,
  Sparkles,
  TimerReset,
  Zap
} from "lucide-react";
import {
  DailyCognitiveSummary,
  Memory,
  MemoryGraph as MemoryGraphType,
  MemoryTimelineDay,
  OpenLoopCandidate,
  ProactiveInsight,
  ReflectionReport
} from "@/lib/memory/types";

const MemoryGraph = dynamic(() => import("@/components/memory-graph").then((mod) => mod.MemoryGraph), {
  ssr: false,
  loading: () => (
    <div className="grid h-[680px] place-items-center rounded-lg border border-white/10 bg-black/20 text-sm text-muted">
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
  openLoops: OpenLoopCandidate[];
  reflection: ReflectionReport;
  timeline: MemoryTimelineDay[];
  summary: DailyCognitiveSummary;
  graph: MemoryGraphType;
};

const starters = [
  "What should I work on next?",
  "I am stressed and feel scattered.",
  "What have you learned about me?"
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
            <Metric label="Loops" value={data?.openLoops.length ?? 0} />
          </div>
        </header>

        {/* CHANGE 1: Grid rebalanced — chat narrower (0.7fr), cognition panels wider (1.3fr) */}
        <section className="grid gap-5 lg:grid-cols-[0.7fr_1.3fr]">
          {/* Left column: chat + memory pulse stacked to fill full right-column height */}
          <div className="flex flex-col gap-5">
          {/* CHANGE 2: Chat height reduced from min-h-[680px] to h-[560px] */}
          <div className="glass flex h-[560px] flex-col rounded-lg p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-signal">Continuity Chat</p>
                <h2 className="text-xl font-medium">Talk to the layer</h2>
              </div>
              <Brain className="h-6 w-6 text-mint" />
            </div>

            {/* CHANGE 3: Message area constrained to h-[300px] with scroll instead of flex-1 stretch */}
            <div className="h-[300px] flex-1 space-y-3 overflow-y-auto pr-1">
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

            <div className="mt-4 grid gap-2">
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
          </div>{/* end chat panel */}

          {/* Memory Pulse: fills leftover vertical space below chat */}
          <div className="glass flex flex-1 flex-col rounded-lg p-4">
            <div className="mb-3 flex items-center gap-2">
              <Zap className="h-5 w-5 text-signal" />
              <h2 className="text-lg font-medium">Memory Pulse</h2>
            </div>
            <p className="mb-3 text-xs text-muted">Live feed of stored context</p>
            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
              {(data?.memories ?? []).slice(0, 12).map((mem) => (
                <div
                  key={mem.id}
                  className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2 transition hover:border-white/20"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs leading-5 text-slate-300 line-clamp-2">{mem.summary || mem.content}</p>
                    <span className="shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-muted">
                      {mem.importance}/10
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] ${
                        mem.category === "goal"
                          ? "bg-mint/10 text-mint"
                          : mem.category === "task"
                          ? "bg-signal/10 text-signal"
                          : mem.category === "emotional_state"
                          ? "bg-rose/10 text-rose"
                          : mem.category === "project"
                          ? "bg-amber/10 text-amber"
                          : "bg-white/[0.06] text-muted"
                      }`}
                    >
                      {mem.category}
                    </span>
                    {mem.metadata?.openLoop?.status === "active" && (
                      <span className="rounded-full bg-rose/10 px-2 py-0.5 text-[10px] text-rose">open loop</span>
                    )}
                  </div>
                </div>
              ))}
              {(data?.memories ?? []).length === 0 && (
                <p className="text-xs text-muted">No memories stored yet. Start a conversation to build context.</p>
              )}
            </div>
          </div>{/* end memory pulse */}

          </div>{/* end left flex column */}

          {/* CHANGE 4: Panel order rebalanced — Open Loops moved above Proactive Suggestions */}
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

            {/* Open Loops: promoted above Proactive Suggestions */}
            <Panel icon={<RotateCcw className="h-5 w-5 text-rose" />} title="Open Loops">
              <div className="space-y-3">
                {(data?.openLoops ?? []).slice(0, 3).map((loop) => (
                  <div key={loop.memory.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-medium">{loop.memory.summary}</h3>
                      <span className="text-xs text-mint">{Math.round(loop.score * 100)}</span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted">{loop.reasons.join(" / ")}</p>
                    <div className="mt-2 text-xs text-slate-200">
                      resurfaced {loop.memory.metadata.openLoop?.resurfacedCount ?? 0} times
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Proactive Suggestions: now below Open Loops */}
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

        <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <Panel icon={<Lightbulb className="h-5 w-5 text-mint" />} title="What Cortex Has Learned">
            <p className="text-sm leading-6 text-muted">
              {data?.reflection.headline ?? "Learning your habits, goals, and emotional patterns..."}
            </p>
            <div className="mt-4 space-y-2">
              {(data?.reflection.learned ?? []).slice(0, 5).map((item) => (
                <div key={item} className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-sm leading-6">
                  {item}
                </div>
              ))}
            </div>
          </Panel>

          <Panel icon={<History className="h-5 w-5 text-signal" />} title="Cognitive Timeline">
            <div className="space-y-3">
              {(data?.timeline ?? []).slice(-4).map((day) => (
                <div key={day.date} className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 md:grid-cols-[9rem_1fr]">
                  <div>
                    <div className="text-sm font-medium">{day.label}</div>
                    <div className="mt-1 text-xs text-muted">{day.emotionalTrend}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-100">{day.theme}</div>
                    <p className="mt-1 text-xs leading-5 text-muted">{day.milestones[0] ?? "No major milestone yet."}</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
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

