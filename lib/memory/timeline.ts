import { scoreEmotionalWeight } from "./ranking";
import { Memory, MemoryTimelineDay } from "./types";

export function createMemoryTimeline(memories: Memory[]): MemoryTimelineDay[] {
  const byDay = groupByDay(memories);

  return Array.from(byDay.entries())
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([date, dayMemories]) => {
      const sorted = [...dayMemories].sort((a, b) => b.importance - a.importance);

      return {
        date,
        label: formatDayLabel(date),
        theme: inferTheme(sorted),
        emotionalTrend: inferEmotionalTrend(sorted),
        milestones: inferMilestones(sorted),
        memories: sorted.slice(0, 5).map((memory) => ({
          id: memory.id,
          summary: memory.summary,
          category: memory.category,
          importance: memory.importance
        }))
      };
    });
}

function groupByDay(memories: Memory[]) {
  return memories.reduce<Map<string, Memory[]>>((groups, memory) => {
    const date = new Date(memory.timestamp).toISOString().slice(0, 10);
    groups.set(date, [...(groups.get(date) ?? []), memory]);
    return groups;
  }, new Map());
}

function formatDayLabel(date: string) {
  return new Intl.DateTimeFormat("en", { weekday: "long", month: "short", day: "numeric" }).format(new Date(date));
}

function inferTheme(memories: Memory[]) {
  const text = memories.map((memory) => `${memory.content} ${memory.metadata.signals.join(" ")}`).join(" ");

  if (/cortex|memory|retrieval|architecture|relationship/i.test(text)) return "Cortex architecture and memory quality";
  if (/demo|hackathon|pitch/i.test(text)) return "Hackathon demo preparation";
  if (/stress|tired|burnout|overwhelmed/i.test(text)) return "Energy management and pressure";
  if (/finish|todo|need to|task/i.test(text)) return "Open-loop planning";

  return memories[0]?.summary ?? "New cognitive context";
}

function inferEmotionalTrend(memories: Memory[]) {
  const average = memories.reduce((sum, memory) => sum + scoreEmotionalWeight(memory), 0) / Math.max(memories.length, 1);
  const hasMomentum = memories.some((memory) => memory.metadata.signals.includes("focus-momentum"));

  if (average >= 0.42 && hasMomentum) return "pressured but moving";
  if (average >= 0.42) return "strained";
  if (hasMomentum) return "focused";

  return "steady";
}

function inferMilestones(memories: Memory[]) {
  const milestones = memories
    .filter(
      (memory) =>
        memory.importance >= 8 ||
        memory.category === "project" ||
        memory.category === "goal" ||
        memory.metadata.signals.includes("architecture-focus") ||
        memory.metadata.signals.includes("demo-pressure")
    )
    .slice(0, 3)
    .map((memory) => memory.summary);

  return milestones.length ? milestones : memories.slice(0, 2).map((memory) => memory.summary);
}
