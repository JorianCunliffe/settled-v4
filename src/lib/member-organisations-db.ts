import { randomUUID } from "crypto";
import type { JourneyPersistence } from "@/lib/seller-journey";
import { getJourneyPersistenceMode, getPool } from "@/lib/seller-journey-db";
import {
  organisationTypes,
  type MemberOrganisation,
  type OrganisationType,
} from "@/lib/member-organisations";

export interface MemberOrganisationsPayload {
  organisations: MemberOrganisation[];
  persistence: JourneyPersistence;
}

const seedOrganisations: Omit<MemberOrganisation, "createdAt">[] = [
  {
    id: "org-reiq",
    name: "Real Estate Institute of Queensland (REIQ)",
    type: "industry-body",
    partner: true,
    notes: "Founding partner — members receive Settled at no cost.",
  },
  {
    id: "org-qtu",
    name: "Queensland Teachers' Union",
    type: "union",
    partner: true,
    notes: "Partner since launch.",
  },
  {
    id: "org-etu",
    name: "Electrical Trades Union (QLD & NT)",
    type: "union",
    partner: true,
    notes: "Partner since launch.",
  },
  {
    id: "org-anmf",
    name: "Australian Nursing & Midwifery Federation",
    type: "union",
    partner: true,
    notes: "Partner since launch.",
  },
  {
    id: "org-cpa",
    name: "CPA Australia",
    type: "professional-association",
    partner: false,
    notes: "In partnership discussions — members currently pay the standard subscription.",
  },
];

declare global {
  var memberOrganisationsMemoryStore: Map<string, MemberOrganisation> | undefined;
  var memberOrganisationsSchemaReady: boolean | undefined;
}

type OrganisationRow = {
  id: string;
  name: string;
  type: OrganisationType;
  partner: boolean;
  notes: string;
  created_at: Date | string;
};

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function getMemoryStore() {
  if (!globalThis.memberOrganisationsMemoryStore) {
    const now = new Date().toISOString();
    globalThis.memberOrganisationsMemoryStore = new Map(
      seedOrganisations.map((org) => [org.id, { ...org, createdAt: now }]),
    );
  }

  return globalThis.memberOrganisationsMemoryStore;
}

async function ensureSchema() {
  const pool = getPool();

  if (!pool || globalThis.memberOrganisationsSchemaReady) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS member_organisations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      partner BOOLEAN NOT NULL DEFAULT FALSE,
      notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const existing = await pool.query("SELECT COUNT(*)::int AS count FROM member_organisations");

  if (existing.rows[0]?.count === 0) {
    for (const org of seedOrganisations) {
      await pool.query(
        `
          INSERT INTO member_organisations (id, name, type, partner, notes)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO NOTHING
        `,
        [org.id, org.name, org.type, org.partner, org.notes],
      );
    }
  }

  globalThis.memberOrganisationsSchemaReady = true;
}

export async function listMemberOrganisations(): Promise<MemberOrganisationsPayload> {
  const pool = getPool();

  if (!pool) {
    const organisations = [...getMemoryStore().values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    return { organisations, persistence: "memory" };
  }

  await ensureSchema();
  const result = await pool.query<OrganisationRow>(
    "SELECT id, name, type, partner, notes, created_at FROM member_organisations ORDER BY name ASC",
  );

  return {
    organisations: result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      partner: row.partner,
      notes: row.notes,
      createdAt: toIso(row.created_at),
    })),
    persistence: "database",
  };
}

export interface OrganisationInput {
  name: string;
  type: OrganisationType;
  partner: boolean;
  notes: string;
}

export function validateOrganisationInput(input: unknown): OrganisationInput | string {
  if (typeof input !== "object" || input === null) {
    return "Organisation must be an object.";
  }

  const raw = input as Record<string, unknown>;

  if (typeof raw.name !== "string" || raw.name.trim().length === 0) {
    return "Organisation name is required.";
  }

  if (!organisationTypes.includes(raw.type as OrganisationType)) {
    return `Organisation type must be one of: ${organisationTypes.join(", ")}.`;
  }

  if (typeof raw.partner !== "boolean") {
    return "partner must be true or false.";
  }

  if (raw.notes !== undefined && typeof raw.notes !== "string") {
    return "notes must be a string.";
  }

  return {
    name: raw.name.trim(),
    type: raw.type as OrganisationType,
    partner: raw.partner,
    notes: typeof raw.notes === "string" ? raw.notes.trim() : "",
  };
}

export async function createMemberOrganisation(
  input: OrganisationInput,
): Promise<MemberOrganisationsPayload> {
  const pool = getPool();
  const id = `org-${randomUUID().slice(0, 8)}`;

  if (!pool) {
    getMemoryStore().set(id, { id, ...input, createdAt: new Date().toISOString() });
    return listMemberOrganisations();
  }

  await ensureSchema();
  await pool.query(
    "INSERT INTO member_organisations (id, name, type, partner, notes) VALUES ($1, $2, $3, $4, $5)",
    [id, input.name, input.type, input.partner, input.notes],
  );

  return listMemberOrganisations();
}

export async function updateMemberOrganisation(
  id: string,
  input: OrganisationInput,
): Promise<MemberOrganisationsPayload | null> {
  const pool = getPool();

  if (!pool) {
    const store = getMemoryStore();
    const existing = store.get(id);

    if (!existing) {
      return null;
    }

    store.set(id, { ...existing, ...input });
    return listMemberOrganisations();
  }

  await ensureSchema();
  const result = await pool.query(
    "UPDATE member_organisations SET name = $2, type = $3, partner = $4, notes = $5 WHERE id = $1",
    [id, input.name, input.type, input.partner, input.notes],
  );

  if (result.rowCount === 0) {
    return null;
  }

  return listMemberOrganisations();
}

export async function deleteMemberOrganisation(
  id: string,
): Promise<MemberOrganisationsPayload | null> {
  const pool = getPool();

  if (!pool) {
    const store = getMemoryStore();

    if (!store.delete(id)) {
      return null;
    }

    return listMemberOrganisations();
  }

  await ensureSchema();
  const result = await pool.query("DELETE FROM member_organisations WHERE id = $1", [id]);

  if (result.rowCount === 0) {
    return null;
  }

  return listMemberOrganisations();
}

export { getJourneyPersistenceMode };
