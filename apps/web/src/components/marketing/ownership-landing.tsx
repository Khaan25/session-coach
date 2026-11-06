import Link from "next/link";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  CheckIcon,
  CodeIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react/ssr";
import { EngineerMeadow } from "@/components/art/engineer-meadow";
import { HandUnderline } from "@/components/marketing/hand-underline";
import { OwnershipProductTour } from "@/components/marketing/ownership-product-tour";
import { QuoteCheck } from "@/components/marketing/quote-check";
import { RedactionDemo } from "@/components/marketing/redaction-demo";
import { ReviewSchedule } from "@/components/marketing/review-schedule";
import { FooterScene } from "@/components/marketing/site-footer";
import { buttonVariants } from "@/components/ui/button";
export function OwnershipLanding() {
  return (
    <div className="studio-home">
      <section className="studio-hero" aria-labelledby="hero-title">
        <div className="studio-hero-grid" aria-hidden />
        <div className="studio-first-frame">
          <div className="studio-hero-copy">
            <p className="studio-hero-signature">
              <span>Built with AI</span>
              <em>Understood by you</em>
            </p>
            <h1 id="hero-title">
              <span className="studio-own-word">
                <em>Own</em>
                <HandUnderline className="studio-hand-underline" />
              </span>{" "}
              the code&nbsp;
              <br />
              your agent writes.
            </h1>
            <p className="studio-hero-description">Keep the thinking behind every choice.</p>
          </div>
          <EngineerMeadow />
          <div className="studio-hero-footer">
            <div className="studio-hero-actions">
              <Link href="/sign-up" className={buttonVariants({ size: "lg" })}>
                Get started <ArrowRightIcon aria-hidden />
              </Link>
              <a
                href="#your-learning-journey"
                className={buttonVariants({ variant: "secondary", size: "lg" })}
              >
                See how it works
              </a>
            </div>
            <p className="studio-hero-note">
              Free during the trial · Built for Claude Code sessions
            </p>
          </div>
        </div>
        <OwnershipProductTour />
        <div className="studio-truth-strip">
          <span>
            <CodeIcon aria-hidden />
            From the code you build
          </span>
          <span>
            <CheckIcon aria-hidden />
            Explained in your own words
          </span>
          <span>
            <ShieldCheckIcon aria-hidden />
            Grounded in your sessions
          </span>
        </div>
      </section>
      <section
        className="studio-section studio-loop"
        id="your-learning-loop"
        aria-labelledby="loop-title"
      >
        <div className="studio-section-heading">
          <p className="studio-eyebrow">01 / KEEP THE REASON</p>
          <h2 id="loop-title">
            A few minutes now.
            <br />
            <span>A reason that stays.</span>
          </h2>
          <p>
            Your agent helps you build; a few minutes of recall help the reasoning stay with you.
          </p>
        </div>
        <div className="studio-loop-scene">
          <div className="studio-schedule-surface">
            <ReviewSchedule />
          </div>
        </div>
      </section>
      <section className="studio-section studio-evidence" aria-labelledby="evidence-title">
        <div className="studio-section-heading">
          <p className="studio-eyebrow">02 / FOLLOW THE EVIDENCE</p>
          <h2 id="evidence-title">
            The reason, in context.
            <br />
            <span>Straight from your session.</span>
          </h2>
          <p>The supporting quote stays with every decision.</p>
        </div>
        <div className="studio-proof-layout">
          <div className="studio-demo-surface" data-tone="blue">
            <QuoteCheck />
          </div>
          <div className="studio-proof-copy">
            <h3>
              Read the choice.
              <br />
              See the reason.
            </h3>
            <p>Explain it yourself, then compare.</p>
            <Link href="/how-it-works" className="studio-text-link">
              A closer look at a decision <ArrowUpRightIcon aria-hidden />
            </Link>
          </div>
        </div>
      </section>
      <section className="studio-section studio-care" aria-labelledby="care-title">
        <div className="studio-proof-copy">
          <p className="studio-eyebrow">03 / KEEP YOUR CONTEXT PRIVATE</p>
          <h2 id="care-title">
            Keep the thinking.
            <br />
            <span>Leave the secrets out.</span>
          </h2>
          <p>Secrets are filtered on your laptop and again before storage.</p>
          <Link href="/privacy" className="studio-text-link">
            See what is kept <ArrowUpRightIcon aria-hidden />
          </Link>
        </div>
        <div className="studio-demo-surface" data-tone="violet">
          <RedactionDemo />
        </div>
      </section>
      <section className="studio-section studio-closing">
        <p className="studio-eyebrow">BUILT WITH AN AGENT. UNDERSTOOD BY YOU.</p>
        <h2>
          Your next session.
          <br />
          <span>Something that stays.</span>
        </h2>
        <Link href="/sign-up" className={buttonVariants({ size: "lg" })}>
          Make the thinking yours <ArrowRightIcon aria-hidden />
        </Link>
        <p>Free during the trial.</p>
      </section>
      <div className="studio-desk-scene">
        <FooterScene />
      </div>
    </div>
  );
}
