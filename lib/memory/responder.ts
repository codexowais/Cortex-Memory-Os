import OpenAI from "openai";
import { Memory } from "./types";

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function generateContextualResponse(input: string, memories: Memory[]) {
  const openai = getOpenAI();
  const context = memories
    .map((memory) => `- [${memory.category}, importance ${memory.importance}] ${memory.summary}`)
    .join("\n");

  if (openai) {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.55,
      messages: [
        {
          role: "system",
          content:
            "You are Cortex, a persistent cognitive layer. Be concise, emotionally intelligent, and naturally reference relevant memories. Do not say you are a notes app. Offer one proactive next step when useful."
        },
        {
          role: "user",
          content: `Relevant long-term memory:\n${context || "No prior memory yet."}\n\nCurrent user message:\n${input}`
        }
      ]
    });

    return completion.choices[0].message.content ?? fallbackResponse(input, memories);
  }

  return fallbackResponse(input, memories);
}

function fallbackResponse(input: string, memories: Memory[]) {
  const strongest = memories[0];

  if (!strongest) {
    return "I captured that. As we keep talking, I'll start connecting your goals, routines, emotional patterns, and unfinished loops into a more useful continuity layer.";
  }

  if (strongest.metadata.signals.includes("late-night-focus")) {
    return "I'm connecting this with your late-night focus pattern. You tend to describe deeper coding momentum after midnight, so this might be a good window for architecture work rather than shallow tasks.";
  }

  if (input.toLowerCase().includes("what") || input.toLowerCase().includes("remember")) {
    return `I remember this thread of context: ${strongest.summary} That feels relevant here because it shapes how I should prioritize your next step.`;
  }

  return `Stored. This connects with: "${strongest.summary}" I'll keep watching for whether this becomes a recurring pattern or an open loop that should resurface later.`;
}
