"use client";

import SettledLogo from "@/components/common/SettledLogo";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./SellerPortalPage.module.scss";
import {
  cloneSampleJourney,
  getAvailableTransitions,
  journeyStates,
  stateMeta,
  type JourneyPersistence,
  type JourneyActor,
  type JourneyState,
  type SellerJourney,
} from "@/lib/seller-journey";

const actors: { value: JourneyActor; label: string }[] = [
  { value: "seller", label: "Seller view" },
  { value: "agent", label: "Agent view" },
  { value: "coordinator", label: "Concierge view" },
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

export default function SellerPortalPage() {
  const [journey, setJourney] = useState<SellerJourney>(cloneSampleJourney);
  const [persistence, setPersistence] = useState<JourneyPersistence>("memory");
  const [actor, setActor] = useState<JourneyActor>("seller");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const actions = getAvailableTransitions(journey.currentState, actor);
  const completedStates =
    journeyStates.indexOf(journey.currentState) + 1;

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

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <section className={styles.hero}>
          <div>
            <div className={styles.heroLogo}>
              <SettledLogo priority width={250} height={125} />
            </div>
            <div className={styles.eyebrow}>Settled Seller Concierge</div>
            <h1>Guide every seller from first enquiry to portal launch.</h1>
            <p>
              This first pass keeps the Hozn visual base, but turns the entry
              point into a Vercel-friendly seller portal with a real transition
              model for agent selection, sale preparation, and listing
              activation.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryLink} href="/sell">
                Seller portal
              </Link>
              <Link className={styles.secondaryLink} href="/home-two">
                View Hozn frontend
              </Link>
            </div>
          </div>

          <aside className={styles.heroCard}>
            <h2>Why this deploys cleanly on Vercel</h2>
            <div className={styles.heroList}>
              <div className={styles.heroListItem}>
                <span>1</span>
              <div>Frontend remains a native Next.js app with app router pages.</div>
              </div>
              <div className={styles.heroListItem}>
                <span>2</span>
                <div>Transition validation and persistence now run in Next API routes.</div>
              </div>
              <div className={styles.heroListItem}>
                <span>3</span>
                <div>The older backend stays available as a reference while we re-platform safely.</div>
              </div>
            </div>
          </aside>
        </section>

        <section className={styles.metrics}>
          <article className={styles.metric}>
            <span className={styles.metricLabel}>Property</span>
            <strong>{journey.propertyAddress}</strong>
          </article>
          <article className={styles.metric}>
            <span className={styles.metricLabel}>Seller Goal</span>
            <strong>{journey.targetPrice}</strong>
          </article>
          <article className={styles.metric}>
            <span className={styles.metricLabel}>Progress</span>
            <strong>
              {completedStates}/{journeyStates.length} stages
            </strong>
          </article>
          <article className={styles.metric}>
            <span className={styles.metricLabel}>Persistence</span>
            <strong>{isLoading ? "Loading..." : persistence}</strong>
          </article>
        </section>

        <section className={styles.grid}>
          <div className={styles.stack}>
            <article className={styles.panel}>
              <h2>Journey state machine</h2>
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
            </article>

            <article className={styles.panel}>
              <h2>Seller preparation checklist</h2>
              <div className={styles.checklist}>
                {journey.checklist.map((item) => (
                  <div key={item.title} className={styles.checklistItem}>
                    <span
                      className={`${styles.dot} ${item.done ? styles.dotDone : ""}`}
                    />
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.owner} owned task</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className={styles.panel}>
              <h2>Recommended agents</h2>
              <div className={styles.candidates}>
                {journey.agentCandidates.map((candidate) => (
                  <div key={candidate.id} className={styles.candidate}>
                    <div className={styles.candidateTop}>
                      <div>
                        <h3>{candidate.name}</h3>
                        <p>
                          {candidate.suburb} · {candidate.specialty}
                        </p>
                      </div>
                      <span className={styles.rating}>{candidate.rating.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <div className={styles.stack}>
            <article className={styles.actionPanel}>
              <h2>Role-aware controls</h2>
              <p>
                Swap perspectives to verify that the available actions change
                with the current actor.
              </p>

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
                    No actions available for this role at the current stage.
                  </button>
                )}
              </div>

              {error ? <p className={styles.footerNote}>{error}</p> : null}
              <p className={styles.footerNote}>
                Current role: <strong>{actor}</strong> · Current state:{" "}
                <strong>{stateMeta[journey.currentState].label}</strong>
              </p>
              <p className={styles.footerNote}>
                Data source: <strong>{persistence}</strong>
              </p>
            </article>

            <article className={styles.timelinePanel}>
              <h2>Activity timeline</h2>
              <div className={styles.timeline}>
                {[...journey.timeline].reverse().map((entry) => (
                  <div key={`${entry.at}-${entry.to}`} className={styles.timelineItem}>
                    <span className={styles.timelineMeta}>
                      {formatTimelineAt(entry.at)}{" "}
                      · {entry.actor}
                    </span>
                    <strong>{stateMeta[entry.to].label}</strong>
                    <p>{entry.note}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
