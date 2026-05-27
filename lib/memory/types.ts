export const memoryCategories = [
  "goal",
  "preference",
  "routine",
  "project",
  "task",
  "emotional_state",
  "productivity_pattern"
] as const;

export type MemoryCategory = (typeof memoryCategories)[number];

export type MemoryRelationship = {
  type:
    | "related_to"
    | "caused_by"
    | "part_of"
    | "emotionally_linked"
    | "supports"
    | "relates_to"
    | "contradicts"
    | "follows_up"
    | "recurs_with";
  targetId?: string;
  hint: string;
  strength?: number;
};

export type Memory = {
  id: string;
  userId: string;
  content: string;
  summary: string;
  category: MemoryCategory;
  importance: number;
  timestamp: string;
  embedding: number[];
  relationships: MemoryRelationship[];
  metadata: {
    source: "conversation" | "system";
    signals: string[];
    lastReferencedAt?: string;
  };
};

export type RankedMemory = {
  memory: Memory;
  score: number;
  components: {
    semantic: number;
    recency: number;
    importance: number;
    recurrence: number;
    emotional: number;
    relationship: number;
  };
};

export type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

export type ProactiveInsight = {
  id: string;
  title: string;
  body: string;
  confidence: number;
  category: MemoryCategory;
  memoryIds: string[];
  priority?: number;
  suggestedAction?: string;
};

export type MemoryGraph = {
  nodes: Array<{
    id: string;
    label: string;
    category: MemoryCategory;
    importance: number;
    cluster: string;
    emotionalWeight: number;
    recurrence: number;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label: string;
    type: MemoryRelationship["type"] | "context";
    strength: number;
  }>;
};

export type DailyCognitiveSummary = {
  headline: string;
  mainFocus: string;
  peakProductivity: string;
  recurringConcern: string;
  emotionalTrend: string;
  suggestedAction: string;
  stats: { goals: number; tasks: number; emotional: number; total: number };
  bullets: string[];
};
