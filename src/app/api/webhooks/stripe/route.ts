import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // Stripe webhook handler — Phase 1, Feature 8
  return NextResponse.json({ received: true });
}
