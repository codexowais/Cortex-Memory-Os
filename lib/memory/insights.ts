import { Memory, MemoryGraph, ProactiveInsight } from "./types";

export function detectPatterns(memories: Memory[]): ProactiveInsight[] {
  const insights: ProactiveInsight[] = [];
  const bySignal = new Map<string, Memory[]>();

  memories.forEach((memory) => {
    memory.metadata.signals.forEach((signal) => {
      bySignal.set(signal, [...(bySignal.get(signal) ?? []), memory]);
    });
  });

  const lateNight = bySignal.get("late-night-focus") ?? [];
  if (lateNight.length) {
    insights.push({
      id: "late-night-focus",
      title: "Deep focus window detected",
      body: "You tend to associate late-night hours with stronger coding focus. Architecture or complex planning may fit that window better than admin work.",
      confidence: 0.86,
      category: "productivity_pattern",
      memoryIds: lateNight.map((memory) => memory.id)
    });
  }

  const burnout = bySignal.get("burnout-risk") ?? [];
  if (burnout.length >= 1) {
    insights.push({
      id: "burnout-risk",
      title: "Energy debt is showing up",
      body: "Recent memories include fatigue language. Consider reducing context switching and making the next work block smaller.",
      confidence: 0.74,
      category: "emotional_state",
      memoryIds: burnout.map((memory) => memory.id)
    });
  }

  const loops = memories.filter((memory) => memory.category === "task" && memory.importance >= 7);
  if (loops.length) {
    insights.push({
      id: "unfinished-loops",
      title: "Open loops need closure",
      body: `You have ${loops.length} remembered task${loops.length > 1 ? "s" : ""} with high importance. The system should resurface one before your next planning session.`,
      confidence: 0.8,
      category: "task",
      memoryIds: loops.map((memory) => memory.id)
    });
  }

  return insights;
}

export function createDailySummary(memories: Memory[]) {
  const important = memories.slice(0, 8);
  const goals = important.filter((memory) => memory.category === "goal").length;
  const tasks = important.filter((memory) => memory.category === "task").length;
  const emotional = important.filter((memory) => memory.category === "emotional_state").length;

  return {
    headline: "Today your memory layer is tracking continuity, focus windows, and open loops.",
    stats: { goals, tasks, emotional, total: memories.length },
    bullets: important.slice(0, 4).map((memory) => memory.summary)
  };
}

export function createMemoryGraph(memories: Memory[]): MemoryGraph {
  const nodes = memories.slice(0, 24).map((memory) => ({
    id: memory.id,
    label: memory.summary,
    category: memory.category,
    importance: memory.importance
  }));

  const edges = memories.flatMap((memory) =>
    memory.relationships
      .filter((relationship) => relationship.targetId)
      .map((relationship, index) => ({
        id: `${memory.id}-${relationship.targetId}-${index}`,
        source: memory.id,
        target: relationship.targetId as string,
        label: relationship.type
      }))
  );

  if (!edges.length && nodes.length > 1) {
    return {
      nodes,
      edges: nodes.slice(1, 8).map((node, index) => ({
        id: `inferred-${index}`,
        source: nodes[0].id,
        target: node.id,
        label: "context"
      }))
    };
  }

  return { nodes, edges };
}
