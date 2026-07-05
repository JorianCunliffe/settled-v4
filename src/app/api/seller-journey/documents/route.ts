import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { stateMeta, type JourneyActor, type JourneyState } from "@/lib/seller-journey";
import { addStoredJourneyDocument, getJourneyPersistenceMode } from "@/lib/seller-journey-db";

const MAX_FILE_BYTES = 8 * 1024 * 1024;

function isJourneyState(value: unknown): value is JourneyState {
  return typeof value === "string" && value in stateMeta;
}

function isJourneyActor(value: unknown): value is JourneyActor {
  return value === "seller" || value === "agent" || value === "coordinator";
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const journeyId = formData.get("journeyId");
  const actor = formData.get("actor");
  const state = formData.get("state");
  const label = formData.get("label");
  const file = formData.get("file");

  if (!isJourneyActor(actor) || !isJourneyState(state) || typeof label !== "string" || !label) {
    return NextResponse.json(
      { message: "actor, state, and label are required." },
      { status: 400 },
    );
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ message: "A file is required." }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { message: "Files must be smaller than 8MB." },
      { status: 400 },
    );
  }

  try {
    const effectiveJourneyId = typeof journeyId === "string" && journeyId ? journeyId : undefined;
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    let url: string;

    if (blobToken) {
      const pathname = `seller-journey/${effectiveJourneyId ?? "default"}/${state}/${Date.now()}-${file.name}`;
      const blob = await put(pathname, file, {
        access: "public",
        token: blobToken,
        addRandomSuffix: true,
      });
      url = blob.url;
    } else {
      const buffer = Buffer.from(await file.arrayBuffer());
      url = `data:${file.type || "application/octet-stream"};base64,${buffer.toString("base64")}`;
    }

    const { journey, persistence } = await addStoredJourneyDocument({
      journeyId: effectiveJourneyId,
      state,
      label,
      fileName: file.name,
      url,
      uploadedBy: actor,
    });

    return NextResponse.json({
      journey,
      persistence,
      configuredPersistence: getJourneyPersistenceMode(),
      documentStorage: blobToken ? "blob" : "inline",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unable to upload document.",
      },
      { status: 500 },
    );
  }
}
