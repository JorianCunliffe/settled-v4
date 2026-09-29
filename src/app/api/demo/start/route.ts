import { NextRequest, NextResponse } from "next/server";
import type { JourneyActor, JourneyState } from "@/lib/seller-journey";
import { resetStoredJourney } from "@/lib/seller-journey-db";
import { isDemoMode } from "@/lib/session";

// Each side opens where it has work to do: the seller is choosing an agent,
// the agent has just been appointed and is kicking off preparation.
const startStateByRole: Record<JourneyActor, JourneyState> = {
  seller: "agent_matching",
  agent: "agent_appointed",
  coordinator: "agent_matching",
};

function isJourneyActor(value: unknown): value is JourneyActor {
  return typeof value === "string" && value in startStateByRole;
}

/** Resets the sample sale for a fresh demo, then opens the portal as the chosen side. */
export async function POST(request: NextRequest) {
  if (!isDemoMode()) {
    return NextResponse.json({ message: "Demo resets are only available in demo mode." }, { status: 404 });
  }

  const form = await request.formData();
  const role = form.get("role");
  const actor: JourneyActor = isJourneyActor(role) ? role : "seller";

  await resetStoredJourney(startStateByRole[actor]);

  return NextResponse.redirect(new URL(`/sell?role=${actor}`, request.url), 303);
}
