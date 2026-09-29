import SettledLogo from "@/components/common/SettledLogo";
import Link from "next/link";
import { journeyStates, stateMeta, type JourneyActor, type JourneyState } from "@/lib/seller-journey";
import { isDemoMode } from "@/lib/session";
import styles from "./LandingPage.module.scss";

interface Side {
  role: JourneyActor;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  opensAt: JourneyState;
}

// Keep opensAt in step with startStateByRole in /api/demo/start.
const sides: Side[] = [
  {
    role: "seller",
    eyebrow: "Seller",
    title: "I'm selling my home",
    body: "See where the sale is up to, what happens next, and what's needed from you — with a short video and guide at every step.",
    cta: "Explore as a seller",
    opensAt: "agent_matching",
  },
  {
    role: "agent",
    eyebrow: "Agent",
    title: "I'm the listing agent",
    body: "See the tasks you own, the compliance notes for each stage, and the local services to offer your seller along the way.",
    cta: "Explore as an agent",
    opensAt: "agent_appointed",
  },
];

export default function LandingPage() {
  const demo = isDemoMode();

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.topBar}>
          <SettledLogo priority width={140} height={70} />
          <Link className={styles.signInLink} href="/signin">
            Sign in
          </Link>
        </header>

        <section className={styles.hero}>
          <span className={styles.eyebrow}>For home sellers and their agents</span>
          <h1>Every step of the sale, in one place.</h1>
          <p>
            Settled walks a seller and their agent through the whole sale — from the first
            conversation to settlement — with a clear next step, help for every stage, and trusted
            local services when they&apos;re needed.
          </p>
        </section>

        <div className={styles.sides}>
          {sides.map((side) => {
            const step = journeyStates.indexOf(side.opensAt) + 1;

            return (
              <section className={styles.side} key={side.role}>
                <span className={styles.sideEyebrow}>{side.eyebrow}</span>
                <h2>{side.title}</h2>
                <p>{side.body}</p>
                <span className={styles.opensAt}>
                  Opens at step {step} of {journeyStates.length} · {stateMeta[side.opensAt].label}
                </span>
                {demo ? (
                  <form action="/api/demo/start" method="post">
                    <input name="role" type="hidden" value={side.role} />
                    <button className={styles.cta} type="submit">
                      {side.cta}
                    </button>
                  </form>
                ) : (
                  <Link className={styles.cta} href={`/sell?role=${side.role}`}>
                    {side.cta}
                  </Link>
                )}
              </section>
            );
          })}
        </div>

        <p className={styles.footnote}>
          {demo
            ? "Each start resets the sample sale at 18 Cavendish Street, Coorparoo. Switch sides any time from the tabs at the top of the portal."
            : "Sign in with your mobile number to continue."}
        </p>
      </div>
    </main>
  );
}
