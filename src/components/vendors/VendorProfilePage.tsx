"use client";

import SettledLogo from "@/components/common/SettledLogo";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import styles from "./VendorProfilePage.module.scss";
import type { AssociatedService, ServiceVendor } from "@/lib/seller-journey";

interface VendorProfilePageProps {
  vendor: ServiceVendor;
  service: AssociatedService;
  stageLabel: string;
}

export default function VendorProfilePage({ vendor, service, stageLabel }: VendorProfilePageProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!name.trim() || !phone.trim()) {
      return;
    }

    // Stub: no backend yet. Enquiries will route into the partner network once integrated.
    setSubmitted(true);
  };

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.topBar}>
          <Link href="/sell">
            <SettledLogo priority width={140} height={70} />
          </Link>
          <Link className={styles.backLink} href="/sell">
            ‹ Back to your sale
          </Link>
        </header>

        <section className={styles.card}>
          <div className={styles.badges}>
            <span className={styles.badge}>{service.category}</span>
            <span className={styles.badge}>{stageLabel} step</span>
          </div>
          <div className={styles.titleRow}>
            <h1>{vendor.name}</h1>
            <span className={styles.rating}>{vendor.rating.toFixed(1)} ★</span>
          </div>
          <p className={styles.blurb}>{vendor.blurb}</p>
          <div className={styles.serviceBox}>
            <strong>{service.name}</strong>
            <p>{service.description}</p>
            <span className={styles.cost}>{service.typicalCost}</span>
          </div>
          <p className={styles.comingSoon}>
            Full vendor profiles — availability, service areas, reviews, and instant quotes — are
            coming soon through the Settled partner network.
          </p>
        </section>

        <section className={styles.card}>
          <h2>Request a quote</h2>
          {submitted ? (
            <p className={styles.thanks}>
              Thanks {name.trim()}! We&apos;ve noted your interest in {vendor.name}. Once the
              partner network is live, enquiries will go straight to vendors operating in your
              area — for now, your agent or concierge will follow up.
            </p>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              <label className={styles.field}>
                <span>Your name</span>
                <input required value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className={styles.field}>
                <span>Phone or email</span>
                <input required value={phone} onChange={(e) => setPhone(e.target.value)} />
              </label>
              <label className={styles.field}>
                <span>What do you need? (optional)</span>
                <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
              </label>
              <button className={styles.submit} type="submit">
                Send enquiry
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
