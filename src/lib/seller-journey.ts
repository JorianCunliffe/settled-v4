export type JourneyActor = "seller" | "agent" | "coordinator";

export type JourneyState =
  | "intake"
  | "agent_matching"
  | "agent_appointed"
  | "prep_in_progress"
  | "ready_for_listing"
  | "live_on_portals"
  | "under_offer"
  | "settled";

export interface TransitionOption {
  to: JourneyState;
  actor: JourneyActor;
  label: string;
  detail: string;
}

export interface TimelineEntry {
  at: string;
  actor: JourneyActor;
  from: JourneyState | null;
  to: JourneyState;
  note: string;
}

export interface ChecklistItem {
  title: string;
  owner: JourneyActor;
  done: boolean;
}

export interface AgentCandidate {
  id: string;
  name: string;
  suburb: string;
  specialty: string;
  rating: number;
}

export interface SellerJourney {
  id: string;
  propertyAddress: string;
  sellerName: string;
  targetPrice: string;
  currentState: JourneyState;
  timeline: TimelineEntry[];
  checklist: ChecklistItem[];
  agentCandidates: AgentCandidate[];
}

export type JourneyPersistence = "database" | "memory";

export const stateMeta: Record<
  JourneyState,
  { label: string; summary: string; accent: string }
> = {
  intake: {
    label: "Seller Intake",
    summary: "Collect address, goals, and timing so the sale plan starts with context.",
    accent: "#144a44",
  },
  agent_matching: {
    label: "Agent Matching",
    summary: "Shortlist the best-fit local agents based on suburb, style, and sale goals.",
    accent: "#a85f2a",
  },
  agent_appointed: {
    label: "Agent Appointed",
    summary: "Confirm representation, authority, and the working cadence with the seller.",
    accent: "#0d5d81",
  },
  prep_in_progress: {
    label: "Sale Preparation",
    summary: "Coordinate styling, repairs, documents, photography, and launch readiness.",
    accent: "#7a3b7a",
  },
  ready_for_listing: {
    label: "Ready To List",
    summary: "Everything is approved and ready to push to the public portals.",
    accent: "#23613e",
  },
  live_on_portals: {
    label: "Live On Portals",
    summary: "The property is active, visible, and synchronised across listing destinations.",
    accent: "#8b2e3a",
  },
  under_offer: {
    label: "Under Offer",
    summary: "Buyer negotiations are underway and the campaign shifts into closing mode.",
    accent: "#5b4c12",
  },
  settled: {
    label: "Settled",
    summary: "The sale is complete and the seller journey is archived.",
    accent: "#1d2533",
  },
};

export const journeyStates: JourneyState[] = [
  "intake",
  "agent_matching",
  "agent_appointed",
  "prep_in_progress",
  "ready_for_listing",
  "live_on_portals",
  "under_offer",
  "settled",
];

const transitionMap: Record<JourneyState, TransitionOption[]> = {
  intake: [
    {
      to: "agent_matching",
      actor: "coordinator",
      label: "Start matching",
      detail: "Move the seller into shortlist generation and agent outreach.",
    },
  ],
  agent_matching: [
    {
      to: "intake",
      actor: "coordinator",
      label: "Re-open intake",
      detail: "Gather missing seller context before recommending agents.",
    },
    {
      to: "agent_appointed",
      actor: "seller",
      label: "Appoint agent",
      detail: "The seller confirms who will represent the property.",
    },
  ],
  agent_appointed: [
    {
      to: "prep_in_progress",
      actor: "agent",
      label: "Kick off preparation",
      detail: "Activate launch tasks, trades, media, and compliance work.",
    },
  ],
  prep_in_progress: [
    {
      to: "ready_for_listing",
      actor: "agent",
      label: "Mark ready",
      detail: "All launch prerequisites are complete and approved.",
    },
  ],
  ready_for_listing: [
    {
      to: "live_on_portals",
      actor: "coordinator",
      label: "Push live",
      detail: "Syndicate the approved listing across portal channels.",
    },
  ],
  live_on_portals: [
    {
      to: "under_offer",
      actor: "agent",
      label: "Record offer",
      detail: "The campaign advances once an offer is accepted.",
    },
  ],
  under_offer: [
    {
      to: "live_on_portals",
      actor: "agent",
      label: "Return to market",
      detail: "Resume campaign syndication if the offer falls over.",
    },
    {
      to: "settled",
      actor: "coordinator",
      label: "Complete settlement",
      detail: "Archive the journey once the transaction closes.",
    },
  ],
  settled: [],
};

