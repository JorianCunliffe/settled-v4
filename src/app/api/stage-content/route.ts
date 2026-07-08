import { NextRequest, NextResponse } from "next/server";
import {
  isJourneyState,
  loadStageContent,
  resetStageContent,
  saveStageContent,
  validateStageContent,
} from "@/lib/stage-content-db";

export async function GET() {
  try {
    return NextResponse.json(await loadStageContent());
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to load stage content." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const body = (await request.json()) as { state?: unknown; content?: unknown };

  if (!isJourneyState(body.state)) {
    return NextResponse.json({ message: "A valid journey state is required." }, { status: 400 });
  }

  const validated = validateStageContent(body.content);

  if (typeof validated === "string") {
    return NextResponse.json({ message: validated }, { status: 400 });
  }

  try {
    return NextResponse.json(await saveStageContent(body.state, validated));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to save stage content." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state");

  if (!isJourneyState(state)) {
    return NextResponse.json({ message: "A valid journey state is required." }, { status: 400 });
  }

  try {
    return NextResponse.json(await resetStageContent(state));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to reset stage content." },
      { status: 500 },
    );
  }
}
