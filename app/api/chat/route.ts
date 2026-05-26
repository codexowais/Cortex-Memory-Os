import { NextResponse } from "next/server";
import { z } from "zod";
import { extractMemories } from "@/lib/memory/extractor";
import { generateContextualResponse } from "@/lib/memory/responder";
import { retrieveMemories, saveMemories } from "@/lib/memory/store";

const chatSchema = z.object({
  message: z.string().min(1),
  userId: z.string().default("demo-user")
});

export async function POST(request: Request) {
  const body = chatSchema.parse(await request.json());

  const relevantMemories = await retrieveMemories(body.message, body.userId, 8);
  const extracted = await extractMemories(body.message, body.userId);
  const savedMemories = await saveMemories(extracted);
  const response = await generateContextualResponse(body.message, [...savedMemories, ...relevantMemories]);

  return NextResponse.json({
    response,
    remembered: savedMemories,
    recalled: relevantMemories
  });
}