export const sampleJourney: SellerJourney = {
  id: "journey-pad-001",
  propertyAddress: "18 Cavendish Street, Coorparoo QLD",
  sellerName: "Jordan Lee",
  targetPrice: "$1.62M - $1.75M",
  currentState: "agent_matching",
  timeline: [
    {
      at: "2026-06-25T08:30:00.000Z",
      actor: "seller",
      from: null,
      to: "intake",
      note: "Seller created their sale plan and shared timing goals.",
    },
    {
      at: "2026-06-25T09:10:00.000Z",
      actor: "coordinator",
      from: "intake",
      to: "agent_matching",
      note: "The concierge generated a shortlist of agents with local performance data.",
    },
  ],
  checklist: [
    { title: "Confirm motivation, timeframe, and reserve expectations", owner: "seller", done: true },
    { title: "Compare shortlist conversion rates by suburb and property type", owner: "coordinator", done: true },
    { title: "Seller interviews top two agents", owner: "seller", done: false },
    { title: "Book styling and pre-listing maintenance", owner: "agent", done: false },
    { title: "Gather contract, disclosures, and photography brief", owner: "agent", done: false },
  ],
  agentCandidates: [
    {
      id: "agent-ash",
      name: "Ash Morgan",
      suburb: "Coorparoo",
      specialty: "Character homes and premium family stock",
      rating: 4.9,
    },
    {
      id: "agent-rina",
      name: "Rina Patel",
      suburb: "Greenslopes",
      specialty: "Fast campaign turnaround and vendor communications",
      rating: 4.8,
    },
    {
      id: "agent-luke",
      name: "Luke Chen",
      suburb: "Camp Hill",
      specialty: "Data-led pricing strategy and auction positioning",
      rating: 4.7,
    },
  ],
};

export function cloneSampleJourney(): SellerJourney {
  return {
    ...sampleJourney,
    timeline: sampleJourney.timeline.map((entry) => ({ ...entry })),
    checklist: sampleJourney.checklist.map((item) => ({ ...item })),
    agentCandidates: sampleJourney.agentCandidates.map((candidate) => ({
      ...candidate,
    })),
  };
}

export function getAvailableTransitions(
  state: JourneyState,
  actor?: JourneyActor,
): TransitionOption[] {
  const options = transitionMap[state] ?? [];
  return actor ? options.filter((option) => option.actor === actor) : options;
}

export function canTransition(
  from: JourneyState,
  to: JourneyState,
  actor: JourneyActor,
): boolean {
  return getAvailableTransitions(from, actor).some((option) => option.to === to);
}

export function transitionJourney(params: {
  journey: SellerJourney;
  to: JourneyState;
  actor: JourneyActor;
  note?: string;
}): SellerJourney {
  const { journey, to, actor, note } = params;

  if (!canTransition(journey.currentState, to, actor)) {
    throw new Error(
      `Invalid transition from ${journey.currentState} to ${to} for ${actor}.`,
    );
  }

  return {
    ...journey,
    currentState: to,
    timeline: [
      ...journey.timeline,
      {
        at: new Date().toISOString(),
        actor,
        from: journey.currentState,
        to,
        note: note ?? `${actor} advanced the property to ${stateMeta[to].label}.`,
      },
    ],
  };
}
