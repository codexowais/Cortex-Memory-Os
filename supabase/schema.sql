create extension if not exists vector;

create table if not exists memories (
  id uuid primary key,
  user_id text not null,
  content text not null,
  summary text not null,
  category text not null check (
    category in (
      'goal',
      'preference',
      'routine',
      'project',
      'task',
      'emotional_state',
      'productivity_pattern'
    )
  ),
  importance integer not null check (importance between 1 and 10),
  created_at timestamptz not null default now(),
  embedding vector(1536) not null,
  relationships jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists memories_user_created_at_idx on memories (user_id, created_at desc);
create index if not exists memories_embedding_idx on memories using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create or replace function match_memories(
  query_embedding vector(1536),
  match_user_id text,
  match_count int default 8
)
returns table (
  id uuid,
  user_id text,
  content text,
  summary text,
  category text,
  importance integer,
  created_at timestamptz,
  embedding vector(1536),
  relationships jsonb,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    memories.id,
    memories.user_id,
    memories.content,
    memories.summary,
    memories.category,
    memories.importance,
    memories.created_at,
    memories.embedding,
    memories.relationships,
    memories.metadata,
    1 - (memories.embedding <=> query_embedding) as similarity
  from memories
  where memories.user_id = match_user_id
  order by memories.embedding <=> query_embedding
  limit match_count;
$$;
