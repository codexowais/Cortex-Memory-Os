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

type DashboardTab = "overview" | "reflection" | "timeline" | "graph";

const tabs: Array<{ id: DashboardTab; label: string; icon: React.ReactNode }> = [
  { id: "overview", label: "Overview", icon: <Brain className="h-4 w-4" /> },
  { id: "reflection", label: "Reflection", icon: <Lightbulb className="h-4 w-4" /> },
  { id: "timeline", label: "Timeline", icon: <History className="h-4 w-4" /> },
  { id: "graph", label: "Graph", icon: <Network className="h-4 w-4" /> }
];

const starters = [
  "What should I work on next?",
  "I am stressed and feel scattered.",
  "What have you learned about me?"
];

export function CortexDashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
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
        <header className="flex flex-col gap-4 py-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-sm text-muted">
              <CircleDot className="h-3.5 w-3.5 text-mint" />
              Persistent cognitive layer online
            </div>
            <h1 className="text-4xl font-semibold tracking-normal md:text-6xl">Cortex Memory OS</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
              A memory layer for recall, open loops, reflection, and temporal continuity.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-lg border border-white/10 bg-white/[0.035] p-2">
            <Metric label="Memories" value={data?.summary.stats.total ?? 0} />
            <Metric label="Goals" value={data?.summary.stats.goals ?? 0} />
            <Metric label="Loops" value={data?.openLoops.length ?? 0} />
          </div>
        </header>

        <nav className="flex flex-wrap gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-1.5">
          {tabs.map((tab) => (
            <TabButton key={tab.id} tab={tab} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} />
          ))}
        </nav>

        {activeTab === "overview" ? (
          <OverviewTab
            data={data}
            isThinking={isThinking}
            message={message}
            setMessage={setMessage}
            sendMessage={sendMessage}
            topMemory={topMemory}
            turns={turns}
          />
        ) : null}

        {activeTab === "reflection" ? <ReflectionTab data={data} /> : null}

        {activeTab === "timeline" ? <TimelineTab data={data} /> : null}

        {activeTab === "graph" ? (
          <section className="glass rounded-lg p-4">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-signal">Memory Graph</p>
                <h2 className="text-2xl font-medium">How context connects</h2>
              </div>
              <p className="max-w-xl text-sm leading-6 text-muted">
                Auto Layout uses Dagre for readable structure. Drag any node to switch into Manual Layout and preserve your
                working arrangement.
              </p>
            </div>
            {data?.graph ? <MemoryGraph graph={data.graph} /> : <GraphLoading />}
          </section>
        ) : null}
      </div>
    </main>
  );
}

