import SettledLogo from "@/components/common/SettledLogo";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  actorLabels,
  getForwardTransition,
  journeyStates,
  sampleJourney,
  stateMeta,
  type JourneyActor,
} from "@/lib/seller-journey";
import { isDemoMode } from "@/lib/session";
import styles from "./LandingPage.module.scss";

// The two ways in. Keep in step with startStateByRole in /api/demo/start.
function SideCta({
  demo,
  role,
  className,
  children,
}: {
  demo: boolean;
  role: JourneyActor;
  className: string;
  children: ReactNode;
}) {
  // In demo mode each start resets the sample sale to that side's opening step.
  if (demo) {
    return (
      <form action="/api/demo/start" className={styles.ctaForm} method="post">
        <input name="role" type="hidden" value={role} />
        <button className={className} type="submit">
          {children}
        </button>
      </form>
    );
  }

  return (
    <Link className={className} href={`/sell?role=${role}`}>
      {children}
    </Link>
  );
}

const services: { name: string; step: number; icon: ReactNode }[] = [
  {
    name: "Photography",
    step: 3,
    icon: (
      <>
        <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
        <circle cx="12" cy="13" r="3.5" />
      </>
    ),
  },
  {
    name: "Styling",
    step: 4,
    icon: (
      <>
        <path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3" />
        <path d="M3 12a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v5H3z" />
        <path d="M6 17v2M18 17v2" />
      </>
    ),
  },
  {
    name: "Building & pest",
    step: 4,
    icon: (
      <>
        <circle cx="11" cy="11" r="6" />
        <path d="M20 20l-4.5-4.5" />
      </>
    ),
  },
  {
    name: "Conveyancing",
    step: 7,
    icon: (
      <>
        <path d="M7 3h7l5 5v13H7z" />
        <path d="M14 3v5h5M10 13h6M10 17h4" />
      </>
    ),
  },
  {
    name: "Removalists",
    step: 8,
    icon: (
      <>
        <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" />
        <circle cx="7" cy="17.5" r="1.5" />
        <circle cx="17" cy="17.5" r="1.5" />
      </>
    ),
  },
  {
    name: "Utilities connection",
    step: 8,
    icon: <path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4" />,
  },
];

const seats: { name: string; detail: string }[] = [
  { name: "Seller", detail: "Where the sale is up to, and what's needed from them." },
  { name: "Agent", detail: "The tasks they own, with compliance notes for each stage." },
  { name: "Concierge", detail: "Matching agents, publishing the listing, closing out settlement." },
];

