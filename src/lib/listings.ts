import { Pool, type PoolClient } from "pg";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export interface CreatedListingInput {
  address: string;
  bathrooms: number;
  bedrooms: number;
  category: string;
  description?: string;
  garages?: number;
  listingType: string;
  location: string;
  price: number;
  size: number;
  title: string;
  yearBuilt?: string;
  imageUrls?: string[];
}

export interface CreatedListing {
  id: number;
  page: string;
  tag: string;
  tag_bg?: string;
  carousel_thumb: {
    id?: string;
    img: string;
    active?: string;
  }[];
  thumb: string;
  title: string;
  address: string;
  location: string;
  property_info: {
    sqft: number;
    bed: string;
    bath: string;
    parking_lot?: string;
  };
  price: number;
  carousel: string;
  status: string;
  type: string;
  amenities: string[];
  description?: string;
  createdAt: string;
  updatedAt?: string;
  yearBuilt?: string;
  imageUrls?: string[];
  isCreated: true;
}

export type ListingPersistence = "database" | "memory";

type ListingRow = {
  id: number;
  data: CreatedListing;
  created_at: Date | string;
  updated_at: Date | string;
};

declare global {
  var createdListingStore: CreatedListing[] | undefined;
  var listingPool: Pool | undefined;
  var listingSchemaReady: boolean | undefined;
}

const defaultListingImages = [
  "/assets/images/listing/img_01.jpg",
  "/assets/images/listing/img_02.jpg",
  "/assets/images/listing/img_03.jpg",
];

const uploadDir = path.join(process.cwd(), "public", "uploads", "listings");

function getConnectionString(): string | null {
  return (
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    null
  );
}

export function getListingPersistenceMode(): ListingPersistence {
  return getConnectionString() ? "database" : "memory";
}

function getPool(): Pool | null {
  const connectionString = getConnectionString();

  if (!connectionString) {
    return null;
  }

  if (!globalThis.listingPool) {
    globalThis.listingPool = new Pool({
      connectionString,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : undefined,
    });
  }

  return globalThis.listingPool;
}

