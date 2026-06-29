import { NextRequest, NextResponse } from "next/server";
import { stateMeta, type JourneyActor, type JourneyState } from "@/lib/seller-journey";
import {
  getJourneyPersistenceMode,
  loadJourney,
  transitionStoredJourney,
} from "@/lib/seller-journey-db";

export async function GET(request: NextRequest) {
  try {
    const journeyId = request.nextUrl.searchParams.get("journeyId") ?? undefined;
    const { journey, persistence } = await loadJourney(journeyId);

    return NextResponse.json({
      journey,
      persistence,
      currentStateLabel: stateMeta[journey.currentState].label,
      configuredPersistence: getJourneyPersistenceMode(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to load seller journey.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    actor?: JourneyActor;
    journeyId?: string;
    note?: string;
    to?: JourneyState;
  };

  if (!body.actor || !body.to) {
    return NextResponse.json(
      { message: "actor and to are required." },
      { status: 400 },
    );
  }

  try {
    const { journey, persistence } = await transitionStoredJourney({
      actor: body.actor,
      journeyId: body.journeyId,
      note: body.note ?? `Transition accepted by ${body.actor}.`,
      to: body.to,
    });

    return NextResponse.json({
      journey,
      persistence,
      currentStateLabel: stateMeta[journey.currentState].label,
      configuredPersistence: getJourneyPersistenceMode(),
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
