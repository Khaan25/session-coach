"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { CodeIcon, PauseIcon, PlayIcon } from "@phosphor-icons/react";
import sample from "@session-coach/shared/fixtures/session.sample.json";
import { useMotionPreference } from "@/hooks/use-motion-preference";
import { DecisionStoryArt } from "@/components/art/decision-story-art";
import { Button } from "@/components/ui/button";

const captions = [
  ["Find the decision", ""],
  ["See the source", ""],
  ["Explain why", ""],
  ["Own it over time", ""],
];
const decision = sample.cards.find((card) => !card.hidden)!;

/** A synthetic decision changes context instead of travelling along a diagram. */
export function OwnershipProductTour() {
  const [step, setStep] = useState(0);
  const [stopped, setStopped] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pageActive, setPageActive] = useState(true);
  const reduced = useMotionPreference();
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.2,
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const update = () => setPageActive(!document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  useEffect(() => {
    if (reduced || stopped || !visible || !pageActive) return;
    const delay = step === 0 ? 1800 : 2600;
    const timer = window.setTimeout(() => setStep((value) => (value + 1) % 4), delay);
    return () => window.clearTimeout(timer);
  }, [reduced, stopped, visible, pageActive, step]);
  const paused = stopped || Boolean(reduced) || !visible || !pageActive;
  const scene = reduced ? 3 : step;
  return (
    <MotionConfig reducedMotion="user">
      <section
        ref={root}
        id="your-learning-journey"
        className="studio-product-tour decision-film"
        data-tour-step={scene}
        data-paused={paused}
        data-reduced={Boolean(reduced)}
        aria-labelledby="story-title"
      >
        <div className="story-heading">
          <div>
            <p className="studio-eyebrow">FROM THE WORK YOU ALREADY DO</p>
            <h2 id="story-title">
              Ship the code.
              <br />
              <em>Keep the thinking.</em>
            </h2>
          </div>
        </div>
        <div className="film-stage">
          <div className="film-meta">
            <span>
              <CodeIcon aria-hidden /> {sample.session.repo} <span> / example journey</span>
            </span>
            <Button
              variant="quiet"
              size="icon"
              disabled={Boolean(reduced)}
              aria-label={stopped ? "Play example" : "Pause example"}
              onClick={() => setStopped((value) => !value)}
            >
              {stopped ? <PlayIcon aria-hidden /> : <PauseIcon aria-hidden />}
            </Button>
          </div>
          <div className="film-caption">
            <span className="film-chapter">0{scene + 1} / 04</span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={scene}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <h3>{captions[scene][0]}</h3>
                <p>{captions[scene][1]}</p>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="film-world">
            <DecisionStoryArt />
          </div>
        </div>
        <p className="sr-only">
          Example decision: {decision.decision}. Its proof is “{decision.evidence[0]?.quote}”.
          Explain why in your own words before feedback appears, then recall on day 1, 4 and 11.
          Correct on day 11 means owned.
        </p>
      </section>
    </MotionConfig>
  );
}
