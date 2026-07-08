import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { isJourneyState, loadStageContent, saveStageContent } from "@/lib/stage-content-db";

// Stay under Vercel's ~4.5MB serverless request body limit.
const MAX_FILE_BYTES = 4 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const state = formData.get("state");
  const kind = formData.get("kind");
  const file = formData.get("file");

  if (!isJourneyState(state)) {
    return NextResponse.json({ message: "A valid journey state is required." }, { status: 400 });
  }

  if (kind !== "video" && kind !== "guide") {
    return NextResponse.json({ message: 'kind must be "video" or "guide".' }, { status: 400 });
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ message: "A file is required." }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { message: "Files must be smaller than 4MB (upload request limit)." },
      { status: 400 },
    );
  }

  if (kind === "video" && !file.type.startsWith("video/")) {
    return NextResponse.json({ message: "Video uploads must be a video file (e.g. mp4)." }, { status: 400 });
  }

  if (kind === "guide" && file.type !== "application/pdf") {
    return NextResponse.json({ message: "Guide uploads must be a PDF." }, { status: 400 });
  }

  try {
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    let url: string;

    if (blobToken) {
      const blob = await put(`stage-content/${state}/${kind}-${Date.now()}-${file.name}`, file, {
        access: "public",
        token: blobToken,
        addRandomSuffix: true,
      });
      url = blob.url;
    } else {
      const buffer = Buffer.from(await file.arrayBuffer());
      url = `data:${file.type};base64,${buffer.toString("base64")}`;
    }

    const { content } = await loadStageContent();
    const nextMeta = { ...content[state] };

    if (kind === "video") {
      nextMeta.helpVideo = { ...nextMeta.helpVideo, url };
    } else {
      nextMeta.helpGuide = { ...nextMeta.helpGuide, url };
    }

    const payload = await saveStageContent(state, nextMeta);

    return NextResponse.json({
      ...payload,
      uploadedUrl: url,
      assetStorage: blobToken ? "blob" : "inline",
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to upload asset." },
      { status: 500 },
    );
  }
}
