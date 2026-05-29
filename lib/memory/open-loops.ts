import { cosineSimilarity } from "./embeddings";
import { getMemoryKeywords, scoreEmotionalWeight, scoreRecency, tokenize } from "./ranking";
import { Memory, OpenLoopCandidate, OpenLoopState, RankedMemory, ResurfacedMemory } from "./types";

const OPEN_LOOP_CATEGORIES = new Set(["task", "goal", "project"]);
const UNFINISHED_PATTERNS = /need to|todo|finish|complete|ship|build|fix|prepare|follow up|decide|remind|before|deadline|should|must/i;
const RESOLVED_PATTERNS = /done|finished|completed|resolved|shipped|closed|handled|decided|no longer need/i;
const NEXT_STEP_PATTERNS = /what should i|next step|work on|prioriti[sz]e|where should i start|what now|plan/i;
const STUCK_PATTERNS = /stuck|blocked|confused|scattered|overwhelmed|not sure|lost|can't decide|cannot decide/i;

export function isOpenLoopMemory(memory: Memory) {
  return OPEN_LOOP_CATEGORIES.has(memory.category) || memory.metadata.signals.includes("unfinished-loop");
}

export function detectOpenLoops(memories: Memory[]) {
  return normalizeOpenLoopMemories(memories).filter(
    (memory) => memory.metadata.openLoop?.status === "active" && hasOpenLoopIntent(memory)
  );
}

export function initializeOpenLoopState(memory: Memory, timestamp = memory.timestamp): Memory {
  if (!isOpenLoopMemory(memory)) return memory;

  const status = inferOpenLoopStatus(memory);
  const existing = memory.metadata.openLoop;

  return {
    ...memory,
    metadata: {
      ...memory.metadata,
      signals:
        memory.metadata.signals.includes("unfinished-loop") || !hasUnfinishedIntent(memory)
          ? memory.metadata.signals
          : [...memory.metadata.signals, "unfinished-loop"],
      openLoop: {
        status,
        resurfacedCount: existing?.resurfacedCount ?? 0,
        lastMentionedAt: existing?.lastMentionedAt ?? timestamp,
        lastResurfacedAt: existing?.lastResurfacedAt,
        openLoopScore: existing?.openLoopScore ?? Number((memory.importance / 10).toFixed(2))
      }
    }
  };
}

export function updateOpenLoopState(memory: Memory, input = memory.content, timestamp = new Date().toISOString()): Memory {
  const initialized = initializeOpenLoopState(memory, memory.metadata.openLoop?.lastMentionedAt ?? memory.timestamp);
  if (!initialized.metadata.openLoop) return initialized;

  const status = RESOLVED_PATTERNS.test(input) ? "resolved" : inferOpenLoopStatusFromText(`${input} ${initialized.content} ${initialized.summary}`);
  const mentionsLoop = inputMentionsMemory(input, initialized) || input === initialized.content;

  return {
    ...initialized,
    metadata: {
      ...initialized.metadata,
      signals:
        status === "active" && hasUnfinishedIntent(initialized) && !initialized.metadata.signals.includes("unfinished-loop")
          ? [...initialized.metadata.signals, "unfinished-loop"]
          : initialized.metadata.signals,
      openLoop: {
        ...initialized.metadata.openLoop,
        status,
        lastMentionedAt: mentionsLoop ? timestamp : initialized.metadata.openLoop.lastMentionedAt,
        openLoopScore: initialized.metadata.openLoop.openLoopScore
      }
    }
  };
}

export function normalizeOpenLoopMemories(memories: Memory[]) {
  return memories.map((memory) => updateOpenLoopState(memory, memory.content, memory.metadata.openLoop?.lastMentionedAt ?? memory.timestamp));
}

export function findOpenLoops(
  memories: Memory[],
  options: {
    currentInput?: string;
    rankedMemories?: RankedMemory[];
    limit?: number;
    now?: number;
  } = {}
): OpenLoopCandidate[] {
  const input = options.currentInput ?? "";
  const rankedIds = new Set((options.rankedMemories ?? []).map((item) => item.memory.id));
  const relatedIds = collectRelatedIds(memories, rankedIds);

  return normalizeOpenLoopMemories(memories)
    .filter((memory) => memory.metadata.openLoop?.status !== "resolved" && hasOpenLoopIntent(memory))
    .map((memory) => {
      const scoreParts = scoreOpenLoop(memory, memories, {
        input,
        now: options.now,
        isRanked: rankedIds.has(memory.id),
        isRelated: relatedIds.has(memory.id)
      });

      const score = Number(scoreParts.score.toFixed(3));
      const urgency: OpenLoopCandidate["urgency"] = score >= 0.72 ? "high" : score >= 0.48 ? "medium" : "low";

      return {
        memory: setOpenLoopScore(memory, score),
        score,
        reasons: scoreParts.reasons,
        urgency
      };
    })
    .filter((candidate) => candidate.score >= 0.32)
    .sort((a, b) => b.score - a.score)
    .slice(0, options.limit ?? 5);
}

