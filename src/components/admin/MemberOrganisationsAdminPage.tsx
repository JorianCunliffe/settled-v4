"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import styles from "./MemberOrganisationsAdminPage.module.scss";
import {
  organisationTypes,
  type MemberOrganisation,
  type OrganisationType,
} from "@/lib/member-organisations";

interface OrganisationsResponse {
  organisations: MemberOrganisation[];
  persistence: string;
  message?: string;
}

const typeLabels: Record<OrganisationType, string> = {
  union: "Union",
  "industry-body": "Industry body",
  "professional-association": "Professional association",
};

const emptyForm = {
  name: "",
  type: "union" as OrganisationType,
  partner: true,
  notes: "",
};

export default function MemberOrganisationsAdminPage() {
  const [organisations, setOrganisations] = useState<MemberOrganisation[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      try {
        const response = await fetch("/api/member-organisations", { cache: "no-store" });
        const payload = (await response.json()) as OrganisationsResponse;

        if (!response.ok) {
          throw new Error(payload.message ?? "Unable to load organisations.");
        }

        if (isMounted) {
          setOrganisations(payload.organisations);
        }
      } catch (nextError) {
        if (isMounted) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load organisations.");
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

  const startEdit = (org: MemberOrganisation) => {
    setEditingId(org.id);
    setForm({ name: org.name, type: org.type, partner: org.partner, notes: org.notes });
    setStatus(null);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setStatus(null);
    setError(null);

    try {
      const response = await fetch(
        editingId ? `/api/member-organisations/${editingId}` : "/api/member-organisations",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const payload = (await response.json()) as OrganisationsResponse;

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to save organisation.");
      }

      setOrganisations(payload.organisations);
      setStatus(editingId ? `Updated ${form.name}.` : `Added ${form.name}.`);
      cancelEdit();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to save organisation.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (org: MemberOrganisation) => {
    setIsSaving(true);
    setStatus(null);
    setError(null);

    try {
      const response = await fetch(`/api/member-organisations/${org.id}`, { method: "DELETE" });
      const payload = (await response.json()) as OrganisationsResponse;

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to delete organisation.");
      }

      setOrganisations(payload.organisations);
      setStatus(`Removed ${org.name}.`);

      if (editingId === org.id) {
        cancelEdit();
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to delete organisation.");
    } finally {
      setIsSaving(false);
    }
  };

  const partnerCount = organisations.filter((org) => org.partner).length;

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1>Member organisations</h1>
            <p>
              Sellers select their organisation at sign-up. Members of <strong>partner</strong>{" "}
              organisations use Settled free; everyone else pays $99/month.
            </p>
          </div>
          <nav className={styles.headerLinks}>
            <Link href="/sell">Seller portal</Link>
            <Link href="/admin/stage-content">Content editor</Link>
            <Link href="/admin/seller-journey">Journey admin</Link>
          </nav>
        </header>

        {isLoading ? (
          <p className={styles.note}>Loading organisations...</p>
        ) : (
          <>
            <p className={styles.note}>
              {organisations.length} organisations &middot; {partnerCount} partners
            </p>

            <section className={styles.panel}>
              <h2>{editingId ? "Edit organisation" : "Add organisation"}</h2>
              <form className={styles.form} onSubmit={handleSubmit}>
                <label className={styles.field}>
                  <span>Name</span>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </label>
                <div className={styles.fieldRow}>
                  <label className={styles.field}>
                    <span>Type</span>
                    <select
                      value={form.type}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, type: e.target.value as OrganisationType }))
                      }
                    >
                      {organisationTypes.map((type) => (
                        <option key={type} value={type}>
                          {typeLabels[type]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.checkboxField}>
                    <input
                      checked={form.partner}
                      onChange={(e) => setForm((f) => ({ ...f, partner: e.target.checked }))}
                      type="checkbox"
                    />
                    <span>
                      Partner organisation <em>(members join free)</em>
                    </span>
                  </label>
                </div>
                <label className={styles.field}>
                  <span>Notes (optional)</span>
                  <input
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </label>
                <div className={styles.formActions}>
                  <button className={styles.saveButton} disabled={isSaving} type="submit">
                    {isSaving ? "Working..." : editingId ? "Save changes" : "Add organisation"}
                  </button>
                  {editingId ? (
                    <button className={styles.ghostButton} onClick={cancelEdit} type="button">
                      Cancel
                    </button>
                  ) : null}
                </div>
              </form>
            </section>

            {status ? <p className={styles.statusOk}>{status}</p> : null}
            {error ? <p className={styles.statusError}>{error}</p> : null}

            <section className={styles.list}>
              {organisations.map((org) => (
                <article className={styles.orgCard} key={org.id}>
                  <div className={styles.orgInfo}>
                    <div className={styles.orgTitleRow}>
                      <strong>{org.name}</strong>
                      <span className={org.partner ? styles.partnerBadge : styles.standardBadge}>
                        {org.partner ? "Partner — free for members" : "Non-partner — $99/month"}
                      </span>
                    </div>
                    <p>
                      {typeLabels[org.type]}
                      {org.notes ? <> &middot; {org.notes}</> : null}
                    </p>
                  </div>
                  <div className={styles.orgActions}>
                    <button className={styles.ghostButton} onClick={() => startEdit(org)} type="button">
                      Edit
                    </button>
                    <button
                      className={styles.dangerButton}
                      disabled={isSaving}
                      onClick={() => handleDelete(org)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
