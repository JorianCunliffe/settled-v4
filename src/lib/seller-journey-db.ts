import { randomUUID } from "crypto";
import { Pool, type PoolClient } from "pg";
import {
  cloneSampleJourney,
  transitionJourney,
  type JourneyActor,
  type JourneyPersistence,
  type JourneyState,
  type SellerJourney,
  type TimelineEntry,
} from "@/lib/seller-journey";

type JourneyRow = {
  id: string;
  property_address: string;
  seller_name: string;
  target_price: string;
  current_state: JourneyState;
  checklist: SellerJourney["checklist"];
  agent_candidates: SellerJourney["agentCandidates"];
};

type EventRow = {
  actor: JourneyActor;
  from_state: JourneyState | null;
  to_state: JourneyState;
  note: string;
  created_at: Date | string;
};

declare global {
  var sellerJourneyPool: Pool | undefined;
  var sellerJourneySchemaReady: boolean | undefined;
  var sellerJourneyMemoryStore: Map<string, SellerJourney> | undefined;
}

function getConnectionString(): string | null {
  return (
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    null
  );
}

export function getJourneyPersistenceMode(): JourneyPersistence {
  return getConnectionString() ? "database" : "memory";
}

function getPool(): Pool | null {
  const connectionString = getConnectionString();

  if (!connectionString) {
    return null;
  }

  if (!globalThis.sellerJourneyPool) {
    globalThis.sellerJourneyPool = new Pool({
      connectionString,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : undefined,
    });
  }

  return globalThis.sellerJourneyPool;
}

function cloneJourney(journey: SellerJourney): SellerJourney {
  return {
    ...journey,
    timeline: journey.timeline.map((entry) => ({ ...entry })),
    checklist: journey.checklist.map((item) => ({ ...item })),
    agentCandidates: journey.agentCandidates.map((candidate) => ({
      ...candidate,
    })),
  };
}

function getMemoryStore() {
  if (!globalThis.sellerJourneyMemoryStore) {
    const seeded = cloneSampleJourney();
    globalThis.sellerJourneyMemoryStore = new Map([[seeded.id, seeded]]);
  }

  return globalThis.sellerJourneyMemoryStore;
}

function loadMemoryJourney(journeyId?: string): SellerJourney {
  const store = getMemoryStore();
  const fallbackId = cloneSampleJourney().id;
  const effectiveId = journeyId ?? fallbackId;
  const journey = store.get(effectiveId) ?? store.get(fallbackId);

  if (!journey) {
    const seeded = cloneSampleJourney();
    store.set(seeded.id, seeded);
    return cloneJourney(seeded);
  }

  return cloneJourney(journey);
}

function saveMemoryJourney(journey: SellerJourney) {
  getMemoryStore().set(journey.id, cloneJourney(journey));
}

async function ensureSchema(client: PoolClient) {
  if (globalThis.sellerJourneySchemaReady) {
    return;
  }

  await client.query(`
    CREATE TABLE IF NOT EXISTS seller_journeys (
      id TEXT PRIMARY KEY,
      property_address TEXT NOT NULL,
      seller_name TEXT NOT NULL,
      target_price TEXT NOT NULL,
      current_state TEXT NOT NULL,
      checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
      agent_candidates JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS seller_journey_events (
      id TEXT PRIMARY KEY,
      journey_id TEXT NOT NULL REFERENCES seller_journeys(id) ON DELETE CASCADE,
      actor TEXT NOT NULL,
      from_state TEXT NULL,
      to_state TEXT NOT NULL,
      note TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  globalThis.sellerJourneySchemaReady = true;
}

function hydrateJourney(row: JourneyRow, events: EventRow[]): SellerJourney {
  return {
    id: row.id,
    propertyAddress: row.property_address,
    sellerName: row.seller_name,
    targetPrice: row.target_price,
    currentState: row.current_state,
    checklist: row.checklist,
    agentCandidates: row.agent_candidates,
    timeline: events.map((event) => ({
      actor: event.actor,
      from: event.from_state,
      to: event.to_state,
      note: event.note,
      at:
        event.created_at instanceof Date
          ? event.created_at.toISOString()
          : new Date(event.created_at).toISOString(),
    })),
  };
}

async function seedJourney(client: PoolClient) {
  const seeded = cloneSampleJourney();

  await client.query(
    `
      INSERT INTO seller_journeys (
        id,
        property_address,
        seller_name,
        target_price,
        current_state,
        checklist,
        agent_candidates
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)
      ON CONFLICT (id) DO NOTHING
    `,
    [
      seeded.id,
      seeded.propertyAddress,
      seeded.sellerName,
      seeded.targetPrice,
      seeded.currentState,
      JSON.stringify(seeded.checklist),
      JSON.stringify(seeded.agentCandidates),
    ],
  );

  const existingEvents = await client.query(
    "SELECT COUNT(*)::int AS count FROM seller_journey_events WHERE journey_id = $1",
    [seeded.id],
  );

  if (existingEvents.rows[0]?.count === 0) {
    for (const entry of seeded.timeline) {
      await client.query(
        `
          INSERT INTO seller_journey_events (
            id,
            journey_id,
            actor,
            from_state,
            to_state,
            note,
            created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          randomUUID(),
          seeded.id,
          entry.actor,
          entry.from,
          entry.to,
          entry.note,
          entry.at,
        ],
      );
    }
  }

  return seeded.id;
}

