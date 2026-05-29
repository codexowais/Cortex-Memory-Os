import { scoreEmotionalWeight, scoreRecurrence } from "./ranking";
import { Memory, ReflectionReport } from "./types";

export function generateReflection(memories: Memory[]): ReflectionReport {
  const usefulMemories = memories.filter(isUsefulMemory);
  const sorted = [...usefulMemories].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const recurring = sorted.filter((memory) => scoreRecurrence(memory, memories) >= 0.2 || memory.importance >= 8);

  const habits = unique(
    [
      hasSignal(usefulMemories, "late-night-focus") ? "You consistently describe late-night coding as a stronger focus window." : "",
      hasSignal(usefulMemories, "recurring-pattern") ? "Repeated routines are becoming stable enough for Cortex to plan around." : "",
      categoryCount(usefulMemories, "routine") > 0 ? summarizeTop(usefulMemories, "routine") : ""
    ].filter(Boolean)
  );

  const productivityPatterns = unique(
    [
      hasSignal(usefulMemories, "architecture-focus") ? "Architecture and memory-system work appear to create momentum for you." : "",
      hasSignal(usefulMemories, "focus-momentum") ? "Planning before execution tends to show up near productive blocks." : "",
      hasSignal(usefulMemories, "debugging-overload") ? "Long debugging stretches can become cognitively expensive." : "",
      categoryCount(usefulMemories, "productivity_pattern") > 0 ? summarizeTop(usefulMemories, "productivity_pattern") : ""
    ].filter(Boolean)
  );

  const emotionalTrends = unique(
    [
      hasSignal(usefulMemories, "demo-pressure") || hasSignal(usefulMemories, "time-pressure")
        ? "Hackathon and demo deadlines increase pressure signals."
        : "",
      hasSignal(usefulMemories, "burnout-risk") || hasSignal(usefulMemories, "stress-signal")
        ? "Stress and fatigue should be treated as planning context, not background noise."
        : "",
      inferEmotionalBaseline(usefulMemories)
    ].filter(Boolean)
  );

  const recurringGoals = unique(
    recurring
      .filter((memory) => memory.category === "goal" || memory.category === "project" || memory.category === "task")
      .slice(0, 5)
      .map((memory) => memory.summary)
  );

  const behavioralShifts = inferBehavioralShifts(sorted);
  const learned = unique([
    ...habits.slice(0, 2),
    ...productivityPatterns.slice(0, 2),
    ...emotionalTrends.slice(0, 2),
    ...recurringGoals.slice(0, 2)
  ]).slice(0, 7);

  return {
    headline: "Cortex has learned the most from your repeated timing, pressure, and unfinished-intention patterns.",
    learned: learned.length ? learned : ["I am still forming a model of your habits, goals, and recurring context."],
    habits,
    productivityPatterns,
    emotionalTrends,
    recurringGoals,
    behavioralShifts
  };
}

function isUsefulMemory(memory: Memory) {
  return !/^what should i|^what have you learned|^what do you know|^hi\b|^hello\b/i.test(memory.content.trim());
}

function hasSignal(memories: Memory[], signal: string) {
  return memories.some((memory) => memory.metadata.signals.includes(signal));
}

function categoryCount(memories: Memory[], category: Memory["category"]) {
  return memories.filter((memory) => memory.category === category).length;
}

function summarizeTop(memories: Memory[], category: Memory["category"]) {
  const top = memories
    .filter((memory) => memory.category === category)
    .sort((a, b) => b.importance - a.importance)[0];

  return top?.summary ?? "";
}

function inferEmotionalBaseline(memories: Memory[]) {
  const emotional = memories.reduce((sum, memory) => sum + scoreEmotionalWeight(memory), 0) / Math.max(memories.length, 1);

  if (emotional >= 0.42) return "Your recent cognitive load reads as ambitious but strained.";
  if (emotional >= 0.25) return "There is moderate pressure in the background of your work.";

  return "Your emotional signal is mostly steady so far.";
}

function inferBehavioralShifts(memories: Memory[]) {
  if (memories.length < 4) return ["Not enough timeline depth yet to detect a behavioral shift."];

  const midpoint = Math.ceil(memories.length / 2);
  const recent = memories.slice(0, midpoint);
  const earlier = memories.slice(midpoint);
  const shifts = [
    signalRose("demo-pressure", recent, earlier) ? "The recent context has shifted more toward demo pressure." : "",
    signalRose("architecture-focus", recent, earlier) ? "Recent work is clustering around architecture decisions." : "",
    signalRose("unfinished-loop", recent, earlier) ? "More unfinished intentions are accumulating and need resurfacing." : "",
    signalRose("stress-signal", recent, earlier) ? "Stress language is becoming more frequent than earlier context." : ""
  ].filter(Boolean);

  return shifts.length ? shifts : ["No major behavioral shift yet; the strongest patterns are still stable."];
}

function signalRose(signal: string, recent: Memory[], earlier: Memory[]) {
  const recentRate = recent.filter((memory) => memory.metadata.signals.includes(signal)).length / Math.max(recent.length, 1);
  const earlierRate = earlier.filter((memory) => memory.metadata.signals.includes(signal)).length / Math.max(earlier.length, 1);

  return recentRate > earlierRate + 0.18;
}

function unique(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}
