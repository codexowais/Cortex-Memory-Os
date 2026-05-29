import { NextResponse } from "next/server";
import { z } from "zod";
import { extractMemories } from "@/lib/memory/extractor";
import { findOpenLoops, markOpenLoopsResurfaced, resurfaceOpenLoops } from "@/lib/memory/open-loops";
import { linkMemories } from "@/lib/memory/relationships";
import { generateContextualResponse } from "@/lib/memory/responder";
import { getAllMemories, retrieveRankedMemories, saveMemories, updateMemories } from "@/lib/memory/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const chatSchema = z.object({
  message: z.string().min(1),
  userId: z.string().default("demo-user")
});

export async function POST(request: Request) {
  const body = chatSchema.parse(await request.json());

  const existingMemories = await getAllMemories(body.userId);
  const extracted = await extractMemories(body.message, body.userId);
  const linkedMemories = linkMemories(extracted, existingMemories);
  const savedMemories = await saveMemories(linkedMemories);
  const rankedMemories = await retrieveRankedMemories(body.message, body.userId, 8);
  const allMemories = await getAllMemories(body.userId);
  const openLoops = findOpenLoops(allMemories, { currentInput: body.message, rankedMemories, limit: 5 });
  const resurfaced = resurfaceOpenLoops(body.message, allMemories, rankedMemories);
  const resurfacedIds = resurfaced.map((item) => item.memory.id);

  if (resurfacedIds.length) {
    const updated = markOpenLoopsResurfaced(allMemories, resurfacedIds);
    await updateMemories(updated.filter((memory) => resurfacedIds.includes(memory.id)));
  }

  const response = await generateContextualResponse(body.message, savedMemories, rankedMemories, allMemories, resurfaced);

  return NextResponse.json({
    response,
    remembered: savedMemories,
    recalled: rankedMemories.map((item) => item.memory),
    openLoops,
    resurfaced,
    recallScores: rankedMemories.map((item) => ({
      id: item.memory.id,
      score: item.score,
      components: item.components
    }))
  });
}
