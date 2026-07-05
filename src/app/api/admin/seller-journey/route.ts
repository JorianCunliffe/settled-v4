import { NextRequest, NextResponse } from "next/server";
import {
  getJourneyPersistenceMode,
  loadJourney,
  setStoredJourneyState,
} from "@/lib/seller-journey-db";
import {
  journeyStates,
  stateMeta,
  type JourneyActor,
  type JourneyState,
} from "@/lib/seller-journey";

const actors: JourneyActor[] = ["seller", "agent", "coordinator"];

function isJourneyState(value: unknown): value is JourneyState {
  return typeof value === "string" && journeyStates.includes(value as JourneyState);
}

function isJourneyActor(value: unknown): value is JourneyActor {
  return typeof value === "string" && actors.includes(value as JourneyActor);
}

export async function GET(request: NextRequest) {
  const journeyId = request.nextUrl.searchParams.get("journeyId") ?? undefined;
  const { journey, persistence } = await loadJourney(journeyId);

  return NextResponse.json({
    journey,
    persistence,
    currentStateLabel: stateMeta[journey.currentState].label,
    configuredPersistence: getJourneyPersistenceMode(),
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    actor?: JourneyActor;
    journeyId?: string;
    note?: string;
    to?: JourneyState;
  };

  if (!isJourneyActor(body.actor) || !isJourneyState(body.to)) {
    return NextResponse.json(
      { message: "A valid actor and target state are required." },
      { status: 400 },
    );
  }

  try {
    const { journey, persistence } = await setStoredJourneyState({
      actor: body.actor,
      journeyId: body.journeyId,
      note: body.note,
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
          error instanceof Error ? error.message : "Unable to update journey.",
      },
      { status: 400 },
    );
  }
}
