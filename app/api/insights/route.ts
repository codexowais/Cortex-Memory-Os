import { NextResponse } from "next/server";
import { createDailySummary, createMemoryGraph, detectPatterns } from "@/lib/memory/insights";
import { findOpenLoops } from "@/lib/memory/open-loops";
import { generateReflection } from "@/lib/memory/reflection";
import { getAllMemories } from "@/lib/memory/store";
import { createMemoryTimeline } from "@/lib/memory/timeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET() {
  const memories = await getAllMemories();

  return NextResponse.json({
    memories,
    insights: detectPatterns(memories),
    openLoops: findOpenLoops(memories),
    reflection: generateReflection(memories),
    timeline: createMemoryTimeline(memories),
    summary: createDailySummary(memories),
    graph: createMemoryGraph(memories)
  });
}
