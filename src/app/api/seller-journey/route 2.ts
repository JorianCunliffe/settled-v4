import { NextRequest, NextResponse } from "next/server";
import {
  sampleJourney,
  stateMeta,
  transitionJourney,
  type JourneyActor,
  type JourneyState,
  type SellerJourney,
} from "@/lib/seller-journey";

export async function GET() {
  return NextResponse.json({
    journey: sampleJourney,
    currentStateLabel: stateMeta[sampleJourney.currentState].label,
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    actor?: JourneyActor;
    to?: JourneyState;
    journey?: SellerJourney;
  };

  if (!body.actor || !body.to || !body.journey) {
    return NextResponse.json(
      { message: "actor, to, and journey are required." },
      { status: 400 },
    );
  }

  try {
    const nextJourney = transitionJourney({
      journey: body.journey,
      actor: body.actor,
      to: body.to,
      note: `Transition accepted by ${body.actor}.`,
    });

    return NextResponse.json({
      journey: nextJourney,
      currentStateLabel: stateMeta[nextJourney.currentState].label,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to transition journey.",
      },
      { status: 400 },
    );
  }
}