async function ensureSchema(client: PoolClient) {
  if (globalThis.listingSchemaReady) {
    return;
  }

  await client.query(`
    CREATE TABLE IF NOT EXISTS property_listings (
      id SERIAL PRIMARY KEY,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  globalThis.listingSchemaReady = true;
}

function getListingStore() {
  if (!globalThis.createdListingStore) {
    globalThis.createdListingStore = [];
  }

  return globalThis.createdListingStore;
}

function cloneListing(listing: CreatedListing): CreatedListing {
  return {
    ...listing,
    property_info: { ...listing.property_info },
    carousel_thumb: listing.carousel_thumb.map((item) => ({ ...item })),
    amenities: [...listing.amenities],
  };
}

function toCount(value: number) {
  return String(Math.max(0, value)).padStart(2, "0");
}

function fromCount(value: string | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeListingType(value: string) {
  const type = value.trim().toLowerCase();

  if (type === "rent") {
    return { tag: "FOR RENT", statusPrefix: "Rent", tagBg: undefined };
  }

  return { tag: "FOR SELL", statusPrefix: "Sell", tagBg: "sale" };
}

function getCategoryFromListing(listing: CreatedListing) {
  return listing.status.replace(/^(Sell|Rent)\s+/i, "") || "Houses";
}

function getListingTypeFromListing(listing: CreatedListing) {
  return listing.tag === "FOR RENT" ? "Rent" : "Sell";
}

function getInputFromListing(listing: CreatedListing): CreatedListingInput {
  return {
    address: listing.address,
    bathrooms: fromCount(listing.property_info.bath),
    bedrooms: fromCount(listing.property_info.bed),
    category: getCategoryFromListing(listing),
    description: listing.description,
    garages: fromCount(listing.property_info.parking_lot),
    listingType: getListingTypeFromListing(listing),
    location: listing.location,
    price: listing.price,
    size: listing.property_info.sqft,
    title: listing.title,
    yearBuilt: listing.yearBuilt,
    imageUrls: listing.imageUrls,
  };
}

function buildListing(params: {
  createdAt?: string;
  id: number;
  input: CreatedListingInput;
  updatedAt?: string;
}): CreatedListing {
  const { id, input } = params;
  const listingType = normalizeListingType(input.listingType);
  const imageUrls =
    input.imageUrls && input.imageUrls.length > 0
      ? input.imageUrls
      : defaultListingImages;

  return {
    id,
    page: "listing_1",
    tag: listingType.tag,
    tag_bg: listingType.tagBg,
    carousel_thumb: imageUrls.map((img, index) => ({
      id: String(index + 1),
      img,
      active: index === 0 ? "active" : undefined,
    })),
    thumb: imageUrls[0],
    title: input.title.trim(),
    address: input.address.trim(),
    location: input.location.trim(),
    property_info: {
      sqft: input.size,
      bed: toCount(input.bedrooms),
      bath: toCount(input.bathrooms),
      parking_lot:
        input.garages === undefined ? undefined : toCount(input.garages),
    },
    price: input.price,
    carousel: `created-${id}`,
    status: `${listingType.statusPrefix} ${input.category.trim()}`,
    type: "Newest",
    amenities: ["Parking"],
    description: input.description?.trim(),
    createdAt: params.createdAt ?? new Date().toISOString(),
    updatedAt: params.updatedAt,
    yearBuilt: input.yearBuilt?.trim(),
    imageUrls,
    isCreated: true,
  };
}

export async function saveListingUploads(files: File[]) {
  const savedUrls: string[] = [];

  if (files.length === 0) {
    return savedUrls;
  }

  await mkdir(uploadDir, { recursive: true });

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      continue;
    }

    const extension = path.extname(file.name) || ".jpg";
    const filename = `${Date.now()}-${randomSafeName(file.name)}${extension}`;
    const target = path.join(uploadDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());

    await writeFile(target, buffer);
    savedUrls.push(`/uploads/listings/${filename}`);
  }

  return savedUrls;
}

function randomSafeName(value: string) {
  return value
    .replace(path.extname(value), "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 40);
}

function hydrateRow(row: ListingRow): CreatedListing {
  return {
    ...row.data,
    id: row.id,
    createdAt:
      row.data.createdAt ??
      (row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at).toISOString()),
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : new Date(row.updated_at).toISOString(),
  };
}

export async function listCreatedListings(): Promise<{
  listings: CreatedListing[];
  persistence: ListingPersistence;
}> {
  const pool = getPool();

  if (!pool) {
    return {
      listings: getListingStore().map(cloneListing),
      persistence: "memory",
    };
  }

  const client = await pool.connect();

  try {
    await ensureSchema(client);
    const result = await client.query<ListingRow>(`
      SELECT id, data, created_at, updated_at
      FROM property_listings
      ORDER BY created_at DESC
    `);

    return {
      listings: result.rows.map(hydrateRow),
      persistence: "database",
    };
  } finally {
    client.release();
  }
}

export async function getCreatedListing(id: number): Promise<{
  listing: CreatedListing | null;
  persistence: ListingPersistence;
}> {
  const pool = getPool();

  if (!pool) {
    return {
      listing: getListingStore().find((listing) => listing.id === id) ?? null,
      persistence: "memory",
    };
  }

  const client = await pool.connect();

  try {
    await ensureSchema(client);
    const result = await client.query<ListingRow>(
      `
        SELECT id, data, created_at, updated_at
        FROM property_listings
        WHERE id = $1
      `,
      [id],
    );

    return {
      listing: result.rows[0] ? hydrateRow(result.rows[0]) : null,
      persistence: "database",
    };
  } finally {
    client.release();
  }
}

export async function createListing(input: CreatedListingInput): Promise<{
  listing: CreatedListing;
  persistence: ListingPersistence;
}> {
  const pool = getPool();

  if (!pool) {
    const store = getListingStore();
    const nextId =
      store.reduce((highest, listing) => Math.max(highest, listing.id), 1000) +
      1;
    const listing = buildListing({ id: nextId, input });

    store.unshift(listing);
    return { listing: cloneListing(listing), persistence: "memory" };
  }

  const client = await pool.connect();

  try {
    await ensureSchema(client);
    const createdAt = new Date().toISOString();
    const insertResult = await client.query<{ id: number }>(
      `
        INSERT INTO property_listings (data, created_at, updated_at)
        VALUES ($1::jsonb, $2, $2)
        RETURNING id
      `,
      [JSON.stringify({}), createdAt],
    );
    const id = insertResult.rows[0].id;
    const listing = buildListing({ createdAt, id, input, updatedAt: createdAt });

    await client.query(
      `
        UPDATE property_listings
        SET data = $2::jsonb
        WHERE id = $1
      `,
      [id, JSON.stringify(listing)],
    );

    return { listing, persistence: "database" };
  } finally {
    client.release();
  }
}

export async function updateListing(
  id: number,
  input: Partial<CreatedListingInput>,
): Promise<{
  listing: CreatedListing | null;
  persistence: ListingPersistence;
}> {
  const current = await getCreatedListing(id);

  if (!current.listing) {
    return { listing: null, persistence: current.persistence };
  }

  const mergedInput: CreatedListingInput = {
    ...getInputFromListing(current.listing),
    ...input,
  };
  const updatedAt = new Date().toISOString();
  const listing = buildListing({
    createdAt: current.listing.createdAt,
    id,
    input: mergedInput,
    updatedAt,
  });
  const pool = getPool();

  if (!pool) {
    const store = getListingStore();
    const index = store.findIndex((item) => item.id === id);

    if (index >= 0) {
      store[index] = listing;
    }

    return { listing: cloneListing(listing), persistence: "memory" };
  }

  const client = await pool.connect();

  try {
    await ensureSchema(client);
    await client.query(
      `
        UPDATE property_listings
        SET data = $2::jsonb, updated_at = $3
        WHERE id = $1
      `,
      [id, JSON.stringify(listing), updatedAt],
    );

    return { listing, persistence: "database" };
  } finally {
    client.release();
  }
}

export async function deleteListing(id: number): Promise<{
  deleted: boolean;
  persistence: ListingPersistence;
}> {
  const pool = getPool();

  if (!pool) {
    const store = getListingStore();
    const index = store.findIndex((listing) => listing.id === id);

    if (index === -1) {
      return { deleted: false, persistence: "memory" };
    }

    store.splice(index, 1);
    return { deleted: true, persistence: "memory" };
  }

  const client = await pool.connect();

  try {
    await ensureSchema(client);
    const result = await client.query(
      "DELETE FROM property_listings WHERE id = $1",
      [id],
    );

    return {
      deleted: (result.rowCount ?? 0) > 0,
      persistence: "database",
    };
  } finally {
    client.release();
  }
}
