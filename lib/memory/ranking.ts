import { cosineSimilarity } from "./embeddings";
import { Memory, RankedMemory } from "./types";

const EMOTIONAL_SIGNALS = [
  "anxious",
  "anxiety",
  "burnout",
  "burnout-risk",
  "blocked",
  "confused",
  "deadline",
  "fatigue",
  "overwhelmed",
  "pressure",
  "scattered",
  "stress",
  "stressed",
  "tired",
  "time-pressure"
];

const PRODUCTIVITY_SIGNALS = ["focus", "productive", "momentum", "deep", "coding", "architecture", "late-night-focus"];

export function rankMemories(query: string, queryEmbedding: number[], memories: Memory[], limit = 8): RankedMemory[] {
  const now = Date.now();

  return memories
    .map((memory) => {
      const components = {
        semantic: normalizeSimilarity(cosineSimilarity(queryEmbedding, memory.embedding)),
        recency: scoreRecency(memory.timestamp, now),
        importance: clamp(memory.importance / 10),
        recurrence: scoreRecurrence(memory, memories),
        emotional: scoreEmotionalWeight(memory, query),
        relationship: scoreRelationshipDensity(memory, memories)
      };

      const score =
        components.semantic * 0.42 +
        components.recency * 0.16 +
        components.importance * 0.16 +
        components.recurrence * 0.12 +
        components.emotional * 0.09 +
        components.relationship * 0.05;

      return { memory, score, components };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function scoreRecency(timestamp: string, now = Date.now()) {
  const ageHours = Math.max(0, (now - new Date(timestamp).getTime()) / 36e5);
  const halfLifeHours = 72;
  return clamp(Math.exp((-Math.LN2 * ageHours) / halfLifeHours));
}

export function scoreRecurrence(memory: Memory, memories: Memory[]) {
  const signals = new Set(memory.metadata.signals);
  const keywords = getMemoryKeywords(memory).slice(0, 8);

  const matches = memories.filter((candidate) => {
    if (candidate.id === memory.id) return false;

    const sharedSignals = candidate.metadata.signals.some((signal) => signals.has(signal));
    const candidateKeywords = new Set(getMemoryKeywords(candidate));
    const sharedKeywords = keywords.filter((keyword) => candidateKeywords.has(keyword)).length;
    const sameCategory = candidate.category === memory.category;

    return sharedSignals || sharedKeywords >= 2 || (sameCategory && sharedKeywords >= 1);
  }).length;

  return clamp(matches / 5);
}

export function scoreEmotionalWeight(memory: Memory, query = "") {
  const haystack = `${memory.content} ${memory.summary} ${memory.metadata.signals.join(" ")} ${query}`.toLowerCase();
  const emotionalHits = EMOTIONAL_SIGNALS.filter((signal) => haystack.includes(signal)).length;
  const productivityHits = PRODUCTIVITY_SIGNALS.filter((signal) => haystack.includes(signal)).length;
  const categoryBoost = memory.category === "emotional_state" ? 0.35 : 0;
  const pressureBoost = memory.metadata.signals.includes("time-pressure") ? 0.2 : 0;

  return clamp(categoryBoost + pressureBoost + emotionalHits * 0.12 + productivityHits * 0.04);
}

export function getMemoryKeywords(memory: Memory) {
  return tokenize(`${memory.content} ${memory.summary}`).filter((token) => token.length > 3);
}

export function tokenize(input: string) {
  const stopWords = new Set([
    "about",
    "after",
    "also",
    "because",
    "before",
    "better",
    "from",
    "have",
    "into",
    "that",
    "their",
    "this",
    "with",
    "work",
    "working",
    "would",
    "your"
  ]);

  return Array.from(new Set(input.toLowerCase().match(/[a-z0-9']+/g) ?? [])).filter((token) => !stopWords.has(token));
}

function scoreRelationshipDensity(memory: Memory, memories: Memory[]) {
  const outgoing = memory.relationships.filter((relationship) => relationship.targetId).length;
  const incoming = memories.filter((candidate) =>
    candidate.relationships.some((relationship) => relationship.targetId === memory.id)
  ).length;

  return clamp((outgoing + incoming) / 6);
}

function normalizeSimilarity(value: number) {
  return clamp(value);
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}
