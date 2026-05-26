import { promises as fs } from "fs";
import path from "path";
import { createEmbedding, cosineSimilarity } from "./embeddings";
import { Memory } from "./types";
import { fromMemoryRow, getSupabaseAdmin, toMemoryRow } from "@/lib/supabase/server";

const LOCAL_STORE = path.join(process.cwd(), ".cortex-memory.json");

export async function saveMemories(memories: Memory[]) {
  if (!memories.length) return [];

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase.from("memories").insert(memories.map(toMemoryRow)).select("*");
    if (error) throw new Error(error.message);
    return data.map(fromMemoryRow);
  }

  const existing = await getAllMemories();
  const next = [...memories, ...existing].slice(0, 500);
  await fs.writeFile(LOCAL_STORE, JSON.stringify(next, null, 2));
  return memories;
}

export async function getAllMemories(userId = "demo-user"): Promise<Memory[]> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from("memories")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw new Error(error.message);
    return data.map(fromMemoryRow);
  }

  try {
    const raw = await fs.readFile(LOCAL_STORE, "utf8");
    return JSON.parse(raw).filter((memory: Memory) => memory.userId === userId);
  } catch {
    return seedMemories(userId);
  }
}

export async function retrieveMemories(query: string, userId = "demo-user", limit = 7) {
  const queryEmbedding = await createEmbedding(query);
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { data, error } = await supabase.rpc("match_memories", {
      query_embedding: queryEmbedding,
      match_user_id: userId,
      match_count: limit
    });

    if (!error && data) return data.map(fromMemoryRow);
  }

  const memories = await getAllMemories(userId);
  return memories
    .map((memory) => ({
      memory,
      score: cosineSimilarity(queryEmbedding, memory.embedding) + memory.importance / 100
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.memory);
}

function seedMemories(userId: string): Memory[] {
  const now = new Date().toISOString();
  return [
    {
      id: "seed-midnight-focus",
      userId,
      content: "I usually code better after midnight and prefer deep architecture work late at night.",
      summary: "Late-night deep work is a strong productivity pattern.",
      category: "productivity_pattern",
      importance: 9,
      timestamp: now,
      embedding: [],
      relationships: [{ type: "recurs_with", hint: "Architecture work is often paired with late-night focus." }],
      metadata: { source: "system", signals: ["late-night-focus", "recurring-pattern"] }
    },
    {
      id: "seed-hackathon-goal",
      userId,
      content: "Build an AI-powered Memory Operating System MVP for a hackathon with strong demo impact.",
      summary: "Hackathon goal: ship a memorable AI second-brain demo.",
      category: "goal",
      importance: 10,
      timestamp: now,
      embedding: [],
      relationships: [{ type: "supports", hint: "Prioritize features that create 'it remembered me' moments." }],
      metadata: { source: "system", signals: ["demo-impact"] }
    }
  ];
}
