# Cortex Memory OS Context

## Product Vision

Cortex is an AI-powered Memory Operating System for a 7-day hackathon MVP.

It is not a notes app and not a chatbot wrapper. The goal is a persistent cognitive layer that evolves alongside the user by remembering conversations, storing long-term context, detecting behavioral patterns, predicting forgotten tasks, generating proactive insights, and creating contextual continuity.

Desired feeling: an AI second brain with temporal awareness.

Demo priority: create moments where users think, "Wait... you remembered that?"

## Current Tech Stack

- Next.js 15
- TypeScript
- TailwindCSS
- shadcn/ui-compatible project setup
- Supabase-ready backend
- pgvector-ready schema
- OpenAI API support
- React Flow memory graph

## UX Direction

- Minimal, elegant, dark theme
- Calm futuristic feel
- Light glassmorphism
- Clean typography
- Smooth interactions
- "Apple meets cognitive AI"

## Core Memory Pipeline

User input flows through:

1. Memory extraction
2. Embedding generation
3. Memory storage
4. Semantic retrieval
5. Contextual response generation
6. Proactive insight generation

## Memory Shape

Each memory contains:

- `content`
- `summary`
- `category`
- `importance`
- `timestamp`
- `embedding`
- `relationships`
- `metadata`

Supported categories:

- `goal`
- `preference`
- `routine`
- `project`
- `task`
- `emotional_state`
- `productivity_pattern`

## Implementation Completed

Created a complete runnable MVP in `c:\Users\owais\Documents\cortex`.

Key files:

- `app/page.tsx`: main polished demo dashboard and continuity chat
- `app/layout.tsx`: app shell and metadata
- `app/globals.css`: dark visual system and React Flow styling
- `app/api/chat/route.ts`: chat endpoint with extraction, retrieval, storage, and response generation
- `app/api/insights/route.ts`: insights, daily summary, memory graph payload
- `app/api/memories/route.ts`: memory list endpoint
- `components/memory-graph.tsx`: React Flow graph visualization
- `lib/memory/types.ts`: memory domain types
- `lib/memory/extractor.ts`: OpenAI and heuristic memory extraction
- `lib/memory/embeddings.ts`: OpenAI embeddings with deterministic local fallback
- `lib/memory/store.ts`: Supabase store with local JSON fallback
- `lib/memory/responder.ts`: contextual AI response generation
- `lib/memory/insights.ts`: behavioral pattern detection, daily summaries, graph creation
- `lib/supabase/server.ts`: Supabase admin client and row mapping
- `supabase/schema.sql`: pgvector schema and similarity search RPC
- `.env.example`: required environment variables

## Important Architecture Decisions

- The app works immediately without API keys using deterministic local embeddings and a JSON file fallback.
- If `OPENAI_API_KEY` is present, the app uses OpenAI for extraction, embeddings, and response generation.
- If Supabase environment variables are present, storage switches to Supabase/pgvector.
- Seed memories are returned when no local memory file exists, giving the demo an immediate "persistent memory" feel.
- Behavioral insights are intentionally simple and demo-friendly rather than overengineered.

## Verification Status

Completed:

- `npm install`
- `npm run build`
- `/api/insights` smoke test
- `/api/chat` smoke test on port `3001`

The working dev server was started at:

```text
http://127.0.0.1:3001
```

Notes:

- A stale dev server on port `3000` was stopped.
- Port `3001` remained active after verification.
- `npm install` reported 2 moderate audit findings in transitive packages. No force upgrade was applied to avoid breaking the MVP.

## Current Demo Behavior

The app starts with seeded context:

- User codes better after midnight.
- User is building an AI-powered Memory Operating System MVP for a hackathon.

Example continuity behavior:

If the user asks about coding time, Cortex references the late-night focus pattern.

If the user shares a new habit, task, goal, or feeling, Cortex stores it as memory, updates insights, and refreshes the graph.

## Next Useful Steps

1. Add `.env` with `OPENAI_API_KEY` for high-quality extraction and responses.
2. Create Supabase project and run `supabase/schema.sql`.
3. Add authentication or a demo user selector.
4. Improve relationship linking between memories.
5. Add a daily summary generation cron or manual "summarize today" action.
6. Add temporal resurfacing for forgotten tasks.
7. Add demo script with 3-5 interactions that showcase memory continuity.

## Running Locally

Install dependencies:

```bash
npm install
```

Start dev server:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3001
```

Build:

```bash
npm run build
```
