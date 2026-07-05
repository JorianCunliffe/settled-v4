"use client";

import SettledLogo from "@/components/common/SettledLogo";
import Link from "next/link";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import styles from "./SellerPortalPage.module.scss";
import {
  cloneSampleJourney,
  getAvailableTransitions,
  journeyStates,
  stateMeta,
  type HelpResourceType,
  type JourneyPersistence,
  type JourneyActor,
  type JourneyState,
  type SellerJourney,
} from "@/lib/seller-journey";

const actors: { value: JourneyActor; label: string }[] = [
  { value: "seller", label: "Seller" },
  { value: "agent", label: "Agent" },
  { value: "coordinator", label: "Concierge" },
];

const timelineFormatter = new Intl.DateTimeFormat("en-AU", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Australia/Brisbane",
});

function formatTimelineAt(value: string) {
  return timelineFormatter.format(new Date(value));
}

async function requestTransition(
  journeyId: string,
  actor: JourneyActor,
  to: JourneyState,
): Promise<{ journey: SellerJourney; persistence: JourneyPersistence }> {
  const response = await fetch("/api/seller-journey", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      journeyId,
      actor,
      to,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json()) as { message?: string };
    throw new Error(payload.message ?? "Transition failed.");
  }

  return (await response.json()) as {
    journey: SellerJourney;
    persistence: JourneyPersistence;
  };
}

async function loadJourney(): Promise<{
  journey: SellerJourney;
  persistence: JourneyPersistence;
}> {
  const response = await fetch("/api/seller-journey", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = (await response.json()) as { message?: string };
    throw new Error(payload.message ?? "Unable to load seller journey.");
  }

  return (await response.json()) as {
    journey: SellerJourney;
    persistence: JourneyPersistence;
  };
}

function getPriceFromTarget(targetPrice: string) {
  const match = targetPrice.replace(/,/g, "").match(/\d+(?:\.\d+)?/);

  if (!match) {
    return 1000000;
  }

  const value = Number(match[0]);
  return targetPrice.toLowerCase().includes("m") ? Math.round(value * 1000000) : value;
}

function Disclosure({
  title,
  subtitle,
  children,
  defaultOpen = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={styles.disclosure}>
      <button
        aria-expanded={open}
        className={styles.disclosureTrigger}
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span>
          <strong>{title}</strong>
          {subtitle ? <span className={styles.disclosureSubtitle}>{subtitle}</span> : null}
        </span>
        <span className={styles.disclosureIcon}>{open ? "−" : "+"}</span>
      </button>
      {open ? <div className={styles.disclosurePanel}>{children}</div> : null}
    </div>
  );
}

const resourceTypeLabel: Record<HelpResourceType, string> = {
  video: "Video",
  article: "Article",
  guide: "Guide",
};

interface ChatMessage {
  id: string;
  from: "assistant" | "user";
  text: string;
}

const initialChatMessages: ChatMessage[] = [
  {
    id: "welcome",
    from: "assistant",
    text: "Hi, I'm the Settled Assistant. Ask me anything about your current step — full AI-powered answers are coming soon.",
  },
];

function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(initialChatMessages);
  const [draft, setDraft] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const text = draft.trim();
    if (!text) {
      return;
    }

    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, from: "user", text },
      {
        id: `assistant-${Date.now()}`,
        from: "assistant",
        text: "Thanks for the message! Live AI answers aren't wired up yet — in the meantime, check the help resources for this step or ask your agent directly.",
      },
    ]);
    setDraft("");
  };

  return (
    <div className={styles.chatWidget}>
      {isOpen ? (
        <div className={styles.chatPanel}>
          <div className={styles.chatHeader}>
            <strong>Settled Assistant</strong>
            <button
              aria-label="Close chat"
              className={styles.chatClose}
              onClick={() => setIsOpen(false)}
              type="button"
            >
              ×
            </button>
          </div>
          <div className={styles.chatMessages}>
            {messages.map((message) => (
              <div
                className={`${styles.chatMessage} ${
                  message.from === "user" ? styles.chatMessageUser : styles.chatMessageAssistant
                }`}
                key={message.id}
              >
                {message.text}
              </div>
            ))}
          </div>
          <form className={styles.chatForm} onSubmit={handleSubmit}>
            <input
              className={styles.chatInput}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask a question..."
              type="text"
              value={draft}
            />
            <button className={styles.chatSend} type="submit">
              Send
            </button>
          </form>
        </div>
      ) : null}

      <button
        className={styles.chatToggle}
        onClick={() => setIsOpen((value) => !value)}
        type="button"
      >
        {isOpen ? "Close chat" : "Chat with us"}
      </button>
    </div>
  );
}

