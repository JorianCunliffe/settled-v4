"use client";

import SettledLogo from "@/components/common/SettledLogo";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useEffect, useState } from "react";
import styles from "./SignInPage.module.scss";
import type { MemberOrganisation } from "@/lib/member-organisations";

const NO_ORGANISATION = "none";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/sell";

  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [organisationId, setOrganisationId] = useState<string>(NO_ORGANISATION);
  const [organisations, setOrganisations] = useState<MemberOrganisation[]>([]);
  const [code, setCode] = useState("");
  const [isDemo, setIsDemo] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/member-organisations")
      .then((response) => response.json())
      .then((payload: { organisations?: MemberOrganisation[] }) => {
        setOrganisations(payload.organisations ?? []);
      })
      .catch(() => {
        // The organisation picker just stays empty if the list can't load.
      });
  }, []);

  const selectedOrganisation = organisations.find((org) => org.id === organisationId);
  const requiresPayment =
    organisationId === NO_ORGANISATION || (selectedOrganisation && !selectedOrganisation.partner);

  const handleStart = async (event: FormEvent) => {
    event.preventDefault();
    setIsWorking(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/phone/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const payload = (await response.json()) as { message?: string; demo?: boolean };

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to send the code.");
      }

      setIsDemo(payload.demo ?? false);
      setStep("code");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to send the code.");
    } finally {
      setIsWorking(false);
    }
  };

  const handleCheck = async (event: FormEvent) => {
    event.preventDefault();
    setIsWorking(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/phone/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          code,
          name,
          organisationId: organisationId === NO_ORGANISATION ? null : organisationId,
        }),
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to verify the code.");
      }

      router.push(from);
      router.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to verify the code.");
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <SettledLogo priority width={160} height={80} />
        </div>
        <h1>Sign in to Settled</h1>
        <p className={styles.subtitle}>
          We&apos;ll text a one-time code to your mobile — no passwords.
        </p>

        {step === "phone" ? (
          <form className={styles.form} onSubmit={handleStart}>
            <label className={styles.field}>
              <span>Mobile number</span>
              <input
                autoComplete="tel"
                inputMode="tel"
                placeholder="0400 123 456"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span>Your name (first sign-in only)</span>
              <input
                autoComplete="name"
                placeholder="Jordan Lee"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span>Professional organisation or union</span>
              <select value={organisationId} onChange={(e) => setOrganisationId(e.target.value)}>
                <option value={NO_ORGANISATION}>I&apos;m not a member of an organisation</option>
                {organisations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </label>
            {requiresPayment ? (
              <p className={styles.paymentNote}>
                Members of partner organisations use Settled free. Without a partner membership,
                Settled is <strong>$99/month</strong> — billing is set up after sign-in.
              </p>
            ) : (
              <p className={styles.partnerNote}>
                {selectedOrganisation?.name} is a Settled partner — membership includes free access.
              </p>
            )}
            <button className={styles.submit} disabled={isWorking} type="submit">
              {isWorking ? "Sending..." : "Text me a code"}
            </button>
          </form>
        ) : (
          <form className={styles.form} onSubmit={handleCheck}>
            <p className={styles.codeNote}>
              Enter the 6-digit code sent to <strong>{phone}</strong>.
              {isDemo ? (
                <>
                  {" "}
                  <span className={styles.demoHint}>Demo mode: use code 123456.</span>
                </>
              ) : null}
            </p>
            <label className={styles.field}>
              <span>Verification code</span>
              <input
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
            <button className={styles.submit} disabled={isWorking} type="submit">
              {isWorking ? "Verifying..." : "Verify & sign in"}
            </button>
            <button
              className={styles.backButton}
              onClick={() => {
                setStep("phone");
                setCode("");
                setError(null);
              }}
              type="button"
            >
              Use a different number
            </button>
          </form>
        )}

        {error ? <p className={styles.error}>{error}</p> : null}
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
