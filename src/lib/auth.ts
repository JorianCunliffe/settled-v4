import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { Pool, type PoolClient } from "pg";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  about?: string;
}

export interface SignupInput {
  name: string;
  email: string;
  password: string;
  termsAccepted: boolean;
}

export interface ProfileInput {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  about?: string;
}

type StoredUser = AuthUser & {
  passwordHash: string;
  termsAccepted: boolean;
  createdAt: string;
  updatedAt: string;
};

type UserRow = {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  terms_accepted: boolean;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  about: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

declare global {
  var authPool: Pool | undefined;
  var authSchemaReady: boolean | undefined;
  var authMemoryStore: StoredUser[] | undefined;
}

const tokenMaxAgeMs = 60 * 60 * 1000;

function getConnectionString(): string | null {
  return (
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    null
  );
}

function getSecret() {
  return process.env.JWT_SECRET ?? process.env.AUTH_SECRET ?? "settled-dev-secret";
}

function getPool(): Pool | null {
  const connectionString = getConnectionString();

  if (!connectionString) {
    return null;
  }

  if (!globalThis.authPool) {
    globalThis.authPool = new Pool({
      connectionString,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : undefined,
    });
  }

  return globalThis.authPool;
}

async function ensureSchema(client: PoolClient) {
  if (globalThis.authSchemaReady) {
    return;
  }

  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
      first_name TEXT NULL,
      last_name TEXT NULL,
      phone_number TEXT NULL,
      about TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  globalThis.authSchemaReady = true;
}

function getMemoryStore() {
  if (!globalThis.authMemoryStore) {
    globalThis.authMemoryStore = [];
  }

  return globalThis.authMemoryStore;
}

function toPublicUser(user: StoredUser): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phoneNumber: user.phoneNumber,
    about: user.about,
  };
}

function hydrateRow(row: UserRow): StoredUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    termsAccepted: row.terms_accepted,
    firstName: row.first_name ?? undefined,
    lastName: row.last_name ?? undefined,
    phoneNumber: row.phone_number ?? undefined,
    about: row.about ?? undefined,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at).toISOString(),
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : new Date(row.updated_at).toISOString(),
  };
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password: string, passwordHash: string) {
  const [algorithm, salt, storedHash] = passwordHash.split(":");

  if (algorithm !== "scrypt" || !salt || !storedHash) {
    return false;
  }

  const candidate = Buffer.from(scryptSync(password, salt, 64).toString("hex"), "hex");
  const stored = Buffer.from(storedHash, "hex");

  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}

function base64Url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signPayload(payload: string) {
  return base64Url(createHmac("sha256", getSecret()).update(payload).digest());
}

export function createAuthToken(userId: number) {
  const payload = base64Url(
    JSON.stringify({
      exp: Date.now() + tokenMaxAgeMs,
      sub: userId,
    }),
  );
  return `${payload}.${signPayload(payload)}`;
}

export function verifyAuthToken(token: string | null): number | null {
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split(".");

  if (!payload || !signature || signPayload(payload) !== signature) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      exp?: number;
      sub?: number;
    };

    if (!decoded.sub || !decoded.exp || decoded.exp < Date.now()) {
      return null;
    }

    return decoded.sub;
  } catch {
    return null;
  }
}

export function getBearerToken(header: string | null) {
  const [scheme, token] = header?.split(" ") ?? [];
  return scheme?.toLowerCase() === "bearer" ? token : null;
}

async function findUserByEmail(email: string): Promise<StoredUser | null> {
  const pool = getPool();

  if (!pool) {
    return (
      getMemoryStore().find(
        (user) => user.email.toLowerCase() === email.toLowerCase(),
      ) ?? null
    );
  }

  const client = await pool.connect();

  try {
    await ensureSchema(client);
    const result = await client.query<UserRow>(
      "SELECT * FROM users WHERE lower(email) = lower($1)",
      [email],
    );
    return result.rows[0] ? hydrateRow(result.rows[0]) : null;
  } finally {
    client.release();
  }
}

export async function findUserById(id: number): Promise<AuthUser | null> {
  const pool = getPool();

  if (!pool) {
    const user = getMemoryStore().find((item) => item.id === id);
    return user ? toPublicUser(user) : null;
  }

  const client = await pool.connect();

  try {
    await ensureSchema(client);
    const result = await client.query<UserRow>("SELECT * FROM users WHERE id = $1", [
      id,
    ]);
    return result.rows[0] ? toPublicUser(hydrateRow(result.rows[0])) : null;
  } finally {
    client.release();
  }
}

export async function signup(input: SignupInput): Promise<AuthUser> {
  const existingUser = await findUserByEmail(input.email);

  if (existingUser) {
    throw new Error("User already exists");
  }

  if (!input.termsAccepted) {
    throw new Error("You must accept the terms and conditions");
  }

  const pool = getPool();
  const passwordHash = hashPassword(input.password);

  if (!pool) {
    const store = getMemoryStore();
    const now = new Date().toISOString();
    const user: StoredUser = {
      id: store.reduce((highest, item) => Math.max(highest, item.id), 0) + 1,
      name: input.name,
      email: input.email,
      passwordHash,
      termsAccepted: input.termsAccepted,
      createdAt: now,
      updatedAt: now,
    };

    store.push(user);
    return toPublicUser(user);
  }

  const client = await pool.connect();

  try {
    await ensureSchema(client);
    const result = await client.query<UserRow>(
      `
        INSERT INTO users (name, email, password_hash, terms_accepted)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
      [input.name, input.email, passwordHash, input.termsAccepted],
    );
    return toPublicUser(hydrateRow(result.rows[0]));
  } finally {
    client.release();
  }
}

export async function login(email: string, password: string) {
  const user = await findUserByEmail(email);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new Error("Invalid credentials");
  }

  return {
    token: createAuthToken(user.id),
    user: toPublicUser(user),
  };
}

export async function updateProfile(
  userId: number,
  input: ProfileInput,
): Promise<AuthUser | null> {
  const pool = getPool();

  if (!pool) {
    const store = getMemoryStore();
    const index = store.findIndex((user) => user.id === userId);

    if (index === -1) {
      return null;
    }

    store[index] = {
      ...store[index],
      ...input,
      updatedAt: new Date().toISOString(),
    };

    return toPublicUser(store[index]);
  }

  const client = await pool.connect();

  try {
    await ensureSchema(client);
    const result = await client.query<UserRow>(
      `
        UPDATE users
        SET
          first_name = $2,
          last_name = $3,
          phone_number = $4,
          about = $5,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [
        userId,
        input.firstName ?? "",
        input.lastName ?? "",
        input.phoneNumber ?? "",
        input.about ?? "",
      ],
    );

    return result.rows[0] ? toPublicUser(hydrateRow(result.rows[0])) : null;
  } finally {
    client.release();
  }
}
