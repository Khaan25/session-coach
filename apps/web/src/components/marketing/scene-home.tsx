"use client";

import { useRef } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowDownIcon, ArrowRightIcon, ArrowUpRightIcon, CheckIcon } from "@phosphor-icons/react";
import { CinematicJourney } from "@/components/marketing/cinematic-journey";
import { DecisionSculpture } from "@/components/art/decision-sculpture";
import { buttonVariants } from "@/components/ui/button";

export function SceneHome() {
  const root = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger);
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-opening]", {
          y: 28,
          opacity: 0,
          duration: 1,
          stagger: 0.12,
          ease: "power3.out",
          clearProps: "all",
        });
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) =>
          gsap.from(element, {
            y: 35,
            opacity: 0,
            duration: 0.9,
            ease: "power3.out",
            clearProps: "all",
            scrollTrigger: { trigger: element, start: "top 92%", once: true },
          }),
        );
        gsap.fromTo(
          ".continuity-line",
          { strokeDashoffset: 1800 },
          {
            strokeDashoffset: 0,
            ease: "none",
            scrollTrigger: {
              trigger: ".flow-continuity",
              start: "top 85%",
              end: "bottom 65%",
              scrub: 1.2,
            },
          },
        );
      });
      return () => media.revert();
    },
    { scope: root },
  );
  return (
    <div className="flow-home" ref={root}>
      <section className="flow-opening" aria-labelledby="hero-title">
        <div className="flow-opening-title">
          <p className="flow-eyebrow" data-opening>
            <span />
            SESSION COACH / THE THINKING BEHIND YOUR CODE
          </p>
          <h1 id="hero-title" data-opening>
            Build it.
            <br />
            <em>Understand it.</em>
          </h1>
        </div>
        <div className="flow-opening-aside" data-opening>
          <p>
            Your agent helps you ship.
            <br /> We help the reasoning stay.
          </p>
          <span>
            Turn your Claude Code sessions into decisions you can explain, remember, and use again.
          </span>
          <Link href="/sign-up" className={buttonVariants({ variant: "flow", size: "lg" })}>
            Start your learning loop
            <ArrowUpRightIcon aria-hidden data-icon="inline-end" />
          </Link>
          <a href="#the-journey" className="flow-watch-link">
            Watch the thinking unfold
            <ArrowDownIcon aria-hidden />
          </a>
        </div>
      </section>
      <section
        id="the-journey"
        className="flow-journey"
        aria-label="An illustrated journey from session to understanding"
      >
        <CinematicJourney />
      </section>
      <section className="flow-continuity" aria-labelledby="continuity-title">
        <svg
          className="continuity-route"
          viewBox="0 0 1440 1000"
          preserveAspectRatio="none"
          fill="none"
          aria-hidden
        >
          <path
            className="continuity-guide"
            d="M1420 -40C1300 150 1440 340 1180 380S660 270 700 560S1000 850 940 1040"
          />
          <path
            className="continuity-line"
            d="M1420 -40C1300 150 1440 340 1180 380S660 270 700 560S1000 850 940 1040"
          />
        </svg>
        <div className="flow-continuity-copy" data-reveal>
          <p className="flow-eyebrow">YOUR WORK IS ALREADY THE CURRICULUM.</p>
          <h2 id="continuity-title">
            Keep the useful
            <br />
            <em>part of the session.</em>
          </h2>
          <p>
            You don’t need to start somewhere else. The choices in your code become the questions.
            Your explanation becomes the learning.
          </p>
          <Link href="/how-it-works" className="flow-underlined-link">
            A closer look at the method
            <ArrowUpRightIcon aria-hidden />
          </Link>
        </div>
        <div className="flow-continuity-object" data-reveal>
          <DecisionSculpture chapter="review" variant="hero" />
          <div className="continuity-caption">
            <span>CAPTURE</span>
            <span>EXPLAIN</span>
            <span>REVISIT</span>
          </div>
          <p>
            One continuous loop.
            <br />A little more understanding, each time.
          </p>
        </div>
        <div className="flow-real-facts" data-reveal>
          <span>
            <strong>Up to 5</strong>decisions from a session
          </span>
          <span>
            <strong>1 · 3 · 7</strong>day gaps between revisits
          </span>
          <span>
            <strong>Your words.</strong>before the answer is revealed
          </span>
        </div>
      </section>
      <section className="flow-source" aria-labelledby="source-title">
        <div className="flow-source-heading" data-reveal>
          <p className="flow-eyebrow">CONTEXT IN. GUESSWORK OUT.</p>
          <h2 id="source-title">
            A reason should
            <br />
            <em>lead somewhere.</em>
          </h2>
          <p>
            Every quote is checked against the session. A model inference is labeled. A quote that
            can’t be verified is flagged.
          </p>
        </div>
        <figure className="flow-evidence-illustration" data-reveal>
          <svg viewBox="0 0 680 500" fill="none" aria-hidden>
            <path className="source-paper-outline" d="M94 57L539 80L570 432L75 408Z" />
            <path
              className="source-sheet-line"
              d="M134 146L491 162M130 186L495 202M126 226L499 242M122 266L503 282M118 306L507 322M114 346L511 362"
            />
            <path className="source-highlight" d="M126 226L499 242" />
            <text
              x="143"
              y="128"
              className="source-illustration-label"
              transform="rotate(3 143 128)"
            >
              SESSION EXCERPT / EVENT 2
            </text>
            <text
              x="137"
              y="237"
              className="source-illustration-quote"
              transform="rotate(3 137 237)"
            >
              “matching the project’s convention”
            </text>
            <path className="source-annotation-line" d="M452 266C600 234 633 345 527 369" />
            <path className="source-annotation-line" d="M538 353L524 371L548 375" />
            <circle cx="514" cy="387" r="48" className="source-verified-circle" />
            <path className="source-verified-check" d="M494 387L509 400L535 374" />
            <path
              className="source-star"
              d="M588 103V137M571 120H605M576 108L600 132M600 108L576 132"
            />
          </svg>
          <figcaption>
            <CheckIcon aria-hidden />
            An exact quote, attached to the choice.
          </figcaption>
        </figure>
        <div className="flow-privacy-note" data-reveal>
          <span className="privacy-loop-symbol" aria-hidden>
            ↗
          </span>
          <div>
            <h3>Care for the context.</h3>
            <p>
              Secrets are filtered on your laptop and again on the server before storage. See
              exactly what is kept.
            </p>
          </div>
          <Link href="/privacy" className="flow-underlined-link">
            Privacy policy
            <ArrowUpRightIcon aria-hidden />
          </Link>
        </div>
      </section>
      <section className="flow-finale" data-reveal>
        <p className="flow-eyebrow">YOUR NEXT SESSION IS A STARTING POINT.</p>
        <h2>
          More than code.
          <br />
          <em>Something that stays.</em>
        </h2>
        <Link href="/sign-up" className={buttonVariants({ variant: "flow", size: "lg" })}>
          Make the thinking yours
          <ArrowRightIcon aria-hidden data-icon="inline-end" />
        </Link>
        <span>Free during the trial.</span>
        <div className="finale-drawing" aria-hidden>
          <svg viewBox="0 0 600 150" fill="none">
            <path d="M-20 95C105 190 150 -42 288 52S426 178 620 56" />
            <circle cx="288" cy="52" r="18" />
            <path d="M279 52L285 58L296 46" />
          </svg>
        </div>
      </section>
    </div>
  );
}
