import { NextResponse } from "next/server";
import { getAllMemories } from "@/lib/memory/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json({ memories: await getAllMemories() });
}