function OverviewTab({
  data,
  isThinking,
  message,
  sendMessage,
  setMessage,
  topMemory,
  turns
}: {
  data: InsightPayload | null;
  isThinking: boolean;
  message: string;
  sendMessage: (message?: string) => void;
  setMessage: (message: string) => void;
  topMemory?: Memory;
  turns: ChatTurn[];
}) {
  return (
    <section className="grid gap-5 xl:grid-cols-[0.78fr_1.22fr]">
      <div className="grid gap-5">
        <ChatPanel
          isThinking={isThinking}
          message={message}
          sendMessage={sendMessage}
          setMessage={setMessage}
          turns={turns}
        />
        <MemoryPulse memories={data?.memories ?? []} />
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

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel icon={<RotateCcw className="h-5 w-5 text-rose" />} title="Open Loops">
            <div className="space-y-3">
              {(data?.openLoops ?? []).slice(0, 4).map((loop) => (
                <OpenLoopCard key={loop.memory.id} loop={loop} />
              ))}
              {!data?.openLoops?.length ? <EmptyState text="No active open loops detected yet." /> : null}
            </div>
          </Panel>

          <Panel icon={<Sparkles className="h-5 w-5 text-amber" />} title="Proactive Suggestions">
            <div className="space-y-3">
              {(data?.insights ?? []).slice(0, 4).map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
              {!data?.insights?.length ? <EmptyState text="Waiting for enough signal to form suggestions." /> : null}
            </div>
          </Panel>
        </div>

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
  );
}

function ReflectionTab({ data }: { data: InsightPayload | null }) {
  const reflection = data?.reflection;

  return (
    <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <Panel icon={<Lightbulb className="h-5 w-5 text-mint" />} title="What Cortex Has Learned">
        <p className="text-sm leading-6 text-muted">
          {reflection?.headline ?? "Learning your habits, goals, and emotional patterns..."}
        </p>
        <div className="mt-4 space-y-2">
          {(reflection?.learned ?? []).slice(0, 7).map((item) => (
            <div key={item} className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-sm leading-6">
              {item}
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-5">
        <ReflectionGroup title="Habits" items={reflection?.habits ?? []} />
        <ReflectionGroup title="Productivity Patterns" items={reflection?.productivityPatterns ?? []} />
        <ReflectionGroup title="Emotional Trends" items={reflection?.emotionalTrends ?? []} />
        <ReflectionGroup title="Recurring Goals" items={reflection?.recurringGoals ?? []} />
        <ReflectionGroup title="Behavioral Shifts" items={reflection?.behavioralShifts ?? []} />
      </div>
    </section>
  );
}

function TimelineTab({ data }: { data: InsightPayload | null }) {
  return (
    <section className="glass rounded-lg p-4">
      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-signal">Cognitive Timeline</p>
          <h2 className="text-2xl font-medium">How the work has evolved</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-muted">
          Memories are grouped by day so the demo reads as a temporal story instead of a static archive.
        </p>
      </div>

      <div className="space-y-3">
        {(data?.timeline ?? []).map((day) => (
          <div key={day.date} className="grid gap-4 rounded-lg border border-white/10 bg-white/[0.035] p-4 md:grid-cols-[12rem_1fr]">
            <div>
              <div className="text-base font-medium">{day.label}</div>
              <div className="mt-1 text-xs text-muted">{day.emotionalTrend}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-100">{day.theme}</div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {day.milestones.map((milestone) => (
                  <div key={milestone} className="rounded-lg border border-white/[0.07] bg-black/20 px-3 py-2 text-sm leading-6 text-muted">
                    {milestone}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
        {!data?.timeline?.length ? <EmptyState text="No timeline data yet." /> : null}
      </div>
    </section>
  );
}

function ChatPanel({
  isThinking,
  message,
  sendMessage,
  setMessage,
  turns
}: {
  isThinking: boolean;
  message: string;
  sendMessage: (message?: string) => void;
  setMessage: (message: string) => void;
  turns: ChatTurn[];
}) {
  return (
    <div className="glass flex h-[560px] flex-col rounded-lg p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-signal">Continuity Chat</p>
          <h2 className="text-xl font-medium">Talk to the layer</h2>
        </div>
        <Brain className="h-6 w-6 text-mint" />
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {turns.map((turn, index) => (
          <div
            key={`${turn.role}-${index}`}
            className={`max-w-[88%] rounded-lg px-4 py-3 text-sm leading-6 transition ${
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
    </div>
  );
}

function MemoryPulse({ memories }: { memories: Memory[] }) {
  return (
    <div className="glass flex max-h-[390px] flex-col rounded-lg p-4">
      <div className="mb-3 flex items-center gap-2">
        <Zap className="h-5 w-5 text-signal" />
        <h2 className="text-lg font-medium">Memory Pulse</h2>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {memories.slice(0, 12).map((memory) => (
          <div key={memory.id} className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2">
            <div className="flex items-start justify-between gap-2">
              <p className="line-clamp-2 text-xs leading-5 text-slate-300">{memory.summary || memory.content}</p>
              <span className="shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-muted">
                {memory.importance}/10
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-muted">{memory.category}</span>
              {memory.metadata?.openLoop?.status === "active" ? (
                <span className="rounded-full bg-rose/10 px-2 py-0.5 text-[10px] text-rose">open loop</span>
              ) : null}
            </div>
          </div>
        ))}
        {!memories.length ? <EmptyState text="No memories stored yet. Start a conversation to build context." /> : null}
      </div>
    </div>
  );
}

function ReflectionGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <Panel icon={<Sparkles className="h-5 w-5 text-signal" />} title={title}>
      <div className="space-y-2">
        {items.slice(0, 4).map((item) => (
          <div key={item} className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-sm leading-6 text-muted">
            {item}
          </div>
        ))}
        {!items.length ? <EmptyState text="Still learning." /> : null}
      </div>
    </Panel>
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

function InsightCard({ insight }: { insight: ProactiveInsight }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">{insight.title}</h3>
        <span className="text-xs text-mint">{Math.round(insight.confidence * 100)}%</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted">{insight.body}</p>
      {insight.suggestedAction ? <p className="mt-2 text-xs leading-5 text-slate-200">{insight.suggestedAction}</p> : null}
    </div>
  );
}

function OpenLoopCard({ loop }: { loop: OpenLoopCandidate }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">{loop.memory.summary}</h3>
        <span className="text-xs text-mint">{Math.round(loop.score * 100)}</span>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted">{loop.reasons.join(" / ")}</p>
      <div className="mt-2 text-xs text-slate-200">resurfaced {loop.memory.metadata.openLoop?.resurfacedCount ?? 0} times</div>
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

function TabButton({
  active,
  onClick,
  tab
}: {
  active: boolean;
  onClick: () => void;
  tab: { label: string; icon: React.ReactNode };
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
        active ? "bg-signal text-black" : "text-muted hover:bg-white/[0.05] hover:text-slate-100"
      }`}
    >
      {tab.icon}
      {tab.label}
    </button>
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

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-lg border border-white/[0.07] bg-black/20 px-3 py-2 text-sm leading-6 text-muted">{text}</p>;
}

function GraphLoading() {
  return (
    <div className="grid h-[680px] place-items-center rounded-lg border border-white/10 bg-black/20 text-sm text-muted">
      Loading cognitive map...
    </div>
  );
}
