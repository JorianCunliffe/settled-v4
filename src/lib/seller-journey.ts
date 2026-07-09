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
  /** The journey step this task belongs to. */
  state: JourneyState;
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

export interface StageHelpVideo {
  title: string;
  durationMinutes: number;
  description: string;
  /** Playable video source. Currently a shared placeholder until per-step videos are produced. */
  url: string;
  /** Extra by-the-book guidance shown only to agents. */
  agentNotes?: string;
}

/** Shared placeholder until real per-step help videos are produced. */
export const helpVideoPlaceholderUrl = "/videos/help-placeholder.mp4";

export interface StageHelpGuide {
  title: string;
  description: string;
  /** Link to the guide document (PDF). Currently a shared placeholder until real guides are uploaded. */
  url: string;
  /** Extra by-the-book guidance shown only to agents. */
  agentNotes?: string;
}

/** Shared placeholder until real per-step guide documents are uploaded. */
export const helpGuidePlaceholderUrl = "/guides/help-guide-placeholder.pdf";

export interface ChecklistTemplateItem {
  title: string;
  owner: JourneyActor;
}

export interface ServiceVendor {
  id: string;
  name: string;
  rating: number;
  blurb: string;
  /**
   * Link to the vendor's page. Defaults to the internal stub profile at
   * /vendors/<id>; will point into the partner network once integrated.
   */
  url?: string;
}

/** Resolves a vendor's link, falling back to the internal stub profile page. */
export function getVendorUrl(vendor: ServiceVendor): string {
  return vendor.url ?? `/vendors/${vendor.id}`;
}

export interface AssociatedService {
  id: string;
  name: string;
  category: string;
  description: string;
  typicalCost: string;
  /** Vendors the seller and agent can choose between for this service. */
  vendors: ServiceVendor[];
}

export interface StageMeta {
  label: string;
  summary: string;
  accent: string;
  /** Longer explanation of what is happening right now, shown on the status view. */
  whatHappensNow: string;
  /** Documents or files that should be uploaded to proceed, if any. */
  documentsNeeded: string[];
  /** A short, reassuring tip or answer to a common question at this stage. */
  helpTip: string;
  /** The tasks to complete at this step. Done-state is tracked per journey. */
  checklist: ChecklistTemplateItem[];
  /** The help video for this step. Every step has one. */
  helpVideo: StageHelpVideo;
  /** The document guide for this step. Every step has one. */
  helpGuide: StageHelpGuide;
  /** Add-on services with vendor choices for this step. */
  associatedServices: AssociatedService[];
}

