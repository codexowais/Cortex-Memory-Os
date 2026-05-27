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

Created a complete runnable MVP in `c:\Users\owais\Documents\Cortex-Memory-OS`.

Key files:

- `app/page.tsx`: main polished demo dashboard and continuity chat
- `components/cortex-dashboard.tsx`: client-side dashboard that fetches runtime cognition data after load
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
- `lib/memory/ranking.ts`: Day 3 psychological retrieval scoring
- `lib/memory/relationships.ts`: Day 3 automatic relationship linking engine
- `lib/supabase/server.ts`: Supabase admin client and row mapping
- `supabase/schema.sql`: pgvector schema and similarity search RPC
- `.env.example`: required environment variables

## Day 3 Cognitive Upgrade

Day 3 focused on making Cortex feel like a persistent cognitive presence instead of a chatbot with stored notes. The work stayed heuristic and modular for hackathon speed.

### Retrieval Ranking System

Added `lib/memory/ranking.ts`.

What was added:

- A `RankedMemory` type with score components.
- Ranking based on semantic similarity, recency, importance, recurrence, emotional weight, and relationship density.
- `retrieveRankedMemories()` in `lib/memory/store.ts`.
- Chat responses now receive ranked memory objects instead of only flat memory arrays.

Why it was added:

- Raw vector similarity is not psychologically believable by itself.
- Human memory recall is shaped by what is recent, emotionally charged, repeated, important, and connected.
- Demo impact improves when Cortex recalls memories for reasons that feel human rather than purely lexical.

How it works:

- `semantic`: cosine similarity between query embedding and memory embedding.
- `recency`: exponential time decay with a 72-hour half-life.
- `importance`: normalized user/system importance from 1-10.
- `recurrence`: repeated signals or shared keywords across memories.
- `emotional`: pressure, fatigue, stress, deadline, and emotional-state signals.
- `relationship`: incoming/outgoing relationship density.

Connection to cognition pipeline:

User input still flows through embeddings and retrieval, but the retrieval output is now reranked before context injection. This means Cortex can privilege memories that are semantically relevant and cognitively salient.

### Relationship Linking Engine

Added `lib/memory/relationships.ts`.

What was added:

- Automatic relationship inference for new memories before storage.
- Supported Day 3 relationship types: `related_to`, `caused_by`, `part_of`, and `emotionally_linked`.
- Relationship strength scoring.
- Relationship hints for graph and debugging visibility.

Why it was added:

- Memories should not remain isolated entries.
- Cortex needs lightweight associative structure so a hackathon, stress, sleep loss, coding sessions, and deadlines can become a connected cognitive thread.

How it works:

- New memories are compared against existing memories.
- Relationship score blends embedding similarity, shared keywords, shared cognitive signals, category match, emotional overlap, and temporal proximity.
- The strongest matches become typed relationships with `targetId`, `strength`, and `hint`.

Connection to cognition pipeline:

Relationship linking runs after memory extraction and before memory storage. The saved memory is no longer just a standalone fact; it becomes part of the memory graph used by retrieval, insights, and visualization.

### Proactive Insights System

Upgraded `lib/memory/insights.ts`.

What was added:

- Burnout and energy debt detection.
- Unfinished task resurfacing.
- Recurring emotional pattern detection.
- Productivity window recognition.
- Demo-critical architecture thread detection.
- Insight priority and suggested actions.

Why it was added:

- Cortex should notice patterns before the user explicitly asks.
- The MVP needs moments where the system feels aware, not merely responsive.

How it works:

- Insights group memories by cognitive signals such as `late-night-focus`, `burnout-risk`, `stress-signal`, `unfinished-loop`, `architecture-focus`, and `demo-pressure`.
- Confidence rises with repeated evidence.
- Priority sorts urgent emotional and task signals above lower-stakes observations.

Connection to cognition pipeline:

Insights are generated from stored memories and relationships after retrieval/storage. They represent the proactive cognition layer at the end of the pipeline.

### Daily Cognitive Summary

Upgraded `createDailySummary()` in `lib/memory/insights.ts` and the UI in `app/page.tsx`.

What was added:

- Structured summary fields: main focus, peak productivity, recurring concern, emotional trend, and suggested action.
- The dashboard now displays these fields directly instead of only showing generic bullets.

Why it was added:

- Daily summary should feel like a cognitive mirror.
- The user should immediately see what Cortex thinks today is about.

How it works:

- Recent important memories are sorted and aggregated.
- Signals and categories infer the dominant work thread, energy state, productivity window, and next useful action.

Connection to cognition pipeline:

The summary is an aggregation layer over memory storage and insight detection. It turns raw memory into an interpretable daily state.

### Memory Graph Improvements

Upgraded `components/memory-graph.tsx` and `createMemoryGraph()`.

What was added:

