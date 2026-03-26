import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // Create booking from public page — Phase 1, Feature 5
  return NextResponse.json({ success: true });
}
