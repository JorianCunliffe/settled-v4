"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./StageContentAdminPage.module.scss";
import {
  journeyStates,
  stateMeta,
  type AssociatedService,
  type ChecklistTemplateItem,
  type JourneyActor,
  type JourneyState,
  type StageMeta,
} from "@/lib/seller-journey";

interface StageContentResponse {
  content: Record<JourneyState, StageMeta>;
  overridden: JourneyState[];
  persistence: string;
  message?: string;
}

interface Draft {
  label: string;
  accent: string;
  summary: string;
  whatHappensNow: string;
  helpTip: string;
  documentsNeeded: string;
  checklist: string;
  videoTitle: string;
  videoDuration: string;
  videoDescription: string;
  videoAgentNotes: string;
  videoUrl: string;
  guideTitle: string;
  guideDescription: string;
  guideAgentNotes: string;
  guideUrl: string;
  servicesJson: string;
}

const actorValues: JourneyActor[] = ["seller", "agent", "coordinator"];

function buildDraft(meta: StageMeta): Draft {
  return {
    label: meta.label,
    accent: meta.accent,
    summary: meta.summary,
    whatHappensNow: meta.whatHappensNow,
    helpTip: meta.helpTip,
    documentsNeeded: meta.documentsNeeded.join("\n"),
    checklist: meta.checklist.map((item) => `${item.title} | ${item.owner}`).join("\n"),
    videoTitle: meta.helpVideo.title,
    videoDuration: String(meta.helpVideo.durationMinutes),
    videoDescription: meta.helpVideo.description,
    videoAgentNotes: meta.helpVideo.agentNotes ?? "",
    videoUrl: meta.helpVideo.url,
    guideTitle: meta.helpGuide.title,
    guideDescription: meta.helpGuide.description,
    guideAgentNotes: meta.helpGuide.agentNotes ?? "",
    guideUrl: meta.helpGuide.url,
    servicesJson: JSON.stringify(meta.associatedServices, null, 2),
  };
}

function parseDraft(draft: Draft): StageMeta {
  const checklist: ChecklistTemplateItem[] = draft.checklist
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, owner = "seller"] = line.split("|").map((part) => part.trim());

      if (!title) {
        throw new Error("Checklist lines need a task title.");
      }

      if (!actorValues.includes(owner as JourneyActor)) {
        throw new Error(
          `Checklist owner "${owner}" must be one of: ${actorValues.join(", ")}. Use "task title | owner".`,
        );
      }

      return { title, owner: owner as JourneyActor };
    });

  const durationMinutes = Number(draft.videoDuration);

  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    throw new Error("Video duration must be a positive number of minutes.");
  }

  let services: AssociatedService[];
  try {
    services = JSON.parse(draft.servicesJson) as AssociatedService[];
  } catch {
    throw new Error("Services JSON is not valid JSON.");
  }

  return {
    label: draft.label.trim(),
    accent: draft.accent.trim(),
    summary: draft.summary.trim(),
    whatHappensNow: draft.whatHappensNow.trim(),
    helpTip: draft.helpTip.trim(),
    documentsNeeded: draft.documentsNeeded
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    checklist,
    helpVideo: {
      title: draft.videoTitle.trim(),
      durationMinutes,
      description: draft.videoDescription.trim(),
      url: draft.videoUrl.trim(),
      ...(draft.videoAgentNotes.trim() ? { agentNotes: draft.videoAgentNotes.trim() } : {}),
    },
    helpGuide: {
      title: draft.guideTitle.trim(),
      description: draft.guideDescription.trim(),
      url: draft.guideUrl.trim(),
      ...(draft.guideAgentNotes.trim() ? { agentNotes: draft.guideAgentNotes.trim() } : {}),
    },
    associatedServices: services,
  };
}

