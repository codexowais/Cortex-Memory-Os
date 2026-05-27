import { normalizeRelationshipType } from "./relationships";
import { scoreEmotionalWeight, scoreRecency, scoreRecurrence } from "./ranking";
import { DailyCognitiveSummary, Memory, MemoryCategory, MemoryGraph, ProactiveInsight } from "./types";

export function detectPatterns(memories: Memory[]): ProactiveInsight[] {
  const insights: ProactiveInsight[] = [];
  const bySignal = groupBySignal(memories);

  const lateNight = bySignal.get("late-night-focus") ?? [];
  if (lateNight.length) {
    insights.push({
      id: "late-night-focus",
      title: "Deep focus window detected",
      body: "You tend to associate late-night hours with stronger coding focus. Save architecture, retrieval, and hard reasoning for that window when possible.",
      confidence: confidenceFrom(lateNight.length, 0.78),
      priority: 0.72,
      category: "productivity_pattern",
      memoryIds: lateNight.map((memory) => memory.id),
      suggestedAction: "Queue one deep task for your next late-night block."
    });
  }

  const burnout = [...(bySignal.get("burnout-risk") ?? []), ...(bySignal.get("stress-signal") ?? [])];
  if (burnout.length) {
    insights.push({
      id: "burnout-risk",
      title: "Energy debt is showing up",
      body: "Recent memory contains fatigue or pressure language. The pattern does not say stop; it says reduce the size of the next work block.",
      confidence: confidenceFrom(burnout.length, 0.7),
      priority: 0.9,
      category: "emotional_state",
      memoryIds: uniqueIds(burnout),
      suggestedAction: "Pick a 25-minute recovery-sized task before another debugging stretch."
    });
  }

  const loops = memories.filter(
    (memory) =>
      memory.category === "task" ||
      memory.metadata.signals.includes("unfinished-loop") ||
      /need to|todo|finish|remind|before the demo/i.test(memory.content)
  );
  if (loops.length) {
    insights.push({
      id: "unfinished-loops",
      title: "Open loop wants attention",
      body: `There ${
        loops.length === 1 ? "is one remembered task" : `are ${loops.length} remembered tasks`
      } with enough weight to resurface before planning continues.`,
      confidence: confidenceFrom(loops.length, 0.74),
      priority: 0.84,
      category: "task",
      memoryIds: loops.map((memory) => memory.id),
      suggestedAction: `Close or explicitly defer: "${loops[0].summary}"`
    });
  }

  const recurringEmotion = memories.filter(
    (memory) => scoreEmotionalWeight(memory) >= 0.35 && scoreRecurrence(memory, memories) >= 0.2
  );
  if (recurringEmotion.length >= 2) {
    insights.push({
      id: "recurring-emotional-pattern",
      title: "Recurring emotional pattern",
      body: "The same emotional texture is appearing across multiple memories. Cortex should treat it as context, not as a one-off mood.",
      confidence: confidenceFrom(recurringEmotion.length, 0.68),
      priority: 0.82,
      category: "emotional_state",
      memoryIds: recurringEmotion.map((memory) => memory.id),
      suggestedAction: "When planning the next block, account for energy state before scope."
    });
  }

  const architecture = [...(bySignal.get("architecture-focus") ?? []), ...(bySignal.get("demo-pressure") ?? [])];
  if (architecture.length >= 2) {
    insights.push({
      id: "demo-architecture-thread",
      title: "Demo-critical architecture thread",
      body: "Cortex keeps returning to architecture, retrieval quality, and demo impact. That looks like the main cognitive thread for this sprint.",
      confidence: confidenceFrom(architecture.length, 0.76),
      priority: 0.78,
      category: "project",
      memoryIds: uniqueIds(architecture),
      suggestedAction: "Protect retrieval, relationships, and insights before adding new surfaces."
    });
  }

  return insights.sort((a, b) => (b.priority ?? b.confidence) - (a.priority ?? a.confidence)).slice(0, 5);
}

export function createDailySummary(memories: Memory[]): DailyCognitiveSummary {
  const sorted = [...memories].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const important = sorted.slice(0, 12);
  const goals = important.filter((memory) => memory.category === "goal").length;
  const tasks = important.filter((memory) => memory.category === "task").length;
  const emotional = important.filter((memory) => memory.category === "emotional_state").length;
  const focus = inferMainFocus(important);
  const emotionalTrend = inferEmotionalTrend(important);

  return {
    headline: `Today Cortex is tracking ${focus.toLowerCase()}, open loops, and emotional load as connected context.`,
    mainFocus: focus,
    peakProductivity: inferPeakProductivity(important),
    recurringConcern: inferRecurringConcern(important),
    emotionalTrend,
    suggestedAction: inferSuggestedAction(important, emotionalTrend),
    stats: { goals, tasks, emotional, total: memories.length },
    bullets: important.slice(0, 4).map((memory) => memory.summary)
  };
}

