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

export interface JourneyDocument {
  id: string;
  state: JourneyState;
  label: string;
  fileName: string;
  url: string;
  uploadedBy: JourneyActor;
  uploadedAt: string;
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
  documents: JourneyDocument[];
}

export type JourneyPersistence = "database" | "memory";

export type HelpResourceAudience = "seller" | "agent" | "both";
export type HelpResourceType = "video" | "article" | "guide";

export interface HelpResource {
  id: string;
  title: string;
  type: HelpResourceType;
  audience: HelpResourceAudience;
  description: string;
  durationMinutes?: number;
}

export interface AssociatedService {
  id: string;
  name: string;
  category: string;
  description: string;
  typicalCost: string;
}

export interface StageMeta {
  label: string;
  summary: string;
  accent: string;
  /** Longer explanation of what is happening right now, shown on the status view. */
  whatHappensNow: string;
  /** Actionable steps the seller/agent should complete to move forward. */
  whatYouNeedToDo: string[];
  /** Documents or files that should be uploaded to proceed, if any. */
  documentsNeeded: string[];
  /** A short, reassuring tip or answer to a common question at this stage. */
  helpTip: string;
  /** Videos, articles, and guides relevant to this stage, tagged by intended audience. */
  helpResources: HelpResource[];
  /** Add-on services an agent can offer, or a seller can ask about, at this stage. */
  associatedServices: AssociatedService[];
}