export function resurfaceOpenLoops(
  input: string,
  memories: Memory[],
  rankedMemories: RankedMemory[] = [],
  limit = 2
): ResurfacedMemory[] {
  const rankedScores = new Map(rankedMemories.map((item) => [item.memory.id, item]));
  const trigger: ResurfacedMemory["trigger"] = isNextStepPrompt(input)
    ? "next_step"
    : isStuckPrompt(input)
      ? "stuck"
      : scoreEmotionalWeightForInput(input)
        ? "emotional"
        : "semantic";

  return findOpenLoops(memories, { currentInput: input, rankedMemories, limit: limit * 3 })
    .map((candidate) => {
      const ranked = rankedScores.get(candidate.memory.id);
      const semantic = ranked?.components.semantic ?? 0;
      const emotional = Math.max(scoreEmotionalWeight(candidate.memory), scoreEmotionalWeight(candidate.memory, input));
      const contextual = ranked ? ranked.score : candidate.reasons.includes("related to the current context") ? 0.62 : 0;
      const score = candidate.score * 0.46 + semantic * 0.2 + contextual * 0.2 + emotional * 0.14;

      return {
        memory: candidate.memory,
        score: Number(score.toFixed(3)),
        trigger,
        reason: resurfaceReason(candidate, trigger)
      };
    })
    .filter((item) => item.score >= (item.trigger === "semantic" ? 0.5 : 0.44))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function shouldAnswerWithReflection(input: string) {
  return /what have you learned about me|what do you know about me|reflect on me|patterns about me/i.test(input);
}

export function isNextStepPrompt(input: string) {
  return NEXT_STEP_PATTERNS.test(input);
}

export function isStuckPrompt(input: string) {
  return STUCK_PATTERNS.test(input);
}

export function markOpenLoopsResurfaced(memories: Memory[], resurfacedIds: string[], timestamp = new Date().toISOString()) {
  const ids = new Set(resurfacedIds);

  return memories.map((memory) => {
    if (!ids.has(memory.id) || !memory.metadata.openLoop) return memory;

    return {
      ...memory,
      metadata: {
        ...memory.metadata,
        openLoop: {
          ...memory.metadata.openLoop,
          resurfacedCount: memory.metadata.openLoop.resurfacedCount + 1,
          lastResurfacedAt: timestamp
        }
      }
    };
  });
}

function scoreOpenLoop(
  memory: Memory,
  memories: Memory[],
  options: { input: string; now?: number; isRanked: boolean; isRelated: boolean }
) {
  const openLoop = memory.metadata.openLoop ?? createOpenLoopState(memory);
  const notMentionedRecently = 1 - scoreRecency(openLoop.lastMentionedAt, options.now);
  const importance = memory.importance / 10;
  const unfinished = scoreUnfinished(memory);
  const prompt = scorePromptNeed(options.input);
  const context = options.isRanked ? 1 : options.isRelated ? 0.72 : scoreKeywordOverlap(options.input, memory);
  const emotion = Math.max(scoreEmotionalWeight(memory), scoreEmotionalWeight(memory, options.input));
  const actionability = scoreActionability(memory, options.input);
  const broadGoalPenalty = isNextStepPrompt(options.input) && memory.category === "goal" ? 0.12 : 0;
  const recurrence = Math.min(
    memories.filter((candidate) => candidate.id !== memory.id && hasSharedOpenLoopContext(memory, candidate)).length / 4,
    1
  );
  const fatigue = Math.min(openLoop.resurfacedCount * 0.08, 0.24);

  const score = clamp(
    importance * 0.24 +
      notMentionedRecently * 0.2 +
      unfinished * 0.2 +
      prompt * 0.14 +
      context * 0.12 +
      actionability * 0.08 +
      emotion * 0.04 +
      recurrence * 0.04 -
      broadGoalPenalty -
      fatigue
  );

  const reasons = [
    importance >= 0.8 ? "high importance" : "",
    notMentionedRecently >= 0.45 ? "not revisited recently" : "",
    unfinished >= 0.7 ? "still reads as unfinished" : "",
    prompt >= 0.7 ? "matches a next-step or stuck prompt" : "",
    context >= 0.65 ? "related to the current context" : "",
    emotion >= 0.35 ? "emotionally relevant" : ""
  ].filter(Boolean);

  return { score, reasons };
}

function createOpenLoopState(memory: Memory): OpenLoopState {
  return {
    status: inferOpenLoopStatus(memory),
    resurfacedCount: 0,
    lastMentionedAt: memory.timestamp,
    openLoopScore: memory.importance / 10
  };
}

function inferOpenLoopStatus(memory: Memory): OpenLoopState["status"] {
  const text = `${memory.content} ${memory.summary}`.toLowerCase();
  return inferOpenLoopStatusFromText(text);
}

function inferOpenLoopStatusFromText(text: string): OpenLoopState["status"] {
  return RESOLVED_PATTERNS.test(text) && !UNFINISHED_PATTERNS.test(text) ? "resolved" : "active";
}

function scoreUnfinished(memory: Memory) {
  const text = `${memory.content} ${memory.summary} ${memory.metadata.signals.join(" ")}`;

  if (memory.metadata.signals.includes("unfinished-loop")) return 1;
  if (UNFINISHED_PATTERNS.test(text)) return 0.9;
  if (memory.category === "task") return 0.82;
  if (memory.category === "goal") return 0.62;
  if (memory.category === "project") return 0.28;

  return 0.2;
}

function hasOpenLoopIntent(memory: Memory) {
  if (/^what should i|^what have you learned|^what do you know|^hi\b|^hello\b/i.test(memory.content.trim())) {
    return false;
  }

  const tokenCount = tokenize(`${memory.content} ${memory.summary}`).length;
  if (tokenCount < 3 && memory.importance < 8) return false;

  if (memory.category === "task" || memory.category === "goal") return true;
  if (memory.metadata.signals.includes("unfinished-loop") && hasUnfinishedIntent(memory)) return true;
  if (memory.category !== "project") return false;

  const text = `${memory.content} ${memory.summary} ${memory.metadata.signals.join(" ")}`;
  return (
    hasUnfinishedIntent(memory) ||
    /architecture|demo|hackathon|project|cortex|build|ship|mvp|pitch/i.test(text) ||
    memory.importance >= 8
  );
}

function hasUnfinishedIntent(memory: Memory) {
  const text = `${memory.content} ${memory.summary}`;
  return UNFINISHED_PATTERNS.test(text);
}

function scorePromptNeed(input: string) {
  if (isNextStepPrompt(input)) return 1;
  if (isStuckPrompt(input)) return 0.9;
  if (/stress|stressed|anxious|pressure|overwhelmed/i.test(input)) return 0.55;
  return 0;
}

function scoreActionability(memory: Memory, input: string) {
  if (!isNextStepPrompt(input) && !isStuckPrompt(input)) return 0;
  if (memory.category === "task") return 1;
  if (memory.category === "goal") return 0.26;
  if (hasUnfinishedIntent(memory)) return 0.82;
  if (memory.category === "project") return 0.58;

  return 0;
}

function inputMentionsMemory(input: string, memory: Memory) {
  const inputTokens = new Set(tokenize(input));
  if (!inputTokens.size) return false;

  const shared = getMemoryKeywords(memory).filter((keyword) => inputTokens.has(keyword)).length;
  return shared >= 2;
}

function scoreEmotionalWeightForInput(input: string) {
  return /stress|stressed|anxious|pressure|overwhelmed|tired|burnout|scattered/i.test(input);
}

function resurfaceReason(candidate: OpenLoopCandidate, trigger: ResurfacedMemory["trigger"]) {
  if (trigger === "next_step") return "You asked what to work on, and this is an active remembered intention.";
  if (trigger === "stuck") return "This may reduce ambiguity because it is unfinished and already connected to your context.";
  if (trigger === "emotional") return "This open loop may be part of the pressure pattern around the current message.";

  return candidate.reasons[0] ?? "This remembered intention is contextually useful enough to bring back.";
}

function scoreKeywordOverlap(input: string, memory: Memory) {
  if (!input.trim()) return 0;

  const inputTokens = new Set(tokenize(input));
  const overlap = getMemoryKeywords(memory).filter((keyword) => inputTokens.has(keyword)).length;
  return clamp(overlap / 4);
}

function hasSharedOpenLoopContext(source: Memory, target: Memory) {
  const sourceKeywords = new Set(getMemoryKeywords(source));
  const sharedKeywords = getMemoryKeywords(target).filter((keyword) => sourceKeywords.has(keyword)).length;
  const sourceSignals = new Set(source.metadata.signals);
  const sharedSignals = target.metadata.signals.some((signal) => sourceSignals.has(signal));
  const semantic = cosineSimilarity(source.embedding, target.embedding);

  return sharedKeywords >= 2 || sharedSignals || semantic >= 0.62;
}

function collectRelatedIds(memories: Memory[], rankedIds: Set<string>) {
  const related = new Set<string>();

  memories.forEach((memory) => {
    const touchesRanked = memory.relationships.some((relationship) => relationship.targetId && rankedIds.has(relationship.targetId));
    if (touchesRanked) related.add(memory.id);

    if (rankedIds.has(memory.id)) {
      memory.relationships.forEach((relationship) => {
        if (relationship.targetId) related.add(relationship.targetId);
      });
    }
  });

  return related;
}

function setOpenLoopScore(memory: Memory, score: number): Memory {
  return {
    ...memory,
    metadata: {
      ...memory.metadata,
      openLoop: {
        ...(memory.metadata.openLoop ?? createOpenLoopState(memory)),
        openLoopScore: score
      }
    }
  };
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}
