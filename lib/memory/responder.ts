import OpenAI from "openai";
import { Memory, RankedMemory } from "./types";

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function generateContextualResponse(input: string, savedMemories: Memory[], rankedMemories: RankedMemory[]) {
  const openai = getOpenAI();
  const context = rankedMemories
    .map(
      ({ memory, score, components }) =>
        `- [${memory.category}, recall ${score.toFixed(2)}, semantic ${components.semantic.toFixed(
          2
        )}, recency ${components.recency.toFixed(2)}, recurrence ${components.recurrence.toFixed(2)}] ${
          memory.summary
        }`
    )
    .join("\n");
  const justSaved = savedMemories.map((memory) => `- ${memory.summary}`).join("\n");

  if (openai) {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.55,
      messages: [
        {
          role: "system",
          content:
            "You are Cortex, a persistent cognitive layer, not a chatbot. Sound observant, calm, contextual, and reflective. Reference memory naturally when it matters. Prefer concrete pattern language such as 'I noticed...' or 'This connects with...' Avoid generic assistant openers, robotic bullet dumps, and therapy-speak. Offer one small proactive next step only when it is genuinely useful."
        },
        {
          role: "user",
          content: `Newly captured memory:\n${justSaved || "No new durable memory captured."}\n\nRanked long-term memory:\n${
            context || "No prior memory yet."
          }\n\nCurrent user message:\n${input}`
        }
      ]
    });

    return completion.choices[0].message.content ?? fallbackResponse(input, savedMemories, rankedMemories);
  }

  return fallbackResponse(input, savedMemories, rankedMemories);
}

function fallbackResponse(input: string, savedMemories: Memory[], rankedMemories: RankedMemory[]) {
  const strongest = rankedMemories[0]?.memory ?? savedMemories[0];
  const saved = savedMemories[0];
  const lower = input.toLowerCase();

  if (!strongest) {
    return "I captured the shape of that. As we keep going, I'll start connecting your goals, routines, emotional patterns, and unfinished loops into something more continuous.";
  }

  if (strongest.metadata.signals.includes("burnout-risk") || strongest.metadata.signals.includes("stress-signal")) {
    return `I noticed this touches the same pressure pattern as "${strongest.summary}" The useful move may be to make the next step smaller, not to push harder.`;
  }

  if (strongest.metadata.signals.includes("late-night-focus")) {
    return "This connects with your late-night focus pattern. You tend to describe deeper coding momentum after midnight, so architecture or retrieval work may fit better there than scattered admin tasks.";
  }

  if (lower.includes("what") || lower.includes("remember")) {
    return `I remember the strongest related thread as: ${strongest.summary} That matters because it changes what context I should keep close right now.`;
  }

  if (saved?.relationships.some((relationship) => relationship.targetId)) {
    return `Stored. I linked it to nearby context around "${strongest.summary}" so it can resurface as part of the same cognitive thread later.`;
  }

  return `Stored. This now sits near: "${strongest.summary}" I'll watch whether it becomes a recurring pattern, an emotional signal, or an open loop worth resurfacing.`;
}
