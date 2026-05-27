import { cosineSimilarity } from "./embeddings";
import { getMemoryKeywords, scoreEmotionalWeight } from "./ranking";
import { Memory, MemoryRelationship } from "./types";

export function linkMemories(newMemories: Memory[], existingMemories: Memory[]) {
  if (!newMemories.length || !existingMemories.length) return newMemories;

  return newMemories.map((memory) => {
    const candidates = existingMemories
      .map((candidate) => ({
        candidate,
        score: scoreRelationship(memory, candidate),
        type: inferRelationshipType(memory, candidate)
      }))
      .filter((candidate) => candidate.score >= 0.34)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const inferredRelationships: MemoryRelationship[] = candidates.map(({ candidate, score, type }) => ({
      type,
      targetId: candidate.id,
      strength: Number(score.toFixed(2)),
      hint: createRelationshipHint(memory, candidate, type)
    }));

    return {
      ...memory,
      relationships: dedupeRelationships([...inferredRelationships, ...memory.relationships])
    };
  });
}

export function scoreRelationship(source: Memory, target: Memory) {
  const semantic = cosineSimilarity(source.embedding, target.embedding);
  const sourceSignals = new Set(source.metadata.signals);
  const sharedSignals = target.metadata.signals.filter((signal) => sourceSignals.has(signal)).length;
  const sharedKeywords = countSharedKeywords(source, target);
  const sameCategory = source.category === target.category ? 1 : 0;
  const emotionalBridge = Math.min(scoreEmotionalWeight(source), scoreEmotionalWeight(target));
  const timeBridge = scoreTemporalBridge(source.timestamp, target.timestamp);

  return (
    Math.max(semantic, 0) * 0.38 +
    Math.min(sharedKeywords / 5, 1) * 0.22 +
    Math.min(sharedSignals / 3, 1) * 0.18 +
    sameCategory * 0.08 +
    emotionalBridge * 0.08 +
    timeBridge * 0.06
  );
}

export function inferRelationshipType(source: Memory, target: Memory): MemoryRelationship["type"] {
  const combined = `${source.content} ${source.summary}`.toLowerCase();
  const targetText = `${target.content} ${target.summary}`.toLowerCase();
  const sourceEmotion = scoreEmotionalWeight(source);
  const targetEmotion = scoreEmotionalWeight(target);

  if (sourceEmotion >= 0.35 && targetEmotion >= 0.25) return "emotionally_linked";

  if (
    combined.includes("because") ||
    combined.includes("caused") ||
    combined.includes("led to") ||
    combined.includes("due to") ||
    combined.includes("so i") ||
    targetText.includes("because")
  ) {
    return "caused_by";
  }

  if (
    source.category === "task" ||
    combined.includes("part of") ||
    combined.includes("for the") ||
    combined.includes("inside") ||
    target.category === "project" ||
    target.category === "goal"
  ) {
    return "part_of";
  }

  return "related_to";
}

export function normalizeRelationshipType(type: MemoryRelationship["type"]): MemoryRelationship["type"] {
  if (type === "relates_to" || type === "supports" || type === "recurs_with" || type === "follows_up") {
    return "related_to";
  }

  return type;
}

function countSharedKeywords(source: Memory, target: Memory) {
  const targetKeywords = new Set(getMemoryKeywords(target));
  return getMemoryKeywords(source).filter((keyword) => targetKeywords.has(keyword)).length;
}

function scoreTemporalBridge(sourceTimestamp: string, targetTimestamp: string) {
  const distanceHours = Math.abs(new Date(sourceTimestamp).getTime() - new Date(targetTimestamp).getTime()) / 36e5;
  return Math.exp((-Math.LN2 * distanceHours) / 48);
}

function createRelationshipHint(source: Memory, target: Memory, type: MemoryRelationship["type"]) {
  if (type === "emotionally_linked") {
    return `Shares emotional context with "${target.summary}".`;
  }

  if (type === "caused_by") {
    return `May explain or be explained by "${target.summary}".`;
  }

  if (type === "part_of") {
    return `Appears to belong inside the same work stream as "${target.summary}".`;
  }

  return `Semantically close to "${target.summary}".`;
}

function dedupeRelationships(relationships: MemoryRelationship[]) {
  const seen = new Set<string>();

  return relationships.filter((relationship) => {
    const key = `${relationship.type}:${relationship.targetId ?? relationship.hint}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