export default function StageContentAdminPage() {
  const [content, setContent] = useState<Record<JourneyState, StageMeta>>(stateMeta);
  const [overridden, setOverridden] = useState<JourneyState[]>([]);
  const [activeState, setActiveState] = useState<JourneyState>("intake");
  const [draft, setDraft] = useState<Draft>(() => buildDraft(stateMeta.intake));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState<"video" | "guide" | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      try {
        const response = await fetch("/api/stage-content", { cache: "no-store" });
        const payload = (await response.json()) as StageContentResponse;

        if (!response.ok) {
          throw new Error(payload.message ?? "Unable to load stage content.");
        }

        if (isMounted) {
          setContent(payload.content);
          setOverridden(payload.overridden);
          setDraft(buildDraft(payload.content.intake));
        }
      } catch (nextError) {
        if (isMounted) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load stage content.");
        }
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

  const applyPayload = (payload: StageContentResponse, nextActive: JourneyState) => {
    setContent(payload.content);
    setOverridden(payload.overridden);
    setDraft(buildDraft(payload.content[nextActive]));
  };

  const switchState = (state: JourneyState) => {
    setActiveState(state);
    setDraft(buildDraft(content[state]));
    setStatus(null);
    setError(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatus(null);
    setError(null);

    try {
      const parsed = parseDraft(draft);
      const response = await fetch("/api/stage-content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: activeState, content: parsed }),
      });
      const payload = (await response.json()) as StageContentResponse;

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to save stage content.");
      }

      applyPayload(payload, activeState);
      setStatus(`Saved ${payload.content[activeState].label}. Changes are live on the seller portal.`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to save stage content.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsSaving(true);
    setStatus(null);
    setError(null);

    try {
      const response = await fetch(`/api/stage-content?state=${activeState}`, { method: "DELETE" });
      const payload = (await response.json()) as StageContentResponse;

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to reset stage content.");
      }

      applyPayload(payload, activeState);
      setStatus("Reset to the built-in defaults.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to reset stage content.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssetUpload = async (kind: "video" | "guide", file: File) => {
    setIsUploading(kind);
    setStatus(null);
    setError(null);

    try {
      const body = new FormData();
      body.append("state", activeState);
      body.append("kind", kind);
      body.append("file", file);

      const response = await fetch("/api/stage-content/assets", { method: "POST", body });
      const payload = (await response.json()) as StageContentResponse & { uploadedUrl?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to upload file.");
      }

      applyPayload(payload, activeState);
      setStatus(`Uploaded ${file.name} as the ${kind === "video" ? "help video" : "guide PDF"} for this step.`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to upload file.");
    } finally {
      setIsUploading(null);
    }
  };

  const setField = (field: keyof Draft) => (value: string) =>
    setDraft((current) => ({ ...current, [field]: value }));

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1>Stage content editor</h1>
            <p>
              Everything shown on the seller portal for each step — text, checklists, help video,
              guide PDF, and services — is editable here. Saving publishes immediately.
            </p>
          </div>
          <nav className={styles.headerLinks}>
            <Link href="/sell">Seller portal</Link>
            <Link href="/admin/seller-journey">Journey admin</Link>
          </nav>
        </header>

        {isLoading ? (
          <p className={styles.note}>Loading stage content...</p>
        ) : (
          <>
            <div className={styles.tabs}>
              {journeyStates.map((state) => (
                <button
                  key={state}
                  className={`${styles.tab} ${state === activeState ? styles.tabActive : ""}`}
                  onClick={() => switchState(state)}
                  type="button"
                >
                  {content[state].label}
                  {overridden.includes(state) ? <span className={styles.tabDot} /> : null}
                </button>
              ))}
            </div>

            <p className={styles.note}>
              {overridden.includes(activeState)
                ? "This step has saved overrides."
                : "This step is showing the built-in defaults."}{" "}
              Unsaved edits are discarded when you switch steps.
            </p>

            <section className={styles.panel}>
              <h2>Step text</h2>
              <div className={styles.fieldRow}>
                <label className={styles.field}>
                  <span>Step name</span>
                  <input value={draft.label} onChange={(e) => setField("label")(e.target.value)} />
                </label>
                <label className={styles.field}>
                  <span>Accent colour (hex)</span>
                  <input value={draft.accent} onChange={(e) => setField("accent")(e.target.value)} />
                </label>
              </div>
              <label className={styles.field}>
                <span>Short summary (journey map)</span>
                <textarea rows={2} value={draft.summary} onChange={(e) => setField("summary")(e.target.value)} />
              </label>
              <label className={styles.field}>
                <span>What happens now (main explainer)</span>
                <textarea
                  rows={3}
                  value={draft.whatHappensNow}
                  onChange={(e) => setField("whatHappensNow")(e.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span>Tip</span>
                <textarea rows={2} value={draft.helpTip} onChange={(e) => setField("helpTip")(e.target.value)} />
              </label>
            </section>

            <section className={styles.panel}>
              <h2>Checklist &amp; documents</h2>
              <label className={styles.field}>
                <span>Checklist — one task per line as &quot;task title | owner&quot; (owner: seller, agent, or coordinator)</span>
                <textarea rows={5} value={draft.checklist} onChange={(e) => setField("checklist")(e.target.value)} />
              </label>
              <label className={styles.field}>
                <span>Documents to upload — one per line (leave empty for none)</span>
                <textarea
                  rows={3}
                  value={draft.documentsNeeded}
                  onChange={(e) => setField("documentsNeeded")(e.target.value)}
                />
              </label>
            </section>

            <section className={styles.panel}>
              <h2>Help video</h2>
              <div className={styles.fieldRow}>
                <label className={styles.field}>
                  <span>Title</span>
                  <input value={draft.videoTitle} onChange={(e) => setField("videoTitle")(e.target.value)} />
                </label>
                <label className={styles.field}>
                  <span>Duration (minutes)</span>
                  <input
                    type="number"
                    min={1}
                    value={draft.videoDuration}
                    onChange={(e) => setField("videoDuration")(e.target.value)}
                  />
                </label>
              </div>
              <label className={styles.field}>
                <span>Description</span>
                <textarea
                  rows={2}
                  value={draft.videoDescription}
                  onChange={(e) => setField("videoDescription")(e.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span>Notes for agents (optional)</span>
                <textarea
                  rows={2}
                  value={draft.videoAgentNotes}
                  onChange={(e) => setField("videoAgentNotes")(e.target.value)}
                />
              </label>
              <div className={styles.assetRow}>
                <video className={styles.videoPreview} controls key={draft.videoUrl} preload="metadata" src={draft.videoUrl} />
                <label className={styles.uploadButton}>
                  {isUploading === "video" ? "Uploading..." : "Upload new video"}
                  <input
                    accept="video/*"
                    disabled={isUploading !== null}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) {
                        void handleAssetUpload("video", file);
                      }
                    }}
                    style={{ display: "none" }}
                    type="file"
                  />
                </label>
              </div>
            </section>

            <section className={styles.panel}>
              <h2>Guide document (PDF)</h2>
              <label className={styles.field}>
                <span>Title</span>
                <input value={draft.guideTitle} onChange={(e) => setField("guideTitle")(e.target.value)} />
              </label>
              <label className={styles.field}>
                <span>Description</span>
                <textarea
                  rows={2}
                  value={draft.guideDescription}
                  onChange={(e) => setField("guideDescription")(e.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span>Notes for agents (optional)</span>
                <textarea
                  rows={2}
                  value={draft.guideAgentNotes}
                  onChange={(e) => setField("guideAgentNotes")(e.target.value)}
                />
              </label>
              <div className={styles.assetRow}>
                <a className={styles.assetLink} href={draft.guideUrl} rel="noreferrer" target="_blank">
                  Open current guide PDF
                </a>
                <label className={styles.uploadButton}>
                  {isUploading === "guide" ? "Uploading..." : "Upload new PDF"}
                  <input
                    accept="application/pdf"
                    disabled={isUploading !== null}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) {
                        void handleAssetUpload("guide", file);
                      }
                    }}
                    style={{ display: "none" }}
                    type="file"
                  />
                </label>
              </div>
            </section>

            <section className={styles.panel}>
              <h2>Services &amp; vendors (JSON)</h2>
              <label className={styles.field}>
                <span>
                  Each service: id, name, category, description, typicalCost, and vendors (id, name,
                  rating 0-5, blurb)
                </span>
                <textarea
                  className={styles.jsonArea}
                  rows={14}
                  value={draft.servicesJson}
                  onChange={(e) => setField("servicesJson")(e.target.value)}
                />
              </label>
            </section>

            <div className={styles.actions}>
              <button className={styles.saveButton} disabled={isSaving} onClick={handleSave} type="button">
                {isSaving ? "Working..." : "Save & publish this step"}
              </button>
              <button className={styles.resetButton} disabled={isSaving} onClick={handleReset} type="button">
                Reset step to defaults
              </button>
            </div>

            {status ? <p className={styles.statusOk}>{status}</p> : null}
            {error ? <p className={styles.statusError}>{error}</p> : null}
          </>
        )}
      </div>
    </main>
  );
}