export const stateMeta: Record<JourneyState, StageMeta> = {
  intake: {
    label: "Seller Intake",
    summary: "Collect address, goals, and timing so the sale plan starts with context.",
    accent: "#144a44",
    whatHappensNow:
      "We're gathering the essentials about your property and your goals. Once this is complete, we'll match you with local agents suited to your property.",
    documentsNeeded: [
      "Proof of ownership (title or rates notice)",
      "Recent photos of the property (optional but helpful)",
    ],
    helpTip:
      "Not sure about pricing yet? A rough range is fine — your agent will help refine it during preparation.",
    checklist: [
      { title: "Confirm property address and ownership details", owner: "seller" },
      { title: "Share sale timeframe and target price range", owner: "seller" },
      { title: "Upload proof of ownership", owner: "seller" },
    ],
    helpVideo: {
      url: helpVideoPlaceholderUrl,
      title: "Getting started: your sale plan",
      durationMinutes: 4,
      description:
        "What happens during intake, the information we collect, and how it shapes your agent shortlist.",
      agentNotes:
        "Cover required disclosures, note-taking, and CRM record keeping so the file is audit-ready from day one.",
    },
    helpGuide: {
      url: helpGuidePlaceholderUrl,
      title: "Intake checklist guide",
      description:
        "A short document covering the details we ask for at this stage and why they speed up agent matching.",
      agentNotes: "Includes the intake compliance checklist to complete before moving to matching.",
    },
    associatedServices: [
      {
        id: "svc-valuation",
        name: "Independent property valuation",
        category: "Valuation",
        description: "A formal valuation to sanity-check the target price range before agent matching.",
        typicalCost: "$300 - $600",
        vendors: [
          { id: "val-opteon", name: "Opteon Valuers", rating: 4.8, blurb: "Fast turnaround, Brisbane-wide coverage.", url: "/vendors/val-opteon" },
          { id: "val-herron", name: "Herron Todd White", rating: 4.7, blurb: "Detailed reports accepted by all major lenders.", url: "/vendors/val-herron" },
        ],
      },
      {
        id: "svc-legal-pack",
        name: "Pre-sale legal pack",
        category: "Legal",
        description: "Title search and contract preparation started early so it's ready once an agent is appointed.",
        typicalCost: "$400 - $800",
        vendors: [
          { id: "leg-conveyworks", name: "ConveyWorks", rating: 4.9, blurb: "Fixed-fee packs with 48-hour turnaround.", url: "/vendors/leg-conveyworks" },
          { id: "leg-bne-property-law", name: "Brisbane Property Law", rating: 4.6, blurb: "Solicitor-led, good for complex titles.", url: "/vendors/leg-bne-property-law" },
        ],
      },
    ],
  },
  agent_matching: {
    label: "Agent Matching",
    summary: "Shortlist the best-fit local agents based on suburb, style, and sale goals.",
    accent: "#a85f2a",
    whatHappensNow:
      "We've shortlisted local agents based on your suburb, property type, and sale goals. Review the candidates and choose who will represent you.",
    documentsNeeded: [],
    helpTip:
      "Look for agents with strong recent sales in your suburb and a communication style that suits you.",
    checklist: [
      { title: "Review the recommended agents", owner: "seller" },
      { title: "Compare shortlist performance by suburb and property type", owner: "coordinator" },
      { title: "Interview your top two agents", owner: "seller" },
      { title: "Appoint your preferred agent", owner: "seller" },
    ],
    helpVideo: {
      url: helpVideoPlaceholderUrl,
      title: "Choosing the right agent",
      durationMinutes: 5,
      description:
        "What to look for in an agent interview, how to read local performance data, and the questions worth asking.",
      agentNotes:
        "Fee transparency, conflict-of-interest disclosure, and presenting comparative market data fairly.",
    },
    helpGuide: {
      url: helpGuidePlaceholderUrl,
      title: "Agent comparison guide",
      description:
        "A one-page worksheet for comparing shortlisted agents on results, fees, and communication style.",
    },
    associatedServices: [
      {
        id: "svc-cma",
        name: "Comparative market analysis",
        category: "Research",
        description: "A detailed report on recent comparable sales, prepared by the shortlisted agents.",
        typicalCost: "Usually free with a listing",
        vendors: [
          { id: "cma-shortlist", name: "Your shortlisted agents", rating: 4.8, blurb: "Each candidate prepares one as part of their pitch.", url: "/vendors/cma-shortlist" },
        ],
      },
    ],
  },
  agent_appointed: {
    label: "Agent Appointed",
    summary: "Confirm representation, authority, and the working cadence with the seller.",
    accent: "#0d5d81",
    whatHappensNow:
      "Your agent is confirmed. Next, they'll formalise the agency agreement and start planning your campaign.",
    documentsNeeded: ["Signed agency agreement", "Photo ID for contract verification"],
    helpTip:
      "Your agent will walk you through the agreement — ask about commission, marketing spend, and campaign length before signing.",
    checklist: [
      { title: "Sign the agency agreement", owner: "seller" },
      { title: "Upload photo ID for contract verification", owner: "seller" },
      { title: "Agree on the marketing plan and budget", owner: "agent" },
    ],
    helpVideo: {
      url: helpVideoPlaceholderUrl,
      title: "Understanding your agency agreement",
      durationMinutes: 6,
      description:
        "Plain-language walkthrough of commission, term, marketing spend, and how to exit if it isn't working.",
      agentNotes:
        "Cooling-off periods, commission disclosure, and the property information statements required in your state before signing.",
    },
    helpGuide: {
      url: helpGuidePlaceholderUrl,
      title: "Agency agreement guide",
      description:
        "The clauses sellers ask about most — commission, exclusivity, term, and exit — explained in one document.",
      agentNotes: "Includes the signing checklist: ID verification, disclosure forms, and copies for the seller.",
    },
    associatedServices: [
      {
        id: "svc-marketing-upgrade",
        name: "Marketing package upgrade",
        category: "Marketing",
        description: "Premium portal placement, print collateral, and social campaign add-ons for the agreement.",
        typicalCost: "$800 - $2,500",
        vendors: [
          { id: "mkt-campaigntrack", name: "CampaignTrack", rating: 4.7, blurb: "Bundled portal + print + social packages.", url: "/vendors/mkt-campaigntrack" },
          { id: "mkt-realhub", name: "Realhub", rating: 4.6, blurb: "Flexible à la carte marketing add-ons.", url: "/vendors/mkt-realhub" },
        ],
      },
      {
        id: "svc-photography",
        name: "Professional photography",
        category: "Media",
        description: "Licensed photographer booking bundled into the marketing plan.",
        typicalCost: "$350 - $600",
        vendors: [
          { id: "photo-topsnap", name: "Top Snap", rating: 4.8, blurb: "Twilight and elevated shots included.", url: "/vendors/photo-topsnap" },
          { id: "photo-urbanangles", name: "Urban Angles", rating: 4.9, blurb: "Premium editorial style, 48-hour delivery.", url: "/vendors/photo-urbanangles" },
        ],
      },
    ],
  },
  prep_in_progress: {
    label: "Sale Preparation",
    summary: "Coordinate styling, repairs, documents, photography, and launch readiness.",
    accent: "#7a3b7a",
    whatHappensNow:
      "Your agent is coordinating styling, repairs, photography, and paperwork to get your home launch-ready.",
    documentsNeeded: [
      "Contract of sale / vendor disclosure statement",
      "Building and pest reports (if available)",
      "Approved floor plan (if available)",
    ],
    helpTip:
      "This is the stage where small presentation improvements tend to have the biggest impact on buyer interest.",
    checklist: [
      { title: "Book styling and pre-listing maintenance", owner: "agent" },
      { title: "Schedule photography and media", owner: "agent" },
      { title: "Prepare contract of sale and disclosures", owner: "agent" },
      { title: "Approve marketing copy and photos", owner: "seller" },
    ],
    helpVideo: {
      url: helpVideoPlaceholderUrl,
      title: "Getting your home launch-ready",
      durationMinutes: 7,
      description:
        "Styling, minor repairs, photography prep, and what buyers notice first — with before/after examples.",
      agentNotes:
        "Underquoting law, photography and access consent, and keeping a clean paper trail before you go live.",
    },
    helpGuide: {
      url: helpGuidePlaceholderUrl,
      title: "Preparation checklist guide",
      description:
        "Room-by-room presentation checklist plus the paperwork that must be complete before listing.",
      agentNotes: "Includes the pre-launch compliance checklist: contract, disclosures, and marketing approvals.",
    },
    associatedServices: [
      {
        id: "svc-styling",
        name: "Styling / home staging",
        category: "Presentation",
        description: "Furniture and styling hire to present the property at its best for photography and inspections.",
        typicalCost: "$1,500 - $4,000",
        vendors: [
          { id: "style-bowerbird", name: "BOWERBIRD Interiors", rating: 4.8, blurb: "Full and partial staging packages.", url: "/vendors/style-bowerbird" },
          { id: "style-coco", name: "Coco Republic Styling", rating: 4.7, blurb: "Premium furniture, strong for character homes.", url: "/vendors/style-coco" },
        ],
      },
      {
        id: "svc-inspection",
        name: "Pre-sale building & pest inspection",
        category: "Inspection",
        description: "An upfront report so surprises don't stall negotiations later.",
        typicalCost: "$400 - $700",
        vendors: [
          { id: "insp-jims", name: "Jim's Building Inspections", rating: 4.6, blurb: "Same-week bookings, combined reports.", url: "/vendors/insp-jims" },
          { id: "insp-bpi", name: "BPI Brisbane", rating: 4.8, blurb: "Thermal imaging included as standard.", url: "/vendors/insp-bpi" },
        ],
      },
      {
        id: "svc-repairs",
        name: "Minor repairs & handyman",
        category: "Trades",
        description: "Small fixes — touch-up paint, loose fittings, garden tidy — before photography day.",
        typicalCost: "Varies by scope",
        vendors: [
          { id: "trade-hire-hubby", name: "Hire A Hubby", rating: 4.5, blurb: "Broad coverage, quick quotes.", url: "/vendors/trade-hire-hubby" },
          { id: "trade-local", name: "Settled vetted local trades", rating: 4.7, blurb: "Pre-vetted tradies coordinated by your agent.", url: "/vendors/trade-local" },
        ],
      },
    ],
  },
  ready_for_listing: {
    label: "Ready To List",
    summary: "Everything is approved and ready to push to the public portals.",
    accent: "#23613e",
    whatHappensNow:
      "Everything is prepared and approved. We're ready to publish your listing to the public portals.",
    documentsNeeded: [],
    helpTip:
      "Once live, your listing syncs automatically across connected portals — no manual re-entry needed.",
    checklist: [
      { title: "Give final sign-off on copy, photos, and price guide", owner: "seller" },
      { title: "Confirm inspection times", owner: "agent" },
    ],
    helpVideo: {
      url: helpVideoPlaceholderUrl,
      title: "Your final sign-off, explained",
      durationMinutes: 3,
      description:
        "What you're approving in the final review — copy, photos, price guide — and how to request changes.",
      agentNotes: "Final price guide accuracy check and confirming disclosure documents are attached before launch.",
    },
    helpGuide: {
      url: helpGuidePlaceholderUrl,
      title: "Launch sign-off guide",
      description: "The final checklist covering listing copy, photography, price guide, and inspection times.",
    },
    associatedServices: [
      {
        id: "svc-portal-upgrade",
        name: "Premium portal placement",
        category: "Marketing",
        description: "Featured or highlighted placement on major listing portals for launch week.",
        typicalCost: "$300 - $900",
        vendors: [
          { id: "portal-rea", name: "realestate.com.au Premiere", rating: 4.7, blurb: "Largest buyer audience in Australia.", url: "/vendors/portal-rea" },
          { id: "portal-domain", name: "Domain Platinum", rating: 4.6, blurb: "Strong inner-city and premium reach.", url: "/vendors/portal-domain" },
        ],
      },
      {
        id: "svc-signboard",
        name: "Signboard & print collateral",
        category: "Marketing",
        description: "Street signage and printed brochures for inspections.",
        typicalCost: "$150 - $400",
        vendors: [
          { id: "print-sign-fast", name: "SignFast", rating: 4.5, blurb: "Photo boards installed within 3 days.", url: "/vendors/print-sign-fast" },
        ],
      },
    ],
  },
  live_on_portals: {
    label: "Live On Portals",
    summary: "The property is active, visible, and synchronised across listing destinations.",
    accent: "#8b2e3a",
    whatHappensNow:
      "Your property is live and visible to buyers. Your agent is running inspections and following up on enquiries.",
    documentsNeeded: [],
    helpTip:
      "Ask your agent for a weekly campaign report so you can track enquiry volume and buyer sentiment.",
    checklist: [
      { title: "Share weekly campaign report with the seller", owner: "agent" },
      { title: "Collect buyer feedback after each inspection", owner: "agent" },
    ],
    helpVideo: {
      url: helpVideoPlaceholderUrl,
      title: "What happens once you're live",
      durationMinutes: 6,
      description:
        "How inspections, enquiries, and buyer feedback typically flow during an active campaign — and what a good week looks like.",
      agentNotes:
        "Fair trading obligations for presenting all offers to the seller and keeping a compliant record of enquiries.",
    },
    helpGuide: {
      url: helpGuidePlaceholderUrl,
      title: "Campaign tracking guide",
      description: "How to read your weekly campaign report: enquiry volume, inspection numbers, and feedback themes.",
    },
    associatedServices: [
      {
        id: "svc-social-boost",
        name: "Social media campaign boost",
        category: "Marketing",
        description: "Paid social promotion to extend reach beyond the portals during the live campaign.",
        typicalCost: "$200 - $600",
        vendors: [
          { id: "social-idashboard", name: "iDashboard Social", rating: 4.5, blurb: "Targeted local buyer audiences.", url: "/vendors/social-idashboard" },
          { id: "social-propps", name: "Propps Digital", rating: 4.6, blurb: "Retargeting for portal viewers.", url: "/vendors/social-propps" },
        ],
      },
      {
        id: "svc-drone",
        name: "Virtual tour / drone video",
        category: "Media",
        description: "A walkthrough video or aerial footage to support online listings.",
        typicalCost: "$400 - $900",
        vendors: [
          { id: "drone-skyshots", name: "SkyShots Media", rating: 4.7, blurb: "CASA-licensed drone operators.", url: "/vendors/drone-skyshots" },
        ],
      },
    ],
  },
  under_offer: {
    label: "Under Offer",
    summary: "Buyer negotiations are underway and the campaign shifts into closing mode.",
    accent: "#5b4c12",
    whatHappensNow:
      "A buyer has made an offer and negotiations are underway. The campaign is moving toward closing.",
    documentsNeeded: ["Signed contract of sale (once accepted)", "Solicitor or conveyancer details"],
    helpTip: "If the offer falls through, the campaign can return to market at any time — nothing is lost.",
    checklist: [
      { title: "Review and respond to offer terms", owner: "seller" },
      { title: "Confirm buyer finance and conditions", owner: "agent" },
      { title: "Instruct solicitor or conveyancer", owner: "seller" },
    ],
    helpVideo: {
      url: helpVideoPlaceholderUrl,
      title: "Offers and contracts, step by step",
      durationMinutes: 8,
      description:
        "What each contract condition means, typical timeframes to settlement, and how negotiations usually play out.",
      agentNotes:
        "Cooling-off periods, special conditions, and finance clauses — what to check before a contract is signed.",
    },
    helpGuide: {
      url: helpGuidePlaceholderUrl,
      title: "Contract conditions guide",
      description: "Finance clauses, building and pest conditions, and settlement timeframes explained in plain language.",
    },
    associatedServices: [
      {
        id: "svc-conveyancing",
        name: "Conveyancing / settlement agent",
        category: "Legal",
        description: "Manages the legal transfer of ownership through to settlement.",
        typicalCost: "$800 - $1,500",
        vendors: [
          { id: "conv-bytherules", name: "Bytherules Conveyancing", rating: 4.8, blurb: "Fixed fee, fully online process.", url: "/vendors/conv-bytherules" },
          { id: "conv-rivercity", name: "River City Conveyancing", rating: 4.7, blurb: "Local team, strong on tight settlements.", url: "/vendors/conv-rivercity" },
        ],
      },
      {
        id: "svc-compliance-cert",
        name: "Building compliance certificate",
        category: "Legal",
        description: "Certificate confirming any structures on the property meet approval requirements.",
        typicalCost: "$200 - $500",
        vendors: [
          { id: "cert-certifygroup", name: "The Certifier Group", rating: 4.6, blurb: "Pool and structure certifications.", url: "/vendors/cert-certifygroup" },
        ],
      },
    ],
  },
  settled: {
    label: "Settled",
    summary: "The sale is complete and the seller journey is archived.",
    accent: "#1d2533",
    whatHappensNow:
      "Congratulations — the sale is complete and settlement has occurred. Your seller journey is now archived.",
    documentsNeeded: [],
    helpTip: "You can revisit your full activity history any time from this page.",
    checklist: [
      { title: "Confirm receipt of settlement funds", owner: "seller" },
      { title: "Hand over keys and property access", owner: "seller" },
    ],
    helpVideo: {
      url: helpVideoPlaceholderUrl,
      title: "After settlement: what's next",
      durationMinutes: 3,
      description: "Key hand-over steps — keys, utilities, and final funds disbursement — once the sale completes.",
      agentNotes: "What must be retained on file after settlement and for how long, per your state's requirements.",
    },
    helpGuide: {
      url: helpGuidePlaceholderUrl,
      title: "Settlement hand-over guide",
      description: "A short checklist for keys, utility transfers, mail redirection, and confirming your funds.",
    },
    associatedServices: [
      {
        id: "svc-removalist",
        name: "Moving & removalist referral",
        category: "Moving",
        description: "Vetted removalist partners for moving day.",
        typicalCost: "Quoted directly by provider",
        vendors: [
          { id: "move-2men", name: "Two Men and a Truck", rating: 4.5, blurb: "Flexible short-notice bookings.", url: "/vendors/move-2men" },
          { id: "move-allied", name: "Allied Moving Services", rating: 4.6, blurb: "Full pack-and-move service.", url: "/vendors/move-allied" },
        ],
      },
      {
        id: "svc-utilities",
        name: "Utility connection concierge",
        category: "Moving",
        description: "Free service to transfer or disconnect electricity, gas, and internet.",
        typicalCost: "Free",
        vendors: [
          { id: "util-myconnect", name: "MyConnect", rating: 4.7, blurb: "One call moves every service.", url: "/vendors/util-myconnect" },
        ],
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
    { title: "Confirm property address and ownership details", owner: "seller", done: true, state: "intake" },
    { title: "Share sale timeframe and target price range", owner: "seller", done: true, state: "intake" },
    { title: "Upload proof of ownership", owner: "seller", done: true, state: "intake" },
    { title: "Review the recommended agents", owner: "seller", done: true, state: "agent_matching" },
    { title: "Compare shortlist performance by suburb and property type", owner: "coordinator", done: true, state: "agent_matching" },
    { title: "Interview your top two agents", owner: "seller", done: false, state: "agent_matching" },
    { title: "Appoint your preferred agent", owner: "seller", done: false, state: "agent_matching" },
    { title: "Sign the agency agreement", owner: "seller", done: false, state: "agent_appointed" },
    { title: "Upload photo ID for contract verification", owner: "seller", done: false, state: "agent_appointed" },
    { title: "Agree on the marketing plan and budget", owner: "agent", done: false, state: "agent_appointed" },
    { title: "Book styling and pre-listing maintenance", owner: "agent", done: false, state: "prep_in_progress" },
    { title: "Schedule photography and media", owner: "agent", done: false, state: "prep_in_progress" },
    { title: "Prepare contract of sale and disclosures", owner: "agent", done: false, state: "prep_in_progress" },
    { title: "Approve marketing copy and photos", owner: "seller", done: false, state: "prep_in_progress" },
    { title: "Give final sign-off on copy, photos, and price guide", owner: "seller", done: false, state: "ready_for_listing" },
    { title: "Confirm inspection times", owner: "agent", done: false, state: "ready_for_listing" },
    { title: "Share weekly campaign report with the seller", owner: "agent", done: false, state: "live_on_portals" },
    { title: "Collect buyer feedback after each inspection", owner: "agent", done: false, state: "live_on_portals" },
    { title: "Review and respond to offer terms", owner: "seller", done: false, state: "under_offer" },
    { title: "Confirm buyer finance and conditions", owner: "agent", done: false, state: "under_offer" },
    { title: "Instruct solicitor or conveyancer", owner: "seller", done: false, state: "under_offer" },
    { title: "Confirm receipt of settlement funds", owner: "seller", done: false, state: "settled" },
    { title: "Hand over keys and property access", owner: "seller", done: false, state: "settled" },
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
