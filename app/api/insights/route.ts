import { NextResponse } from "next/server";
import { createDailySummary, createMemoryGraph, detectPatterns } from "@/lib/memory/insights";
import { getAllMemories } from "@/lib/memory/store";

export async function GET() {
  const memories = await getAllMemories();

  return NextResponse.json({
    memories,
    insights: detectPatterns(memories),
    summary: createDailySummary(memories),
    graph: createMemoryGraph(memories)
  });
}
