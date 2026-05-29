import { scoreEmotionalWeight } from "./ranking";
import { isNextStepPrompt, isStuckPrompt } from "./open-loops";
import { OpenLoopCandidate, RankedMemory, ResurfacedMemory } from "./types";

const EMOTIONAL_TRIGGER = /stress|stressed|anxious|pressure|overwhelmed|tired|burnout|scattered/i;

export function findContextualResurfacings(
  input: string,
  rankedMemories: RankedMemory[],
  openLoops: OpenLoopCandidate[],
  limit = 2
): ResurfacedMemory[] {
  const rankedScores = new Map(rankedMemories.map((item) => [item.memory.id, item]));
  const trigger = inferTrigger(input);

  if (!trigger) return [];

  return openLoops
    .map((candidate) => {
      const ranked = rankedScores.get(candidate.memory.id);
      const semantic = ranked?.components.semantic ?? 0;
      const emotional = Math.max(scoreEmotionalWeight(candidate.memory), scoreEmotionalWeight(candidate.memory, input));
      const contextual = ranked ? ranked.score : candidate.reasons.includes("related to the current context") ? 0.62 : 0;
      const usefulness = trigger === "next_step" || trigger === "stuck" ? candidate.score : Math.max(candidate.score, emotional);

      const score = usefulness * 0.42 + semantic * 0.22 + contextual * 0.2 + emotional * 0.16;

      return {
        memory: candidate.memory,
        score: Number(score.toFixed(3)),
        trigger,
        reason: buildReason(candidate.reasons, trigger)
      };
    })
    .filter((item) => {
      const ranked = rankedScores.get(item.memory.id);

      if (item.trigger === "emotional") return item.score >= 0.42 && scoreEmotionalWeight(item.memory, input) >= 0.24;
      if (item.trigger === "semantic") return item.score >= 0.5 && (ranked?.components.semantic ?? 0) >= 0.45;

      return item.score >= 0.48;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function inferTrigger(input: string): ResurfacedMemory["trigger"] | null {
  if (isNextStepPrompt(input)) return "next_step";
  if (isStuckPrompt(input)) return "stuck";
  if (EMOTIONAL_TRIGGER.test(input)) return "emotional";
  return "semantic";
}

function buildReason(reasons: string[], trigger: ResurfacedMemory["trigger"]) {
  if (trigger === "next_step") return "You asked what to work on, and this is an active remembered intention.";
  if (trigger === "stuck") return "This may reduce ambiguity because it is an unfinished thread Cortex already knows about.";
  if (trigger === "emotional") return "This open loop may be contributing to the current emotional texture.";

  return reasons[0] ?? "This memory is contextually close enough to resurface.";
}
