import { createClient } from "@supabase/supabase-js";
import { Memory } from "@/lib/memory/types";

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      persistSession: false
    }
  });
}

export function toMemoryRow(memory: Memory) {
  return {
    id: memory.id,
    user_id: memory.userId,
    content: memory.content,
    summary: memory.summary,
    category: memory.category,
    importance: memory.importance,
    created_at: memory.timestamp,
    embedding: memory.embedding,
    relationships: memory.relationships,
    metadata: memory.metadata
  };
}

export function fromMemoryRow(row: any): Memory {
  return {
    id: row.id,
    userId: row.user_id,
    content: row.content,
    summary: row.summary,
    category: row.category,
    importance: row.importance,
    timestamp: row.created_at,
    embedding: row.embedding ?? [],
    relationships: row.relationships ?? [],
    metadata: row.metadata ?? { source: "conversation", signals: [] }
  };
}
