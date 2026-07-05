import { NextRequest, NextResponse } from "next/server";
import {
  createListing,
  getListingPersistenceMode,
  listCreatedListings,
  saveListingUploads,
  type CreatedListingInput,
} from "@/lib/listings";

function getString(value: unknown) {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}

function getNumber(value: unknown) {
  const parsed = Number(getString(value).replace(/[$,]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET() {
  const { listings, persistence } = await listCreatedListings();

  return NextResponse.json({
    listings,
    persistence,
    configuredPersistence: getListingPersistenceMode(),
  });
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  const formData =
    contentType.includes("application/json") ? null : await request.formData();
  const jsonData = formData ? null : ((await request.json()) as Record<string, unknown>);
  const getValue = (name: string) =>
    formData ? formData.get(name) : (jsonData?.[name] as string | number | boolean | null | undefined) ?? null;
  const uploadedImages = formData
    ? await saveListingUploads(
        formData
          .getAll("images")
          .filter((value): value is File => value instanceof File && value.size > 0),
      )
    : Array.isArray(jsonData?.imageUrls)
      ? (jsonData.imageUrls as string[])
      : [];
  const listing: CreatedListingInput = {
    address: getString(getValue("address")),
    bathrooms: getNumber(getValue("bathrooms")),
    bedrooms: getNumber(getValue("bedrooms")),
    category: getString(getValue("category")),
    description: getString(getValue("description")),
    garages: getNumber(getValue("garages")),
    listingType: getString(getValue("listingType")),
    location: getString(getValue("location")),
    price: getNumber(getValue("price")),
    size: getNumber(getValue("size")),
    title: getString(getValue("title")),
    yearBuilt: getString(getValue("yearBuilt")),
    imageUrls: uploadedImages,
  };

  const missing = [
    ["title", listing.title],
    ["address", listing.address],
    ["category", listing.category],
    ["listingType", listing.listingType],
    ["location", listing.location],
  ].filter(([, value]) => !value);

  if (missing.length > 0 || listing.price <= 0 || listing.size <= 0) {
    return NextResponse.json(
      {
        message:
          "Title, address, category, listing type, location, price, and size are required.",
      },
      { status: 400 },
    );
  }

  const { listing: createdListing, persistence } = await createListing(listing);

  return NextResponse.json(
    {
      listing: createdListing,
      persistence,
      configuredPersistence: getListingPersistenceMode(),
    },
    { status: 201 },
  );
}
