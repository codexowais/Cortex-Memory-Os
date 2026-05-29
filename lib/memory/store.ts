import { promises as fs } from "fs";
import path from "path";
import { createEmbedding } from "./embeddings";
import { normalizeOpenLoopMemories } from "./open-loops";
import { rankMemories } from "./ranking";
import { Memory, RankedMemory } from "./types";
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

export async function updateMemories(memories: Memory[]) {
  if (!memories.length) return [];

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from("memories")
      .upsert(memories.map(toMemoryRow), { onConflict: "id" })
      .select("*");

    if (error) throw new Error(error.message);
    return data.map(fromMemoryRow);
  }

  const existing = await getAllMemories(memories[0].userId);
  const replacements = new Map(memories.map((memory) => [memory.id, memory]));
  const next = existing.map((memory) => replacements.get(memory.id) ?? memory);
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
    return withDemoSeedMemories(data.map(fromMemoryRow), userId);
  }

  try {
    const raw = await fs.readFile(LOCAL_STORE, "utf8");
    return withDemoSeedMemories(JSON.parse(raw).filter((memory: Memory) => memory.userId === userId), userId);
  } catch {
    return demoSeedMemories(userId);
  }
}

export async function retrieveMemories(query: string, userId = "demo-user", limit = 7) {
  const ranked = await retrieveRankedMemories(query, userId, limit);
  return ranked.map((item) => item.memory);
}

export async function retrieveRankedMemories(query: string, userId = "demo-user", limit = 7): Promise<RankedMemory[]> {
  const queryEmbedding = await createEmbedding(query);
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { data, error } = await supabase.rpc("match_memories", {
      query_embedding: queryEmbedding,
      match_user_id: userId,
      match_count: limit * 4
    });

    if (!error && data) {
      const candidates = data.map(fromMemoryRow);
      return rankMemories(query, queryEmbedding, candidates, limit);
    }
  }

  const memories = await getAllMemories(userId);
  return rankMemories(query, queryEmbedding, memories, limit);
}

export function demoSeedMemories(userId: string): Memory[] {
  const now = new Date().toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 36e5).toISOString();
  const twoDaysAgo = new Date(Date.now() - 48 * 36e5).toISOString();
  const threeDaysAgo = new Date(Date.now() - 72 * 36e5).toISOString();

  return normalizeOpenLoopMemories([
    {
      id: "seed-midnight-focus",
      userId,
      content: "I usually code better after midnight and prefer deep architecture work late at night.",
      summary: "Late-night deep work is a strong productivity pattern.",
      category: "productivity_pattern",
      importance: 9,
      timestamp: threeDaysAgo,
      embedding: [],
      relationships: [{ type: "related_to", hint: "Architecture work is often paired with late-night focus." }],
      metadata: { source: "system", signals: ["late-night-focus", "recurring-pattern", "focus-momentum"] }
    },
    {
      id: "seed-hackathon-goal",
      userId,
      content: "Build an AI-powered Memory Operating System MVP for a hackathon with strong demo impact.",
      summary: "Hackathon goal: ship a memorable AI second-brain demo.",
      category: "goal",
      importance: 10,
      timestamp: twoDaysAgo,
      embedding: [],
      relationships: [{ type: "part_of", hint: "Prioritize features that create 'it remembered me' moments." }],
      metadata: { source: "system", signals: ["demo-impact", "demo-pressure", "architecture-focus"] }
    },
    {
      id: "seed-cortex-architecture",
      userId,
      content: "Focus Day 4 on turning Cortex from memory storage into timely resurfacing of forgotten intentions.",
      summary: "Day 4 architecture should prioritize timely resurfacing.",
      category: "project",
      importance: 9,
      timestamp: oneDayAgo,
      embedding: [],
      relationships: [{ type: "part_of", targetId: "seed-hackathon-goal", hint: "Day 4 is part of the hackathon MVP." }],
      metadata: {
        source: "system",
        signals: ["architecture-focus", "demo-impact", "unfinished-loop", "time-pressure"]
      }
    },
    {
      id: "seed-pitch-deck",
      userId,
      content: "I need to finish the pitch deck before the hackathon demo.",
      summary: "Unfinished pitch deck needs to be completed before the demo.",
      category: "task",
      importance: 9,
      timestamp: twoDaysAgo,
      embedding: [],
      relationships: [{ type: "part_of", targetId: "seed-hackathon-goal", hint: "Pitch deck supports the demo." }],
      metadata: {
        source: "system",
        signals: ["unfinished-loop", "demo-pressure", "time-pressure"]
      }
    },
    {
      id: "seed-planning-momentum",
      userId,
      content: "Planning the architecture first helps me get momentum before implementation.",
      summary: "Architecture planning tends to unlock implementation momentum.",
      category: "productivity_pattern",
      importance: 8,
      timestamp: now,
      embedding: [],
      relationships: [{ type: "related_to", targetId: "seed-midnight-focus", hint: "Planning and late-night focus reinforce each other." }],
      metadata: { source: "system", signals: ["focus-momentum", "architecture-focus", "recurring-pattern"] }
    }
  ]);
}

function withDemoSeedMemories(memories: Memory[], userId: string) {
  const existingIds = new Set(memories.map((memory) => memory.id));
  const missingSeeds = demoSeedMemories(userId).filter((memory) => !existingIds.has(memory.id));
  return normalizeOpenLoopMemories([...memories, ...missingSeeds]);
}
