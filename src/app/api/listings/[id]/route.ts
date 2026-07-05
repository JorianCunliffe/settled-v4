import { NextRequest, NextResponse } from "next/server";
import {
  deleteListing,
  getCreatedListing,
  getListingPersistenceMode,
  updateListing,
  type CreatedListingInput,
} from "@/lib/listings";

function getId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function getNumber(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(String(value).replace(/[$,]/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : undefined;
}

function parseListingPayload(payload: Record<string, unknown>) {
  const input: Partial<CreatedListingInput> = {};
  const strings: Array<keyof CreatedListingInput> = [
    "address",
    "category",
    "description",
    "listingType",
    "location",
    "title",
    "yearBuilt",
  ];

  for (const key of strings) {
    const value = getString(payload[key]);

    if (value !== undefined) {
      input[key] = value as never;
    }
  }

  const numbers: Array<keyof CreatedListingInput> = [
    "bathrooms",
    "bedrooms",
    "garages",
    "price",
    "size",
  ];

  for (const key of numbers) {
    const value = getNumber(payload[key]);

    if (value !== undefined) {
      input[key] = value as never;
    }
  }

  return input;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = getId(params.id);

  if (!id) {
    return NextResponse.json({ message: "Invalid listing id." }, { status: 400 });
  }

  const { listing, persistence } = await getCreatedListing(id);

  if (!listing) {
    return NextResponse.json({ message: "Listing not found." }, { status: 404 });
  }

  return NextResponse.json({
    listing,
    persistence,
    configuredPersistence: getListingPersistenceMode(),
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = getId(params.id);

  if (!id) {
    return NextResponse.json({ message: "Invalid listing id." }, { status: 400 });
  }

  const payload = (await request.json()) as Record<string, unknown>;
  const { listing, persistence } = await updateListing(
    id,
    parseListingPayload(payload),
  );

  if (!listing) {
    return NextResponse.json({ message: "Listing not found." }, { status: 404 });
  }

  return NextResponse.json({
    listing,
    persistence,
    configuredPersistence: getListingPersistenceMode(),
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = getId(params.id);

  if (!id) {
    return NextResponse.json({ message: "Invalid listing id." }, { status: 400 });
  }

  const { deleted, persistence } = await deleteListing(id);

  if (!deleted) {
    return NextResponse.json({ message: "Listing not found." }, { status: 404 });
  }

  return NextResponse.json({
    deleted,
    persistence,
    configuredPersistence: getListingPersistenceMode(),
  });
}
