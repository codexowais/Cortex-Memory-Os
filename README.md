# Cortex Memory OS

Cortex is an AI-powered Memory Operating System MVP built for a hackathon demo. It is designed as a persistent cognitive layer: a place where the user can share goals, routines, tasks, emotional state, and working patterns, then see that context recalled later through chat, insights, summaries, and a memory graph.

The current version is a runnable Next.js app with a polished dark dashboard, continuity chat, proactive suggestions, local memory storage, optional OpenAI intelligence, and optional Supabase/pgvector persistence.

## Current Progress

Implemented:

- Next.js 15 app with TypeScript and TailwindCSS.
- Dark, minimal Cortex dashboard in `app/page.tsx`.
- Continuity chat that accepts user messages and returns contextual responses.
- Memory extraction pipeline with OpenAI support and heuristic fallback.
- Embedding generation with OpenAI support and deterministic local fallback.
- Local JSON memory store using `.cortex-memory.json`.
- Optional Supabase storage through `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- pgvector-ready schema in `supabase/schema.sql`.
- Memory retrieval, daily summary, proactive insights, and graph payload APIs.
- React Flow memory graph visualization.
- Seed memories for immediate demo behavior when no local memory file exists.

Key routes:

- `GET /api/insights` returns memories, daily summary, proactive insights, and graph data.
- `GET /api/memories` returns stored memories.
- `POST /api/chat` retrieves relevant memories, extracts new memories, saves them, and generates a response.

## Current Demo Behavior

The app starts with seeded demo context if no local memory store exists:

- The user codes better after midnight.
- The user is building an AI-powered Memory Operating System MVP for a hackathon.

Try asking about coding time or sharing a new habit, task, goal, or feeling. Cortex should store the new context, refresh the insight panels, and update the memory graph.

## Tech Stack

- Next.js 15
- React 19
- TypeScript
- TailwindCSS 4
- React Flow
- Supabase JS
- OpenAI API
- Zod
- Lucide React

## Environment Variables

The app can run without environment variables. In that mode, it uses local fallbacks for memory extraction, embeddings, response generation, and storage.

For better AI behavior, create a `.env.local` file:

```bash
OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

Only `OPENAI_API_KEY` is needed for OpenAI-powered extraction, embeddings, and responses. Supabase variables are only needed if you want database-backed persistence instead of the local JSON file.

## Run Locally

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

If port `3000` is busy, run the current verified demo port:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3001
```

Then open:

```text
http://127.0.0.1:3001
```

Build the production version:

```bash
npm run build
```

Start the production build:

```bash
npm run start
```

## Supabase Setup

Supabase is optional for the current version. To enable it:

1. Create a Supabase project.
2. Enable the `vector` extension.
3. Run `supabase/schema.sql` in the Supabase SQL editor.
4. Add `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`.
5. Restart the dev server.

When Supabase variables are present, Cortex stores and retrieves memories through Supabase. Otherwise, it uses `.cortex-memory.json` in the project root.

## Useful Files

- `app/page.tsx` - main dashboard and chat UI.
- `app/api/chat/route.ts` - chat, extraction, retrieval, storage, and response flow.
- `app/api/insights/route.ts` - summary, insights, and graph API.
- `app/api/memories/route.ts` - memory list API.
- `components/memory-graph.tsx` - React Flow graph.
- `lib/memory/extractor.ts` - memory extraction logic.
- `lib/memory/embeddings.ts` - embedding generation and fallback vectors.
- `lib/memory/store.ts` - Supabase/local memory persistence.
- `lib/memory/responder.ts` - contextual response generation.
- `lib/memory/insights.ts` - summaries, suggestions, and graph creation.
- `supabase/schema.sql` - pgvector database schema.

## Verification Status

Previously verified:

- `npm install`
- `npm run build`
- `/api/insights` smoke test
- `/api/chat` smoke test on port `3001`

Known note: `npm install` reported 2 moderate audit findings in transitive packages. No force upgrade has been applied so the MVP remains stable.

## Next Steps

- Add `.env.local` with `OPENAI_API_KEY` for stronger extraction and responses.
- Connect Supabase and run `supabase/schema.sql` for pgvector persistence.
- Add authentication or a demo user selector.
- Improve memory relationship linking.
- Add a daily summary cron or manual "summarize today" action.
- Add temporal resurfacing for forgotten tasks.
- Write a short demo script with 3-5 interactions that showcase memory continuity.