export default function LandingPage() {
  const demo = isDemoMode();

  // The previews show the product's real step 2, so they stay in sync with it.
  const matching = stateMeta.agent_matching;
  const matchingStep = journeyStates.indexOf("agent_matching") + 1;
  const waitingOn = getForwardTransition("agent_matching");

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <Link aria-label="Settled home" className={styles.logoLink} href="/">
            <SettledLogo height={56} priority width={112} />
          </Link>
          <nav aria-label="Main" className={styles.nav}>
            <a className={styles.navLink} href="#how">
              How it works
            </a>
            <a className={styles.navLink} href="#pricing">
              Pricing
            </a>
            <Link className={styles.signIn} href="/signin">
              Sign in
            </Link>
          </nav>
        </header>

        <section className={styles.hero}>
          <span className={styles.eyebrow}>
            <span aria-hidden="true" className={styles.eyebrowDot} />
            For home sellers and their agents
          </span>
          <h1 className={styles.headline}>Every step of the sale, in one place.</h1>
          <p className={styles.lede}>
            Settled walks a seller and their agent through the whole sale — from the first
            conversation to settlement — with a clear next step, help for every stage, and trusted
            local services when they&apos;re needed.
          </p>
          <div className={styles.ctas}>
            <SideCta className={styles.ctaPrimary} demo={demo} role="seller">
              Explore as a seller
            </SideCta>
            <SideCta className={styles.ctaSecondary} demo={demo} role="agent">
              Explore as an agent
            </SideCta>
          </div>
          {demo ? (
            <p className={styles.demoNote}>
              Each start resets the sample sale at {sampleJourney.propertyAddress}. Switch sides any
              time from the tabs at the top of the portal.
            </p>
          ) : null}
        </section>

        <div className={styles.bento} id="how">
          <section className={`${styles.tile} ${styles.tileDark} ${styles.tWho}`}>
            <span className={styles.labelOnDark}>Two sides, one sale</span>
            <h2 className={styles.tileHeadingLarge}>Everyone knows whose move it is.</h2>
            <p className={styles.bodyOnDark}>
              The seller and their agent see the same sale from their own side — what&apos;s
              theirs to do, and who the sale is waiting on.
            </p>
            <div aria-hidden="true" className={styles.whoPreview}>
              <div className={styles.whoTop}>
                <strong>{matching.label}</strong>
                <span className={styles.monoGold}>
                  STEP {matchingStep} OF {journeyStates.length}
                </span>
              </div>
              <div className={styles.segments}>
                {journeyStates.map((state, index) => (
                  <span
                    className={index < matchingStep ? styles.segmentOn : styles.segmentOff}
                    key={state}
                  />
                ))}
              </div>
              {waitingOn ? (
                <div className={styles.waiting}>
                  <span className={styles.waitingText}>
                    <strong>Waiting on the {actorLabels[waitingOn.actor].toLowerCase()}</strong>
                    <span>{waitingOn.detail}</span>
                  </span>
                  <span className={styles.fakeButtonLight}>
                    Switch to {actorLabels[waitingOn.actor]} ›
                  </span>
                </div>
              ) : null}
            </div>
          </section>

          <section className={`${styles.tile} ${styles.tSteps}`}>
            <div className={styles.tileIntro}>
              <span className={styles.label}>The whole sale</span>
              <h2 className={styles.tileHeading}>Eight steps, from first chat to settlement.</h2>
            </div>
            <ol className={styles.steps}>
              {journeyStates.map((state, index) => (
                <li className={state === "settled" ? styles.stepFinal : styles.step} key={state}>
                  <span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span>
                  <span className={styles.stepName}>{stateMeta[state].label}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className={`${styles.tile} ${styles.tileCompact} ${styles.tVideo}`}>
            <div aria-hidden="true" className={styles.videoPreview}>
              <span className={styles.playCircle}>
                <svg height="20" viewBox="0 0 24 24" width="20">
                  <path d="M8 5.5v13l11-6.5z" />
                </svg>
              </span>
              <span className={styles.duration}>{matching.helpVideo.durationMinutes} MIN</span>
            </div>
            <div className={styles.mediaText}>
              <h2 className={styles.tileHeadingSmall}>A short video at every step</h2>
              <p className={styles.small}>
                Like “{matching.helpVideo.title}” at step {matchingStep}.
              </p>
            </div>
          </section>

          <section className={`${styles.tile} ${styles.tileCompact} ${styles.tGuide}`}>
            <div aria-hidden="true" className={styles.guidePreview}>
              <span className={styles.guidePage}>
                <span className={styles.guideTag}>PDF</span>
              </span>
            </div>
            <div className={styles.mediaText}>
              <h2 className={styles.tileHeadingSmall}>And a one-page guide</h2>
              <p className={styles.small}>Like the {matching.helpGuide.title.toLowerCase()}.</p>
            </div>
          </section>

          <section className={`${styles.tile} ${styles.tChooser}`}>
            <div className={styles.tileIntro}>
              <span className={styles.label}>
                Step {matchingStep} · {matching.label}
              </span>
              <h2 className={styles.tileHeading}>Choose your agent from a local shortlist.</h2>
            </div>
            <div aria-hidden="true" className={styles.candidates}>
              {sampleJourney.agentCandidates.map((candidate) => (
                <div className={styles.candidate} key={candidate.id}>
                  <span className={styles.candidateInfo}>
                    <strong>{candidate.name}</strong>
                    <span>
                      {candidate.suburb} · {candidate.specialty}
                    </span>
                  </span>
                  <span className={styles.rating}>{candidate.rating.toFixed(1)}</span>
                  <span className={styles.fakeButton}>Appoint {candidate.name.split(" ")[0]}</span>
                </div>
              ))}
            </div>
          </section>

          <section className={`${styles.tile} ${styles.tileTint} ${styles.tServices}`}>
            <div className={styles.tileIntro}>
              <span className={styles.labelOnTint}>Local services</span>
              <h2 className={styles.tileHeadingMedium}>Trusted help, right at the step you need it.</h2>
            </div>
            <ul className={styles.services}>
              {services.map((service) => (
                <li className={styles.service} key={service.name}>
                  <svg aria-hidden="true" className={styles.serviceIcon} height="20" viewBox="0 0 24 24" width="20">
                    {service.icon}
                  </svg>
                  <span className={styles.serviceName}>{service.name}</span>
                  <span className={styles.serviceStep}>STEP {service.step}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className={`${styles.tile} ${styles.tPricing}`} id="pricing">
            <span className={styles.label}>Pricing</span>
            <strong className={styles.price}>$0</strong>
            <p className={styles.priceText}>for members of a partner union or professional body.</p>
            <p className={styles.priceOther}>
              <strong>$99 a month</strong> for everyone else.
            </p>
          </section>

          <section className={`${styles.tile} ${styles.tSeats}`}>
            <div className={styles.tileIntro}>
              <span className={styles.label}>Three seats at the table</span>
              <h2 className={styles.tileHeading}>One sale, seen from each side.</h2>
            </div>
            <div className={styles.seats}>
              {seats.map((seat) => (
                <div className={styles.seat} key={seat.name}>
                  <strong>{seat.name}</strong>
                  <span>{seat.detail}</span>
                </div>
              ))}
            </div>
          </section>

          <section className={`${styles.tile} ${styles.tileInk} ${styles.tSignIn}`}>
            <span className={styles.labelOnInk}>Sign in</span>
            <h2 className={styles.tileHeadingInk}>No passwords. Just your mobile.</h2>
            <span aria-hidden="true" className={styles.phonePreview}>
              0400 123 456
            </span>
            <Link className={styles.signInTile} href="/signin">
              We text you a one-time code →
            </Link>
          </section>
        </div>

        <section className={styles.closing}>
          <h2 className={styles.closingHeading}>Pick a side and walk the whole sale.</h2>
          <div className={styles.ctas}>
            <SideCta className={styles.ctaOnAccent} demo={demo} role="seller">
              Explore as a seller
            </SideCta>
            <SideCta className={styles.ctaOutlineOnAccent} demo={demo} role="agent">
              Explore as an agent
            </SideCta>
          </div>
        </section>

        <footer className={styles.footer}>
          <span>Settled — Property Solved</span>
          <Link className={styles.footerLink} href="/signin">
            Sign in
          </Link>
        </footer>
      </div>
    </main>
  );
}