async function fetchJourneyById(
  client: PoolClient,
  journeyId: string,
): Promise<SellerJourney | null> {
  const journeyResult = await client.query<JourneyRow>(
    `
      SELECT
        id,
        property_address,
        seller_name,
        target_price,
        current_state,
        checklist,
        agent_candidates
      FROM seller_journeys
      WHERE id = $1
    `,
    [journeyId],
  );

  const row = journeyResult.rows[0];

  if (!row) {
    return null;
  }

  const eventResult = await client.query<EventRow>(
    `
      SELECT actor, from_state, to_state, note, created_at
      FROM seller_journey_events
      WHERE journey_id = $1
      ORDER BY created_at ASC
    `,
    [journeyId],
  );

  return hydrateJourney(row, eventResult.rows);
}

export async function loadJourney(journeyId?: string): Promise<{
  journey: SellerJourney;
  persistence: JourneyPersistence;
}> {
  const pool = getPool();

  if (!pool) {
    return {
      journey: loadMemoryJourney(journeyId),
      persistence: "memory",
    };
  }

  const client = await pool.connect();

  try {
    await ensureSchema(client);
    const effectiveId = journeyId ?? (await seedJourney(client));
    let journey = await fetchJourneyById(client, effectiveId);

    if (!journey) {
      await seedJourney(client);
      journey = await fetchJourneyById(client, cloneSampleJourney().id);
    }

    return {
      journey: journey ?? cloneSampleJourney(),
      persistence: "database",
    };
  } finally {
    client.release();
  }
}

async function persistTimelineEntry(
  client: PoolClient,
  journeyId: string,
  entry: TimelineEntry,
) {
  await client.query(
    `
      INSERT INTO seller_journey_events (
        id,
        journey_id,
        actor,
        from_state,
        to_state,
        note,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      randomUUID(),
      journeyId,
      entry.actor,
      entry.from,
      entry.to,
      entry.note,
      entry.at,
    ],
  );
}

export async function transitionStoredJourney(params: {
  actor: JourneyActor;
  journeyId?: string;
  note?: string;
  to: JourneyState;
}): Promise<{
  journey: SellerJourney;
  persistence: JourneyPersistence;
}> {
  const pool = getPool();

  if (!pool) {
    const journey = transitionJourney({
      journey: loadMemoryJourney(params.journeyId),
      actor: params.actor,
      to: params.to,
      note: params.note,
    });

    saveMemoryJourney(journey);

    return { journey, persistence: "memory" };
  }

  const client = await pool.connect();

  try {
    await ensureSchema(client);
    await client.query("BEGIN");

    const seededId = params.journeyId ?? cloneSampleJourney().id;
    let currentJourney = await fetchJourneyById(client, seededId);

    if (!currentJourney) {
      await seedJourney(client);
      currentJourney = await fetchJourneyById(client, cloneSampleJourney().id);
    }

    if (!currentJourney) {
      throw new Error("Unable to load the seller journey.");
    }

    const nextJourney = transitionJourney({
      journey: currentJourney,
      actor: params.actor,
      to: params.to,
      note: params.note,
    });

    await client.query(
      `
        UPDATE seller_journeys
        SET
          property_address = $2,
          seller_name = $3,
          target_price = $4,
          current_state = $5,
          checklist = $6::jsonb,
          agent_candidates = $7::jsonb,
          updated_at = NOW()
        WHERE id = $1
      `,
      [
        nextJourney.id,
        nextJourney.propertyAddress,
        nextJourney.sellerName,
        nextJourney.targetPrice,
        nextJourney.currentState,
        JSON.stringify(nextJourney.checklist),
        JSON.stringify(nextJourney.agentCandidates),
      ],
    );

    const latestEntry = nextJourney.timeline[nextJourney.timeline.length - 1];
    await persistTimelineEntry(client, nextJourney.id, latestEntry);

    await client.query("COMMIT");

    return {
      journey: nextJourney,
      persistence: "database",
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function setStoredJourneyState(params: {
  actor: JourneyActor;
  journeyId?: string;
  note?: string;
  to: JourneyState;
}): Promise<{
  journey: SellerJourney;
  persistence: JourneyPersistence;
}> {
  const pool = getPool();

  if (!pool) {
    const currentJourney = loadMemoryJourney(params.journeyId);
    const nextJourney: SellerJourney = {
      ...currentJourney,
      currentState: params.to,
      timeline: [
        ...currentJourney.timeline,
        {
          actor: params.actor,
          at: new Date().toISOString(),
          from: currentJourney.currentState,
          note:
            params.note ??
            `Admin set the journey state to ${params.to} for ${params.actor}.`,
          to: params.to,
        },
      ],
    };

    saveMemoryJourney(nextJourney);

    return { journey: nextJourney, persistence: "memory" };
  }

  const client = await pool.connect();

  try {
    await ensureSchema(client);
    await client.query("BEGIN");

    const seededId = params.journeyId ?? cloneSampleJourney().id;
    let currentJourney = await fetchJourneyById(client, seededId);

    if (!currentJourney) {
      await seedJourney(client);
      currentJourney = await fetchJourneyById(client, cloneSampleJourney().id);
    }

    if (!currentJourney) {
      throw new Error("Unable to load the seller journey.");
    }

    const entry: TimelineEntry = {
      actor: params.actor,
      at: new Date().toISOString(),
      from: currentJourney.currentState,
      note:
        params.note ??
        `Admin set the journey state to ${params.to} for ${params.actor}.`,
      to: params.to,
    };

    const nextJourney: SellerJourney = {
      ...currentJourney,
      currentState: params.to,
      timeline: [...currentJourney.timeline, entry],
    };

    await client.query(
      `
        UPDATE seller_journeys
        SET current_state = $2, updated_at = NOW()
        WHERE id = $1
      `,
      [nextJourney.id, nextJourney.currentState],
    );
    await persistTimelineEntry(client, nextJourney.id, entry);
    await client.query("COMMIT");

    return {
      journey: nextJourney,
      persistence: "database",
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