- Cluster labels such as Architecture, Demo, Productivity, Energy, and Open Loops.
- Relationship-specific edge colors.
- Smoothstep edges with arrows.
- Node sizing and opacity influenced by importance.
- Graph nodes include cluster, emotional weight, and recurrence metadata.

Why it was added:

- The graph should read as a cognitive map, not a random list of bubbles.
- Relationship visibility matters for showing semantic continuity during the demo.

How it works:

- `createMemoryGraph()` chooses visible memories by importance, recency, recurrence, and emotional weight.
- Explicit relationships are rendered when target memories are visible.
- If no explicit relationships exist, fallback context edges keep the graph usable.

Connection to cognition pipeline:

The graph visualizes the relationship layer created after extraction and used by retrieval/insights.

### Response Quality Improvements

Upgraded `lib/memory/responder.ts`.

What was added:

- Prompting that frames Cortex as a persistent cognitive layer rather than a chatbot.
- Context injection now includes ranked recall scores and component signals.
- Fallback responses mention observed patterns, linked context, emotional pressure, and open loops.

Why it was added:

- Cortex should sound observant, calm, contextual, and reflective.
- Responses should avoid generic assistant language.

How it works:

- The response generator receives newly saved memories and ranked long-term memories separately.
- OpenAI responses get explicit recall context.
- Local fallback responses use memory signals and relationships to sound context-aware.

Connection to cognition pipeline:

This improves the context injection and contextual response stages of the core architecture.

## Important Architecture Decisions

- The app works immediately without API keys using deterministic local embeddings and a JSON file fallback.
- If `OPENAI_API_KEY` is present, the app uses OpenAI for extraction, embeddings, and response generation.
- If Supabase environment variables are present, storage switches to Supabase/pgvector.
- Seed memories are returned when no local memory file exists, giving the demo an immediate "persistent memory" feel.
- Behavioral insights are intentionally simple and demo-friendly rather than overengineered.
- Day 3 deliberately uses elegant heuristics instead of complex ML or agent frameworks.
- Relationship linking is stored directly on memories to preserve the Supabase-ready JSON model and avoid adding new infrastructure during the hackathon MVP.
- Retrieval remains modular: vector recall gets candidates, then psychological ranking reranks them for context injection.
- Production/prerender safety: cognition work stays behind API routes and client effects. `app/page.tsx` is a lightweight dynamic wrapper, API routes use runtime-only dynamic settings, and React Flow is loaded client-side only.
- Removed `next/font/google` from the layout to avoid build-time font network work in local/offline hackathon environments.

## Verification Status

Completed:

- `npm install`
- `npm run build` before Day 3 changes
- `/api/insights` smoke test
- `/api/chat` smoke test on port `3001`
- Day 3 TypeScript verification: `npx tsc --noEmit`

The working dev server was started at:

```text
http://127.0.0.1:3001
```

Notes:

- A stale dev server on port `3000` was stopped.
- Port `3001` remained active after verification.
- `npm install` reported 2 moderate audit findings in transitive packages. No force upgrade was applied to avoid breaking the MVP.
- After Day 3 changes, `npm run build` hung for an unusually long time and was stopped manually. TypeScript passed, but a full Next production build still needs a clean rerun.
- Runtime isolation changes were added after the build hang: `app/page.tsx` now exports `dynamic = "force-dynamic"` and `revalidate = 0`; API routes export `dynamic = "force-dynamic"`, `runtime = "nodejs"`, and `revalidate = 0`; React Flow is loaded via `next/dynamic` with `ssr: false`.
- Dev server verification after killing stale Node processes: `http://127.0.0.1:3001` returned `200`, and `http://127.0.0.1:3001/api/insights` returned `200`.

## Current Demo Behavior

The app starts with seeded context:

- User codes better after midnight.
- User is building an AI-powered Memory Operating System MVP for a hackathon.

Example continuity behavior:

If the user asks about coding time, Cortex references the late-night focus pattern.

If the user shares a new habit, task, goal, or feeling, Cortex stores it as memory, updates insights, and refreshes the graph.

Day 3 behavior:

- If a user mentions stress, fatigue, demo pressure, or debugging overload, Cortex can detect energy debt and suggest a smaller next work block.
- If a user mentions tasks or unfinished work, Cortex marks the memory as an open loop and can resurface it.
- If a new memory resembles older context, Cortex automatically links it with a relationship type and strength.
- The graph groups memories into semantic/cognitive clusters and shows typed relationships.

## Next Useful Steps

1. Add `.env` with `OPENAI_API_KEY` for high-quality extraction and responses.
2. Create Supabase project and run `supabase/schema.sql`.
3. Diagnose the `npm run build` hang with a clean terminal and fresh Next cache if needed.
4. Add a demo script with 3-5 interactions that showcase memory continuity.
5. Add temporal resurfacing controls for forgotten tasks.
6. Later: add authentication or a demo user selector.

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
