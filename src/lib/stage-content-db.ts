import {
  journeyStates,
  stateMeta,
  type AssociatedService,
  type ChecklistTemplateItem,
  type JourneyActor,
  type JourneyPersistence,
  type JourneyState,
  type ServiceVendor,
  type StageHelpGuide,
  type StageHelpVideo,
  type StageMeta,
} from "@/lib/seller-journey";
import { getJourneyPersistenceMode, getPool } from "@/lib/seller-journey-db";

declare global {
  var stageContentMemoryStore: Map<JourneyState, StageMeta> | undefined;
  var stageContentSchemaReady: boolean | undefined;
}

export interface StageContentPayload {
  content: Record<JourneyState, StageMeta>;
  overridden: JourneyState[];
  persistence: JourneyPersistence;
}

function cloneMeta(meta: StageMeta): StageMeta {
  return JSON.parse(JSON.stringify(meta)) as StageMeta;
}

function getMemoryStore() {
  if (!globalThis.stageContentMemoryStore) {
    globalThis.stageContentMemoryStore = new Map();
  }

  return globalThis.stageContentMemoryStore;
}

async function ensureSchema() {
  const pool = getPool();

  if (!pool || globalThis.stageContentSchemaReady) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS stage_content (
      state TEXT PRIMARY KEY,
      content JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  globalThis.stageContentSchemaReady = true;
}

async function loadOverrides(): Promise<Map<JourneyState, StageMeta>> {
  const pool = getPool();

  if (!pool) {
    return new Map(getMemoryStore());
  }

  await ensureSchema();
  const result = await pool.query<{ state: JourneyState; content: StageMeta }>(
    "SELECT state, content FROM stage_content",
  );

  return new Map(result.rows.map((row) => [row.state, row.content]));
}

export async function loadStageContent(): Promise<StageContentPayload> {
  const overrides = await loadOverrides();
  const content = {} as Record<JourneyState, StageMeta>;

  for (const state of journeyStates) {
    const override = overrides.get(state);
    content[state] = override ? cloneMeta(override) : cloneMeta(stateMeta[state]);
  }

  return {
    content,
    overridden: journeyStates.filter((state) => overrides.has(state)),
    persistence: getJourneyPersistenceMode(),
  };
}

export async function saveStageContent(
  state: JourneyState,
  content: StageMeta,
): Promise<StageContentPayload> {
  const pool = getPool();

  if (!pool) {
    getMemoryStore().set(state, cloneMeta(content));
    return loadStageContent();
  }

  await ensureSchema();
  await pool.query(
    `
      INSERT INTO stage_content (state, content, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (state) DO UPDATE SET content = $2::jsonb, updated_at = NOW()
    `,
    [state, JSON.stringify(content)],
  );

  return loadStageContent();
}

export async function resetStageContent(state: JourneyState): Promise<StageContentPayload> {
  const pool = getPool();

  if (!pool) {
    getMemoryStore().delete(state);
    return loadStageContent();
  }

  await ensureSchema();
  await pool.query("DELETE FROM stage_content WHERE state = $1", [state]);

  return loadStageContent();
}

export function isJourneyState(value: unknown): value is JourneyState {
  return typeof value === "string" && (journeyStates as string[]).includes(value);
}

export interface VendorLookup {
  vendor: ServiceVendor;
  service: AssociatedService;
  state: JourneyState;
  stageLabel: string;
}

/** Finds a vendor across all steps' configured services. */
export async function findVendorById(vendorId: string): Promise<VendorLookup | null> {
  const { content } = await loadStageContent();

  for (const state of journeyStates) {
    for (const service of content[state].associatedServices) {
      const vendor = service.vendors.find((candidate) => candidate.id === vendorId);

      if (vendor) {
        return { vendor, service, state, stageLabel: content[state].label };
      }
    }
  }

  return null;
}

const journeyActors: JourneyActor[] = ["seller", "agent", "coordinator"];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function asActor(value: unknown): JourneyActor | null {
  return journeyActors.includes(value as JourneyActor) ? (value as JourneyActor) : null;
}

/**
 * Validates admin-supplied stage content and returns a normalised StageMeta,
 * or a human-readable error string.
 */
export function validateStageContent(input: unknown): StageMeta | string {
  if (typeof input !== "object" || input === null) {
    return "Stage content must be an object.";
  }

  const raw = input as Record<string, unknown>;

  for (const field of ["label", "summary", "accent", "whatHappensNow", "helpTip"] as const) {
    if (!isNonEmptyString(raw[field])) {
      return `"${field}" is required and must be a non-empty string.`;
    }
  }

  if (!Array.isArray(raw.documentsNeeded) || !raw.documentsNeeded.every(isNonEmptyString)) {
    return '"documentsNeeded" must be an array of non-empty strings.';
  }

  if (!Array.isArray(raw.checklist)) {
    return '"checklist" must be an array.';
  }

  const checklist: ChecklistTemplateItem[] = [];
  for (const item of raw.checklist) {
    const entry = item as Record<string, unknown>;
    const owner = asActor(entry?.owner);
    if (!isNonEmptyString(entry?.title) || !owner) {
      return 'Each checklist item needs a non-empty "title" and an "owner" of seller, agent, or coordinator.';
    }
    checklist.push({ title: entry.title as string, owner });
  }

  const video = raw.helpVideo as Record<string, unknown> | undefined;
  if (
    !video ||
    !isNonEmptyString(video.title) ||
    !isNonEmptyString(video.description) ||
    !isNonEmptyString(video.url) ||
    typeof video.durationMinutes !== "number" ||
    !Number.isFinite(video.durationMinutes) ||
    video.durationMinutes <= 0 ||
    !isOptionalString(video.agentNotes)
  ) {
    return '"helpVideo" needs title, description, url, and a positive durationMinutes.';
  }

  const guide = raw.helpGuide as Record<string, unknown> | undefined;
  if (
    !guide ||
    !isNonEmptyString(guide.title) ||
    !isNonEmptyString(guide.description) ||
    !isNonEmptyString(guide.url) ||
    !isOptionalString(guide.agentNotes)
  ) {
    return '"helpGuide" needs title, description, and url.';
  }

  if (!Array.isArray(raw.associatedServices)) {
    return '"associatedServices" must be an array.';
  }

  const services: AssociatedService[] = [];
  for (const item of raw.associatedServices) {
    const service = item as Record<string, unknown>;
    if (
      !isNonEmptyString(service?.id) ||
      !isNonEmptyString(service?.name) ||
      !isNonEmptyString(service?.category) ||
      !isNonEmptyString(service?.description) ||
      !isNonEmptyString(service?.typicalCost) ||
      !Array.isArray(service?.vendors)
    ) {
      return 'Each service needs id, name, category, description, typicalCost, and a "vendors" array.';
    }

    const vendors: ServiceVendor[] = [];
    for (const rawVendor of service.vendors) {
      const vendor = rawVendor as Record<string, unknown>;
      if (
        !isNonEmptyString(vendor?.id) ||
        !isNonEmptyString(vendor?.name) ||
        !isNonEmptyString(vendor?.blurb) ||
        typeof vendor?.rating !== "number" ||
        !Number.isFinite(vendor.rating) ||
        vendor.rating < 0 ||
        vendor.rating > 5 ||
        !isOptionalString(vendor?.url)
      ) {
        return 'Each vendor needs id, name, blurb, a rating between 0 and 5, and optionally a url.';
      }
      vendors.push({
        id: vendor.id as string,
        name: vendor.name as string,
        blurb: vendor.blurb as string,
        rating: vendor.rating,
        ...(isNonEmptyString(vendor.url) ? { url: vendor.url } : {}),
      });
    }

    services.push({
      id: service.id as string,
      name: service.name as string,
      category: service.category as string,
      description: service.description as string,
      typicalCost: service.typicalCost as string,
      vendors,
    });
  }

  const helpVideo: StageHelpVideo = {
    title: video.title as string,
    description: video.description as string,
    url: video.url as string,
    durationMinutes: video.durationMinutes,
    ...(isNonEmptyString(video.agentNotes) ? { agentNotes: video.agentNotes } : {}),
  };

  const helpGuide: StageHelpGuide = {
    title: guide.title as string,
    description: guide.description as string,
    url: guide.url as string,
    ...(isNonEmptyString(guide.agentNotes) ? { agentNotes: guide.agentNotes } : {}),
  };

  return {
    label: raw.label as string,
    summary: raw.summary as string,
    accent: raw.accent as string,
    whatHappensNow: raw.whatHappensNow as string,
    helpTip: raw.helpTip as string,
    documentsNeeded: raw.documentsNeeded as string[],
    checklist,
    helpVideo,
    helpGuide,
    associatedServices: services,
  };
}
