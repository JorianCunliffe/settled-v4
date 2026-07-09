import { randomUUID } from "crypto";
import { listMemberOrganisations } from "@/lib/member-organisations-db";
import { getPool } from "@/lib/seller-journey-db";
import type { Entitlement, SessionUser, UserRole } from "@/lib/session";

export interface StoredUser {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  organisationId: string | null;
  subscriptionStatus: "none" | "active";
  createdAt: string;
}

declare global {
  var usersMemoryStore: Map<string, StoredUser> | undefined;
  var usersSchemaReady: boolean | undefined;
}

type UserRow = {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  organisation_id: string | null;
  subscription_status: "none" | "active";
  created_at: Date | string;
};

function getMemoryStore() {
  if (!globalThis.usersMemoryStore) {
    globalThis.usersMemoryStore = new Map();
  }

  return globalThis.usersMemoryStore;
}

async function ensureSchema() {
  const pool = getPool();

  if (!pool || globalThis.usersSchemaReady) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'seller',
      organisation_id TEXT NULL,
      subscription_status TEXT NOT NULL DEFAULT 'none',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  globalThis.usersSchemaReady = true;
}

function hydrateRow(row: UserRow): StoredUser {
  return {
    id: row.id,
    phone: row.phone,
    name: row.name,
    role: row.role,
    organisationId: row.organisation_id,
    subscriptionStatus: row.subscription_status,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at).toISOString(),
  };
}

function getInitialRole(phone: string): UserRole {
  const adminPhones = (process.env.ADMIN_PHONES ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return adminPhones.includes(phone) ? "admin" : "seller";
}

/**
 * Finds or creates the user for a verified phone number. Profile fields are
 * applied on first sign-in and whenever provided on later sign-ins.
 */
export async function upsertUserByPhone(params: {
  phone: string;
  name?: string;
  organisationId?: string | null;
}): Promise<StoredUser> {
  const pool = getPool();
  const { phone } = params;

  if (!pool) {
    const store = getMemoryStore();
    const existing = store.get(phone);

    if (existing) {
      const next: StoredUser = {
        ...existing,
        name: params.name?.trim() || existing.name,
        organisationId:
          params.organisationId !== undefined ? params.organisationId : existing.organisationId,
      };
      store.set(phone, next);
      return next;
    }

    const created: StoredUser = {
      id: randomUUID(),
      phone,
      name: params.name?.trim() ?? "",
      role: getInitialRole(phone),
      organisationId: params.organisationId ?? null,
      subscriptionStatus: "none",
      createdAt: new Date().toISOString(),
    };
    store.set(phone, created);
    return created;
  }

  await ensureSchema();

  const existing = await pool.query<UserRow>("SELECT * FROM users WHERE phone = $1", [phone]);
  const row = existing.rows[0];

  if (row) {
    const updated = await pool.query<UserRow>(
      `
        UPDATE users
        SET
          name = COALESCE(NULLIF($2, ''), name),
          organisation_id = CASE WHEN $3::boolean THEN $4 ELSE organisation_id END
        WHERE phone = $1
        RETURNING *
      `,
      [phone, params.name?.trim() ?? "", params.organisationId !== undefined, params.organisationId ?? null],
    );
    return hydrateRow(updated.rows[0]);
  }

  const created = await pool.query<UserRow>(
    `
      INSERT INTO users (id, phone, name, role, organisation_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
    [randomUUID(), phone, params.name?.trim() ?? "", getInitialRole(phone), params.organisationId ?? null],
  );
  return hydrateRow(created.rows[0]);
}

/**
 * Computes access: partner-organisation members are entitled outright;
 * everyone else needs the $99/month subscription (Stripe integration pending).
 */
export async function buildSessionUser(user: StoredUser): Promise<SessionUser> {
  let entitlement: Entitlement = user.subscriptionStatus === "active" ? "subscribed" : "payment_required";
  let organisationName: string | null = null;

  if (user.organisationId) {
    const { organisations } = await listMemberOrganisations();
    const organisation = organisations.find((org) => org.id === user.organisationId);

    if (organisation) {
      organisationName = organisation.name;

      if (organisation.partner) {
        entitlement = "partner";
      }
    }
  }

  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    role: user.role,
    organisationId: user.organisationId,
    organisationName,
    entitlement,
  };
}
