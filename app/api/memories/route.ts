import { NextResponse } from "next/server";
import { getAllMemories } from "@/lib/memory/store";

export async function GET() {
  return NextResponse.json({ memories: await getAllMemories() });
}