export default function SellerPortalPage() {
  const [journey, setJourney] = useState<SellerJourney>(cloneSampleJourney);
  const [persistence, setPersistence] = useState<JourneyPersistence>("memory");
  const [actor, setActor] = useState<JourneyActor>("seller");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingListing, setIsCreatingListing] = useState(false);
  const [createdListingUrl, setCreatedListingUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [docErrors, setDocErrors] = useState<Record<string, string>>({});
  const [viewState, setViewState] = useState<JourneyState>(journey.currentState);

  const actions = getAvailableTransitions(journey.currentState, actor);
  const totalStages = journeyStates.length;
  const currentMeta = stateMeta[journey.currentState];

  const viewIndex = journeyStates.indexOf(viewState);
  const viewMeta = stateMeta[viewState];
  const isViewingCurrent = viewState === journey.currentState;
  const canViewPrevious = viewIndex > 0;
  const canViewNext = viewIndex < totalStages - 1;

  const visibleResources = viewMeta.helpResources.filter(
    (resource) => actor === "coordinator" || resource.audience === "both" || resource.audience === actor,
  );

  useEffect(() => {
    setViewState(journey.currentState);
  }, [journey.currentState]);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      try {
        const payload = await loadJourney();

        if (!isMounted) {
          return;
        }

        setJourney(payload.journey);
        setPersistence(payload.persistence);
      } catch (nextError) {
        if (!isMounted) {
          return;
        }

        const message =
          nextError instanceof Error ? nextError.message : "Unable to load seller journey.";
        setError(message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleAction = async (to: JourneyState) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = await requestTransition(journey.id, actor, to);
      setJourney(payload.journey);
      setPersistence(payload.persistence);
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : "Transition failed.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateListing = async () => {
    setIsCreatingListing(true);
    setError(null);

    try {
      const response = await fetch("/api/listings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: journey.propertyAddress,
          bathrooms: 2,
          bedrooms: 3,
          category: "Houses",
          description: `Created from seller journey ${journey.id} for ${journey.sellerName}.`,
          garages: 1,
          listingType: "Sell",
          location: journey.propertyAddress.split(",").slice(-1)[0]?.trim() || journey.propertyAddress,
          price: getPriceFromTarget(journey.targetPrice),
          size: 220,
          title: journey.propertyAddress,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "Unable to create listing.");
      }

      const payload = (await response.json()) as { listing: { id: number } };
      setCreatedListingUrl(`/listing/${payload.listing.id}`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to create listing.");
    } finally {
      setIsCreatingListing(false);
    }
  };

  const handleDocSelected = async (docLabel: string, file: File) => {
    const key = `${journey.currentState}:${docLabel}`;
    setUploadingDoc(key);
    setDocErrors((current) => ({ ...current, [key]: "" }));

    try {
      const body = new FormData();
      body.append("journeyId", journey.id);
      body.append("actor", actor);
      body.append("state", journey.currentState);
      body.append("label", docLabel);
      body.append("file", file);

      const response = await fetch("/api/seller-journey/documents", {
        method: "POST",
        body,
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "Unable to upload document.");
      }

      const payload = (await response.json()) as {
        journey: SellerJourney;
        persistence: JourneyPersistence;
      };
      setJourney(payload.journey);
      setPersistence(payload.persistence);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "Unable to upload document.";
      setDocErrors((current) => ({ ...current, [key]: message }));
    } finally {
      setUploadingDoc(null);
    }
  };

  const outstandingChecklist = journey.checklist.filter((item) => !item.done);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.topBar}>
          <div className={styles.topBarBrand}>
            <SettledLogo priority width={140} height={70} />
          </div>
          <div className={styles.topBarProperty}>
            <strong>{journey.propertyAddress}</strong>
            <span>{journey.targetPrice}</span>
          </div>
          <div className={styles.actorTabs}>
            {actors.map((item) => (
              <button
                key={item.value}
                className={`${styles.actorTab} ${actor === item.value ? styles.actorTabActive : ""}`}
                onClick={() => setActor(item.value)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        </header>

        {isLoading ? (
          <p className={styles.loadingNote}>Loading your sale plan...</p>
        ) : (
          <>
            <section className={styles.statusHero} style={{ borderTopColor: viewMeta.accent }}>
              <div className={styles.statusNav}>
                <button
                  className={styles.statusNavButton}
                  disabled={!canViewPrevious}
                  onClick={() => setViewState(journeyStates[viewIndex - 1])}
                  type="button"
                >
                  ‹ Previous step
                </button>
                <div className={styles.statusStageLabel}>
                  Step {viewIndex + 1} of {totalStages}
                </div>
                <button
                  className={styles.statusNavButton}
                  disabled={!canViewNext}
                  onClick={() => setViewState(journeyStates[viewIndex + 1])}
                  type="button"
                >
                  Next step ›
                </button>
              </div>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressBarFill}
                  style={{
                    width: `${((viewIndex + 1) / totalStages) * 100}%`,
                    background: viewMeta.accent,
                  }}
                />
              </div>
              <h1>{viewMeta.label}</h1>
              <p className={styles.statusExplainer}>{viewMeta.whatHappensNow}</p>

              {isViewingCurrent ? (
                <div className={styles.actions}>
                  {actions.length > 0 ? (
                    actions.map((action) => (
                      <button
                        key={`${actor}-${action.to}`}
                        className={styles.actionButton}
                        disabled={isSubmitting}
                        onClick={() => handleAction(action.to)}
                        type="button"
                      >
                        <strong>{action.label}</strong>
                        <br />
                        {action.detail}
                      </button>
                    ))
                  ) : (
                    <button className={styles.ghostButton} disabled type="button">
                      No actions available for the {actor} role at this stage.
                    </button>
                  )}

                  {journey.currentState === "ready_for_listing" ||
                  journey.currentState === "live_on_portals" ? (
                    <button
                      className={styles.actionButton}
                      disabled={isCreatingListing}
                      onClick={handleCreateListing}
                      type="button"
                    >
                      <strong>
                        {isCreatingListing ? "Creating listing..." : "Create frontend listing"}
                      </strong>
                      <br />
                      Generate a real public listing from this seller journey.
                    </button>
                  ) : null}

                  {createdListingUrl ? (
                    <Link className={styles.actionButton} href={createdListingUrl}>
                      <strong>View created listing</strong>
                      <br />
                      Open the public listing detail page.
                    </Link>
                  ) : null}
                </div>
              ) : (
                <div className={styles.previewNotice}>
                  <span>
                    You&apos;re previewing the <strong>{viewMeta.label}</strong> step. Actions and uploads
                    are only available on your current step.
                  </span>
                  <button
                    className={styles.previewReturn}
                    onClick={() => setViewState(journey.currentState)}
                    type="button"
                  >
                    Return to current step
                  </button>
                </div>
              )}

              {error ? <p className={styles.errorNote}>{error}</p> : null}
            </section>

            <section className={styles.panel}>
              <h2>What you need to do to proceed</h2>
              <ul className={styles.doList}>
                {viewMeta.whatYouNeedToDo.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              {viewMeta.documentsNeeded.length > 0 ? (
                <>
                  <h3 className={styles.subheading}>Documents to upload</h3>
                  <div className={styles.uploadList}>
                    {viewMeta.documentsNeeded.map((doc) => {
                      const key = `${viewState}:${doc}`;
                      const uploaded = journey.documents.find(
                        (document) => document.state === viewState && document.label === doc,
                      );
                      const isUploading = uploadingDoc === key;
                      const docError = docErrors[key];

                      if (!isViewingCurrent) {
                        return (
                          <div className={styles.uploadItem} key={doc}>
                            <div>
                              <strong>{doc}</strong>
                              {uploaded ? (
                                <span className={styles.uploadDone}>Uploaded: {uploaded.fileName}</span>
                              ) : (
                                <span className={styles.uploadPending}>Not uploaded yet</span>
                              )}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className={styles.uploadItem} key={doc}>
                          <div>
                            <strong>{doc}</strong>
                            {uploaded ? (
                              <span className={styles.uploadDone}>
                                Uploaded:{" "}
                                <a href={uploaded.url} rel="noreferrer" target="_blank">
                                  {uploaded.fileName}
                                </a>
                              </span>
                            ) : (
                              <span className={styles.uploadPending}>Not uploaded yet</span>
                            )}
                            {docError ? <span className={styles.uploadError}>{docError}</span> : null}
                          </div>
                          <label className={styles.uploadButton}>
                            {isUploading ? "Uploading..." : uploaded ? "Replace" : "Upload"}
                            <input
                              accept="application/pdf,image/*"
                              disabled={isUploading}
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                event.target.value = "";
                                if (file) {
                                  void handleDocSelected(doc, file);
                                }
                              }}
                              style={{ display: "none" }}
                              type="file"
                            />
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : null}

              {isViewingCurrent && outstandingChecklist.length > 0 ? (
                <>
                  <h3 className={styles.subheading}>Open tasks</h3>
                  <div className={styles.checklist}>
                    {outstandingChecklist.map((item) => (
                      <div key={item.title} className={styles.checklistItem}>
                        <span className={styles.dot} />
                        <div>
                          <strong>{item.title}</strong>
                          <p>{item.owner} owned task</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}

              <p className={styles.tipCallout}>
                <strong>Tip:</strong> {viewMeta.helpTip}
              </p>
            </section>

            <section className={styles.panel}>
              <h2>Help resources for this step</h2>
              {visibleResources.length > 0 ? (
                <div className={styles.resourceList}>
                  {visibleResources.map((resource) => (
                    <div className={styles.resourceItem} key={resource.id}>
                      <div className={styles.resourceMeta}>
                        <span className={styles.resourceType}>{resourceTypeLabel[resource.type]}</span>
                        {resource.durationMinutes ? (
                          <span className={styles.resourceDuration}>{resource.durationMinutes} min</span>
                        ) : null}
                        <span className={styles.resourceAudience}>
                          {resource.audience === "both"
                            ? "For everyone"
                            : resource.audience === "agent"
                              ? "For agents"
                              : "For sellers"}
                        </span>
                      </div>
                      <strong>{resource.title}</strong>
                      <p>{resource.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.footerNote}>No help resources for this step yet.</p>
              )}
            </section>

            <section className={styles.panel}>
              <h2>Associated services</h2>
              <p className={styles.panelSubtitle}>
                Agents: offer these when relevant. Sellers: ask your agent if any of these would help.
              </p>
              {viewMeta.associatedServices.length > 0 ? (
                <div className={styles.serviceList}>
                  {viewMeta.associatedServices.map((service) => (
                    <div className={styles.serviceItem} key={service.id}>
                      <div className={styles.serviceTop}>
                        <strong>{service.name}</strong>
                        <span className={styles.serviceCategory}>{service.category}</span>
                      </div>
                      <p>{service.description}</p>
                      <span className={styles.serviceCost}>{service.typicalCost}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.footerNote}>No associated services for this step.</p>
              )}
            </section>

            <section className={styles.stack}>
              <Disclosure title="Full journey map" subtitle={`${totalStages} stages`}>
                <div className={styles.stateRail}>
                  {journeyStates.map((state) => {
                    const meta = stateMeta[state];
                    const isActive = state === journey.currentState;

                    return (
                      <div
                        key={state}
                        className={`${styles.stateCard} ${isActive ? styles.stateCardActive : ""}`}
                        style={{ borderLeftColor: meta.accent }}
                      >
                        <div className={styles.stateHeader}>
                          <strong>{meta.label}</strong>
                          {isActive ? <span className={styles.badge}>Current</span> : null}
                        </div>
                        <p>{meta.summary}</p>
                      </div>
                    );
                  })}
                </div>
              </Disclosure>

              <Disclosure title="Activity history" subtitle={`${journey.timeline.length} events`}>
                <div className={styles.timeline}>
                  {[...journey.timeline].reverse().map((entry) => (
                    <div key={`${entry.at}-${entry.to}`} className={styles.timelineItem}>
                      <span className={styles.timelineMeta}>
                        {formatTimelineAt(entry.at)} &middot; {entry.actor}
                      </span>
                      <strong>{stateMeta[entry.to].label}</strong>
                      <p>{entry.note}</p>
                    </div>
                  ))}
                </div>
              </Disclosure>

              {journey.agentCandidates.length > 0 ? (
                <Disclosure title="Recommended agents" subtitle={`${journey.agentCandidates.length} candidates`}>
                  <div className={styles.candidates}>
                    {journey.agentCandidates.map((candidate) => (
                      <div key={candidate.id} className={styles.candidate}>
                        <div className={styles.candidateTop}>
                          <div>
                            <h3>{candidate.name}</h3>
                            <p>
                              {candidate.suburb} &middot; {candidate.specialty}
                            </p>
                          </div>
                          <span className={styles.rating}>{candidate.rating.toFixed(1)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Disclosure>
              ) : null}

              <Disclosure title="All tasks" subtitle={`${journey.checklist.length} total`}>
                <div className={styles.checklist}>
                  {journey.checklist.map((item) => (
                    <div key={item.title} className={styles.checklistItem}>
                      <span className={`${styles.dot} ${item.done ? styles.dotDone : ""}`} />
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.owner} owned task</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Disclosure>
            </section>

            <p className={styles.footerNote}>
              Signed in as <strong>{actor}</strong> &middot; Data source: <strong>{persistence}</strong>{" "}
              &middot; <Link href="/admin/seller-journey">Admin controls</Link>
            </p>
          </>
        )}
      </div>
      <ChatBot />
    </main>
  );
}