export const stateMeta: Record<JourneyState, StageMeta> = {
  intake: {
    label: "Seller Intake",
    summary: "Collect address, goals, and timing so the sale plan starts with context.",
    accent: "#144a44",
    whatHappensNow:
      "We're gathering the essentials about your property and your goals. Once this is complete, we'll match you with local agents suited to your property.",
    whatYouNeedToDo: [
      "Confirm your property address and ownership details",
      "Share your ideal sale timeframe",
      "Tell us your target price range",
    ],
    documentsNeeded: [
      "Proof of ownership (title or rates notice)",
      "Recent photos of the property (optional but helpful)",
    ],
    helpTip:
      "Not sure about pricing yet? A rough range is fine — your agent will help refine it during preparation.",
    helpResources: [
      {
        id: "intake-agent-compliance",
        title: "Running a compliant intake call",
        type: "video",
        audience: "agent",
        durationMinutes: 4,
        description:
          "Required disclosures, note-taking, and CRM record keeping for a new seller intake, so the file is audit-ready from day one.",
      },
      {
        id: "intake-seller-expect",
        title: "What to expect during intake",
        type: "article",
        audience: "both",
        description: "A short guide to the information we ask for at this stage and why it speeds up matching.",
      },
    ],
    associatedServices: [
      {
        id: "svc-valuation",
        name: "Independent property valuation",
        category: "Valuation",
        description: "A formal valuation to sanity-check the seller's target price range before agent matching.",
        typicalCost: "$300 - $600",
      },
      {
        id: "svc-legal-pack",
        name: "Pre-sale legal pack",
        category: "Legal",
        description: "Title search and contract preparation started early so it's ready once an agent is appointed.",
        typicalCost: "$400 - $800",
      },
    ],
  },
  agent_matching: {
    label: "Agent Matching",
    summary: "Shortlist the best-fit local agents based on suburb, style, and sale goals.",
    accent: "#a85f2a",
    whatHappensNow:
      "We've shortlisted local agents based on your suburb, property type, and sale goals. Review the candidates and choose who will represent you.",
    whatYouNeedToDo: [
      "Review the recommended agents",
      "Interview your top one or two choices",
      "Appoint the agent you'd like to work with",
    ],
    documentsNeeded: [],
    helpTip:
      "Look for agents with strong recent sales in your suburb and a communication style that suits you.",
    helpResources: [
      {
        id: "matching-agent-disclosure",
        title: "Presenting a shortlist the right way",
        type: "video",
        audience: "agent",
        durationMinutes: 5,
        description:
          "Fee transparency, conflict-of-interest disclosure, and how to present comparative market data fairly.",
      },
      {
        id: "matching-seller-compare",
        title: "How to compare agents",
        type: "article",
        audience: "both",
        description: "Questions worth asking in an agent interview, and what strong local performance looks like.",
      },
    ],
    associatedServices: [
      {
        id: "svc-cma",
        name: "Comparative market analysis",
        category: "Research",
        description: "A detailed report on recent comparable sales, prepared by the shortlisted agents.",
        typicalCost: "Usually free with a listing",
      },
    ],
  },
  agent_appointed: {
    label: "Agent Appointed",
    summary: "Confirm representation, authority, and the working cadence with the seller.",
    accent: "#0d5d81",
    whatHappensNow:
      "Your agent is confirmed. Next, they'll formalise the agency agreement and start planning your campaign.",
    whatYouNeedToDo: [
      "Sign the agency agreement",
      "Agree on the marketing plan and budget with your agent",
    ],
    documentsNeeded: ["Signed agency agreement", "Photo ID for contract verification"],
    helpTip:
      "Your agent will walk you through the agreement — ask about commission, marketing spend, and campaign length before signing.",
    helpResources: [
      {
        id: "appointed-agent-agreement",
        title: "Agency agreements: what must be disclosed",
        type: "video",
        audience: "agent",
        durationMinutes: 6,
        description:
          "Cooling-off periods, commission disclosure, and the property information statements required in your state before signing.",
      },
      {
        id: "appointed-seller-agreement",
        title: "Understanding your agency agreement",
        type: "article",
        audience: "both",
        description: "Plain-language walkthrough of the clauses sellers ask about most: commission, term, and exit.",
      },
    ],
    associatedServices: [
      {
        id: "svc-marketing-upgrade",
        name: "Marketing package upgrade",
        category: "Marketing",
        description: "Premium portal placement, print collateral, and social campaign add-ons for the agreement.",
        typicalCost: "$800 - $2,500",
      },
      {
        id: "svc-photography",
        name: "Professional photography",
        category: "Media",
        description: "Licensed photographer booking bundled into the marketing plan.",
        typicalCost: "$350 - $600",
      },
    ],
  },
  prep_in_progress: {
    label: "Sale Preparation",
    summary: "Coordinate styling, repairs, documents, photography, and launch readiness.",
    accent: "#7a3b7a",
    whatHappensNow:
      "Your agent is coordinating styling, repairs, photography, and paperwork to get your home launch-ready.",
    whatYouNeedToDo: [
      "Complete any agreed repairs or styling",
      "Provide access for photography and inspections",
      "Review and approve marketing copy and photos",
    ],
    documentsNeeded: [
      "Contract of sale / vendor disclosure statement",
      "Building and pest reports (if available)",
      "Approved floor plan (if available)",
    ],
    helpTip:
      "This is the stage where small presentation improvements tend to have the biggest impact on buyer interest.",
    helpResources: [
      {
        id: "prep-agent-compliance",
        title: "Running a compliant campaign prep",
        type: "video",
        audience: "agent",
        durationMinutes: 7,
        description:
          "Underquoting law, photography and access consent, and keeping a clean paper trail before you go live.",
      },
      {
        id: "prep-seller-ready",
        title: "Getting your home ready to list",
        type: "article",
        audience: "both",
        description: "A practical checklist for styling, minor repairs, and what buyers notice first.",
      },
    ],
    associatedServices: [
      {
        id: "svc-styling",
        name: "Styling / home staging",
        category: "Presentation",
        description: "Furniture and styling hire to present the property at its best for photography and inspections.",
        typicalCost: "$1,500 - $4,000",
      },
      {
        id: "svc-inspection",
        name: "Pre-sale building & pest inspection",
        category: "Inspection",
        description: "An upfront report so surprises don't stall negotiations later.",
        typicalCost: "$400 - $700",
      },
      {
        id: "svc-repairs",
        name: "Minor repairs & handyman",
        category: "Trades",
        description: "Small fixes — touch-up paint, loose fittings, garden tidy — before photography day.",
        typicalCost: "Varies by scope",
      },
    ],
  },
  ready_for_listing: {
    label: "Ready To List",
    summary: "Everything is approved and ready to push to the public portals.",
    accent: "#23613e",
    whatHappensNow:
      "Everything is prepared and approved. We're ready to publish your listing to the public portals.",
    whatYouNeedToDo: [
      "Give final sign-off on listing copy, photos, and price guide",
      "Confirm inspection times",
    ],
    documentsNeeded: [],
    helpTip:
      "Once live, your listing syncs automatically across connected portals — no manual re-entry needed.",
    helpResources: [
      {
        id: "ready-agent-check",
        title: "Pre-launch compliance check",
        type: "video",
        audience: "agent",
        durationMinutes: 3,
        description: "Final price guide accuracy check and confirming disclosure documents are attached before launch.",
      },
      {
        id: "ready-seller-signoff",
        title: "Final sign-off checklist explained",
        type: "article",
        audience: "both",
        description: "What you're approving in the final review, and how to request a last-minute change.",
      },
    ],
    associatedServices: [
      {
        id: "svc-portal-upgrade",
        name: "Premium portal placement",
        category: "Marketing",
        description: "Featured or highlighted placement on major listing portals for launch week.",
        typicalCost: "$300 - $900",
      },
      {
        id: "svc-signboard",
        name: "Signboard & print collateral",
        category: "Marketing",
        description: "Street signage and printed brochures for inspections.",
        typicalCost: "$150 - $400",
      },
    ],
  },
  live_on_portals: {
    label: "Live On Portals",
    summary: "The property is active, visible, and synchronised across listing destinations.",
    accent: "#8b2e3a",
    whatHappensNow:
      "Your property is live and visible to buyers. Your agent is running inspections and following up on enquiries.",
    whatYouNeedToDo: [
      "Track enquiries and inspection attendance with your agent",
      "Review buyer feedback as it comes in",
    ],
    documentsNeeded: [],
    helpTip:
      "Ask your agent for a weekly campaign report so you can track enquiry volume and buyer sentiment.",
    helpResources: [
      {
        id: "live-agent-offers",
        title: "Handling enquiries and offers by the book",
        type: "video",
        audience: "agent",
        durationMinutes: 6,
        description:
          "Fair trading obligations for presenting all offers to the seller and keeping a compliant record of enquiries.",
      },
      {
        id: "live-seller-expect",
        title: "What happens once you're live",
        type: "article",
        audience: "both",
        description: "How inspections, enquiries, and feedback typically flow during an active campaign.",
      },
    ],
    associatedServices: [
      {
        id: "svc-social-boost",
        name: "Social media campaign boost",
        category: "Marketing",
        description: "Paid social promotion to extend reach beyond the portals during the live campaign.",
        typicalCost: "$200 - $600",
      },
      {
        id: "svc-drone",
        name: "Virtual tour / drone video",
        category: "Media",
        description: "A walkthrough video or aerial footage to support online listings.",
        typicalCost: "$400 - $900",
      },
    ],
  },
  under_offer: {
    label: "Under Offer",
    summary: "Buyer negotiations are underway and the campaign shifts into closing mode.",
    accent: "#5b4c12",
    whatHappensNow:
      "A buyer has made an offer and negotiations are underway. The campaign is moving toward closing.",
    whatYouNeedToDo: [
      "Review and respond to offer terms",
      "Confirm the buyer's finance and conditions",
      "Instruct your solicitor or conveyancer",
    ],
    documentsNeeded: ["Signed contract of sale (once accepted)", "Solicitor or conveyancer details"],
    helpTip: "If the offer falls through, the campaign can return to market at any time — nothing is lost.",
    helpResources: [
      {
        id: "offer-agent-conditions",
        title: "Managing offers and contract conditions compliantly",
        type: "video",
        audience: "agent",
        durationMinutes: 8,
        description:
          "Cooling-off periods, special conditions, and finance clauses — what to check before a contract is signed.",
      },
      {
        id: "offer-seller-process",
        title: "Understanding the offer and contract process",
        type: "article",
        audience: "both",
        description: "What each contract condition means and typical timeframes to settlement.",
      },
    ],
    associatedServices: [
      {
        id: "svc-conveyancing",
        name: "Conveyancing / settlement agent",
        category: "Legal",
        description: "Manages the legal transfer of ownership through to settlement.",
        typicalCost: "$800 - $1,500",
      },
      {
        id: "svc-compliance-cert",
        name: "Building compliance certificate",
        category: "Legal",
        description: "Certificate confirming any structures on the property meet approval requirements.",
        typicalCost: "$200 - $500",
      },
    ],
  },
  settled: {
    label: "Settled",
    summary: "The sale is complete and the seller journey is archived.",
    accent: "#1d2533",
    whatHappensNow:
      "Congratulations — the sale is complete and settlement has occurred. Your seller journey is now archived.",
    whatYouNeedToDo: ["Confirm receipt of settlement funds", "Hand over keys and property access"],
    documentsNeeded: [],
    helpTip: "You can revisit your full activity history any time from this page.",
    helpResources: [
      {
        id: "settled-agent-records",
        title: "Post-settlement compliance and record retention",
        type: "video",
        audience: "agent",
        durationMinutes: 3,
        description: "What must be retained on file after settlement and for how long, per your state's requirements.",
      },
      {
        id: "settled-seller-next",
        title: "What happens after settlement",
        type: "article",
        audience: "both",
        description: "Key hand-over steps: keys, utilities, and final funds disbursement.",
      },
    ],
    associatedServices: [
      {
        id: "svc-removalist",
        name: "Moving & removalist referral",
        category: "Moving",
        description: "Vetted removalist partners for moving day.",
        typicalCost: "Quoted directly by provider",
      },
      {
        id: "svc-utilities",
        name: "Utility connection concierge",
        category: "Moving",
        description: "Free service to transfer or disconnect electricity, gas, and internet.",
        typicalCost: "Free",
      },
    ],
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
  documents: [],
};

export function cloneSampleJourney(): SellerJourney {
  return {
    ...sampleJourney,
    timeline: sampleJourney.timeline.map((entry) => ({ ...entry })),
    checklist: sampleJourney.checklist.map((item) => ({ ...item })),
    agentCandidates: sampleJourney.agentCandidates.map((candidate) => ({
      ...candidate,
    })),
    documents: sampleJourney.documents.map((document) => ({ ...document })),
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