export function createMemoryGraph(memories: Memory[]): MemoryGraph {
  const visible = memories
    .map((memory) => ({
      memory,
      weight:
        memory.importance / 10 +
        scoreRecency(memory.timestamp) * 0.35 +
        scoreRecurrence(memory, memories) * 0.25 +
        scoreEmotionalWeight(memory) * 0.25
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 28)
    .map((item) => item.memory);

  const visibleIds = new Set(visible.map((memory) => memory.id));
  const nodes = visible.map((memory) => ({
    id: memory.id,
    label: memory.summary,
    category: memory.category,
    importance: memory.importance,
    cluster: inferCluster(memory),
    emotionalWeight: scoreEmotionalWeight(memory),
    recurrence: scoreRecurrence(memory, memories)
  }));

  const explicitEdges = visible.flatMap((memory) =>
    memory.relationships
      .filter((relationship) => relationship.targetId && visibleIds.has(relationship.targetId))
      .map((relationship, index) => {
        const type = normalizeRelationshipType(relationship.type);

        return {
          id: `${memory.id}-${relationship.targetId}-${index}`,
          source: memory.id,
          target: relationship.targetId as string,
          label: labelForRelationship(type),
          type,
          strength: relationship.strength ?? 0.62
        };
      })
  );

  const edges =
    explicitEdges.length > 0
      ? explicitEdges
      : inferFallbackEdges(visible).map((edge, index) => ({
          ...edge,
          id: `inferred-${index}`,
          label: "context",
          type: "context" as const,
          strength: 0.42
        }));

  return { nodes, edges };
}

function groupBySignal(memories: Memory[]) {
  const bySignal = new Map<string, Memory[]>();

  memories.forEach((memory) => {
    memory.metadata.signals.forEach((signal) => {
      bySignal.set(signal, [...(bySignal.get(signal) ?? []), memory]);
    });
  });

  return bySignal;
}

function inferMainFocus(memories: Memory[]) {
  const allText = memories.map((memory) => `${memory.content} ${memory.metadata.signals.join(" ")}`).join(" ");

  if (/retrieval|relationship|memory|architecture|cortex/i.test(allText)) return "Cortex architecture";
  if (/demo|hackathon/i.test(allText)) return "Hackathon demo polish";
  if (/debug|bug|broken/i.test(allText)) return "Debugging and stabilization";

  return topCategory(memories);
}

function inferPeakProductivity(memories: Memory[]) {
  const lateNight = memories.filter((memory) => memory.metadata.signals.includes("late-night-focus"));
  if (lateNight.length) return "late-night coding";

  const momentum = memories.filter((memory) => memory.metadata.signals.includes("focus-momentum"));
  if (momentum.length) return "focused planning blocks";

  return "not enough pattern data yet";
}

function inferRecurringConcern(memories: Memory[]) {
  const signalCounts = groupBySignal(memories);
  const ordered = Array.from(signalCounts.entries()).sort((a, b) => b[1].length - a[1].length);
  const signal = ordered[0]?.[0];

  if (signal === "architecture-focus") return "retrieval and memory architecture quality";
  if (signal === "time-pressure" || signal === "demo-pressure") return "demo deadline pressure";
  if (signal === "burnout-risk" || signal === "stress-signal") return "energy and stress management";
  if (signal === "unfinished-loop") return "unfinished tasks";

  return memories[0]?.summary ?? "no dominant concern yet";
}

function inferEmotionalTrend(memories: Memory[]) {
  const emotionalScore = memories.reduce((sum, memory) => sum + scoreEmotionalWeight(memory), 0) / Math.max(memories.length, 1);
  const hasMomentum = memories.some((memory) => memory.metadata.signals.includes("focus-momentum"));

  if (emotionalScore >= 0.45 && hasMomentum) return "ambitious but strained";
  if (emotionalScore >= 0.35) return "pressured and slightly overloaded";
  if (hasMomentum) return "focused and building momentum";

  return "steady, with limited emotional signal";
}

function inferSuggestedAction(memories: Memory[], emotionalTrend: string) {
  const unfinished = memories.find((memory) => memory.category === "task" || memory.metadata.signals.includes("unfinished-loop"));
  if (emotionalTrend.includes("strained") || emotionalTrend.includes("overloaded")) {
    return "reduce the next work block to one concrete decision or fix";
  }

  if (unfinished) return `resurface and close: ${unfinished.summary}`;

  return "keep reinforcing the strongest project thread before adding new scope";
}

function inferCluster(memory: Memory) {
  if (memory.metadata.signals.includes("architecture-focus")) return "Architecture";
  if (memory.metadata.signals.includes("burnout-risk") || memory.metadata.signals.includes("stress-signal")) return "Energy";
  if (memory.metadata.signals.includes("late-night-focus") || memory.metadata.signals.includes("focus-momentum")) return "Productivity";
  if (memory.metadata.signals.includes("unfinished-loop") || memory.category === "task") return "Open Loops";
  if (memory.metadata.signals.includes("demo-pressure")) return "Demo";

  return categoryLabel(memory.category);
}

function inferFallbackEdges(memories: Memory[]) {
  return memories.slice(1, 10).map((memory) => ({
    source: memories[0]?.id ?? memory.id,
    target: memory.id
  }));
}

function labelForRelationship(type: string) {
  return type.replaceAll("_", " ");
}

function categoryLabel(category: MemoryCategory) {
  return category
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function topCategory(memories: Memory[]) {
  const counts = memories.reduce<Record<string, number>>((acc, memory) => {
    acc[memory.category] = (acc[memory.category] ?? 0) + 1;
    return acc;
  }, {});

  const category = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as MemoryCategory | undefined;
  return category ? categoryLabel(category) : "new context formation";
}

function confidenceFrom(count: number, base: number) {
  return Math.min(0.96, base + Math.log10(count + 1) * 0.16);
}

function uniqueIds(memories: Memory[]) {
  return Array.from(new Set(memories.map((memory) => memory.id)));
}
