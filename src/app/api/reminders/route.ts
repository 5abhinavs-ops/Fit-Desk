import { NextResponse } from "next/server";

export async function GET() {
  // WhatsApp reminder cron job — Phase 1, Feature 6
  // Called by Vercel cron every 30 minutes
  return NextResponse.json({ sent: 0 });
}
