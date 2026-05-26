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
  type: "supports" | "relates_to" | "contradicts" | "follows_up" | "recurs_with";
  targetId?: string;
  hint: string;
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
};

export type MemoryGraph = {
  nodes: Array<{
    id: string;
    label: string;
    category: MemoryCategory;
    importance: number;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label: string;
  }>;
};
