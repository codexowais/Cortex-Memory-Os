import OpenAI from "openai";
import { z } from "zod";
import { createEmbedding } from "./embeddings";
import { Memory, MemoryCategory, memoryCategories } from "./types";

const extractedMemorySchema = z.object({
  memories: z.array(
    z.object({
      content: z.string(),
      summary: z.string(),
      category: z.enum(memoryCategories),
      importance: z.number().min(1).max(10),
      relationships: z.array(
        z.object({
          type: z.enum(["supports", "relates_to", "contradicts", "follows_up", "recurs_with"]),
          hint: z.string()
        })
      ),
      signals: z.array(z.string())
    })
  )
});

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function extractMemories(input: string, userId = "demo-user"): Promise<Memory[]> {
  const openai = getOpenAI();
  const extracted = openai ? await extractWithOpenAI(openai, input) : extractHeuristically(input);

  return Promise.all(
    extracted.map(async (item) => ({
      id: crypto.randomUUID(),
      userId,
      content: item.content,
      summary: item.summary,
      category: item.category,
      importance: item.importance,
      timestamp: new Date().toISOString(),
      embedding: await createEmbedding(`${item.category}: ${item.content} ${item.summary}`),
      relationships: item.relationships,
      metadata: {
        source: "conversation",
        signals: item.signals
      }
    }))
  );
}

async function extractWithOpenAI(openai: OpenAI, input: string) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Extract durable personal memories from the user input. Only store facts, preferences, goals, routines, projects, tasks, emotional states, and productivity patterns that will matter later. Return JSON with a memories array."
      },
      { role: "user", content: input }
    ]
  });

  const parsed = extractedMemorySchema.safeParse(JSON.parse(completion.choices[0].message.content ?? "{}"));
  return parsed.success ? parsed.data.memories : extractHeuristically(input);
}

type ExtractedMemory = z.infer<typeof extractedMemorySchema>["memories"][number];

function extractHeuristically(input: string): ExtractedMemory[] {
  const lower = input.toLowerCase();
  const category: MemoryCategory =
    lower.includes("want to") || lower.includes("goal") || lower.includes("trying to")
      ? "goal"
      : lower.includes("prefer") || lower.includes("like") || lower.includes("better")
        ? "preference"
        : lower.includes("usually") || lower.includes("every") || lower.includes("routine")
          ? "routine"
          : lower.includes("todo") || lower.includes("need to") || lower.includes("remind")
            ? "task"
            : lower.includes("tired") || lower.includes("anxious") || lower.includes("burn")
              ? "emotional_state"
              : lower.includes("focus") || lower.includes("productive") || lower.includes("code")
                ? "productivity_pattern"
                : "project";

  const importance = lower.includes("must") || lower.includes("important") || lower.includes("deadline") ? 9 : 7;
  const content = input.trim();

  if (content.length < 8) return [];

  return [
    {
      content,
      summary: content.length > 120 ? `${content.slice(0, 117)}...` : content,
      category,
      importance,
      relationships: [{ type: "relates_to" as const, hint: "Captured from the current conversation." }],
      signals: inferSignals(lower)
    }
  ];
}

function inferSignals(lower: string) {
  return [
    lower.includes("midnight") || lower.includes("night") ? "late-night-focus" : "",
    lower.includes("tired") || lower.includes("burnout") ? "burnout-risk" : "",
    lower.includes("deadline") || lower.includes("tomorrow") ? "time-pressure" : "",
    lower.includes("usually") || lower.includes("always") ? "recurring-pattern" : ""
  ].filter(Boolean);
}
