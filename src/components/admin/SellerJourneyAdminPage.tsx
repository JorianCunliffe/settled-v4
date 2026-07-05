"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  journeyStates,
  stateMeta,
  type JourneyActor,
  type JourneyPersistence,
  type JourneyState,
  type SellerJourney,
} from "@/lib/seller-journey";
import styles from "./SellerJourneyAdminPage.module.scss";

const actors: Array<{ label: string; value: JourneyActor }> = [
  { label: "Seller", value: "seller" },
  { label: "Agent", value: "agent" },
  { label: "Coordinator", value: "coordinator" },
];

const timelineFormatter = new Intl.DateTimeFormat("en-AU", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Australia/Brisbane",
});

function formatTimelineAt(value: string) {
  return timelineFormatter.format(new Date(value));
}

async function loadAdminJourney(): Promise<{
  journey: SellerJourney;
  persistence: JourneyPersistence;
}> {
  const response = await fetch("/api/admin/seller-journey", {
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = (await response.json()) as { message?: string };
    throw new Error(payload.message ?? "Unable to load journey.");
  }

  return (await response.json()) as {
    journey: SellerJourney;
    persistence: JourneyPersistence;
  };
}

async function updateAdminJourney(params: {
  actor: JourneyActor;
  journeyId: string;
  note: string;
  to: JourneyState;
}): Promise<{
  journey: SellerJourney;
  persistence: JourneyPersistence;
}> {
  const response = await fetch("/api/admin/seller-journey", {
    body: JSON.stringify(params),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const payload = (await response.json()) as { message?: string };
    throw new Error(payload.message ?? "Unable to update journey.");
  }

  return (await response.json()) as {
    journey: SellerJourney;
    persistence: JourneyPersistence;
  };
}

export default function SellerJourneyAdminPage() {
  const [journey, setJourney] = useState<SellerJourney | null>(null);
  const [persistence, setPersistence] = useState<JourneyPersistence>("memory");
  const [actor, setActor] = useState<JourneyActor>("coordinator");
  const [targetState, setTargetState] = useState<JourneyState>("intake");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    loadAdminJourney()
      .then((payload) => {
        if (!isMounted) {
          return;
        }

        setJourney(payload.journey);
        setPersistence(payload.persistence);
        setTargetState(payload.journey.currentState);
      })
      .catch((nextError) => {
        if (isMounted) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Unable to load journey.",
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async () => {
    if (!journey) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = await updateAdminJourney({
        actor,
        journeyId: journey.id,
        note:
          note.trim() ||
          `Admin moved journey to ${stateMeta[targetState].label} for ${actor}.`,
        to: targetState,
      });

      setJourney(payload.journey);
      setPersistence(payload.persistence);
      setNote("");
      setMessage(`Journey updated to ${stateMeta[targetState].label}.`);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Unable to update journey.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <h1>Seller Journey Admin</h1>
            <p>Move the shared seller and agent workflow to any state.</p>
          </div>
          <Link href="/sell" className={styles.link}>
            Open seller portal
          </Link>
        </header>

        {isLoading ? (
          <section className={styles.panel}>Loading journey...</section>
        ) : null}

        {error && !journey ? (
          <section className={styles.panel}>
            <p className={styles.error}>{error}</p>
          </section>
        ) : null}

        {journey ? (
          <>
            <section className={styles.summary}>
              <article className={styles.metric}>
                <span>Property</span>
                <strong>{journey.propertyAddress}</strong>
              </article>
              <article className={styles.metric}>
                <span>Seller</span>
                <strong>{journey.sellerName}</strong>
              </article>
              <article className={styles.metric}>
                <span>Current State</span>
                <strong>{stateMeta[journey.currentState].label}</strong>
              </article>
              <article className={styles.metric}>
                <span>Persistence</span>
                <strong>{persistence}</strong>
              </article>
            </section>

            <section className={styles.grid}>
              <article className={styles.panel}>
                <h2>State Machine</h2>
                <div className={styles.states}>
                  {journeyStates.map((state) => {
                    const meta = stateMeta[state];
                    const isActive = state === journey.currentState;
                    const isTarget = state === targetState;

                    return (
                      <button
                        className={`${styles.stateButton} ${
                          isActive || isTarget ? styles.stateButtonActive : ""
                        }`}
                        key={state}
                        onClick={() => setTargetState(state)}
                        style={{ borderLeftColor: meta.accent }}
                        type="button"
                      >
                        <strong>
                          {meta.label}
                          {isActive ? " · current" : ""}
                        </strong>
                        <p>{meta.summary}</p>
                      </button>
                    );
                  })}
                </div>
              </article>

              <div>
                <article className={styles.panel}>
                  <h2>Admin Update</h2>
                  <div className={styles.form}>
                    <div className={styles.field}>
                      <label htmlFor="actor">Update on behalf of</label>
                      <select
                        id="actor"
                        value={actor}
                        onChange={(event) =>
                          setActor(event.target.value as JourneyActor)
                        }
                      >
                        {actors.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.field}>
                      <label htmlFor="targetState">Target state</label>
                      <select
                        id="targetState"
                        value={targetState}
                        onChange={(event) =>
                          setTargetState(event.target.value as JourneyState)
                        }
                      >
                        {journeyStates.map((state) => (
                          <option key={state} value={state}>
                            {stateMeta[state].label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.field}>
                      <label htmlFor="note">Timeline note</label>
                      <textarea
                        id="note"
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        placeholder="Why is this state changing?"
                      />
                    </div>

                    <button
                      className={styles.button}
                      disabled={isSaving}
                      onClick={handleSave}
                      type="button"
                    >
                      {isSaving ? "Updating..." : "Update journey state"}
                    </button>
                    {message ? <p className={styles.message}>{message}</p> : null}
                    {error ? <p className={styles.error}>{error}</p> : null}
                  </div>
                </article>

                <article className={styles.panel}>
                  <h2>Timeline</h2>
                  <div className={styles.timeline}>
                    {[...journey.timeline].reverse().map((entry) => (
                      <div
                        className={styles.timelineItem}
                        key={`${entry.at}-${entry.to}-${entry.note}`}
                      >
                        <span className={styles.timelineMeta}>
                          {formatTimelineAt(entry.at)} · {entry.actor}
                        </span>
                        <strong>{stateMeta[entry.to].label}</strong>
                        <p>{entry.note}</p>
                      </div>
                    ))}
                  </div>
                </article>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
