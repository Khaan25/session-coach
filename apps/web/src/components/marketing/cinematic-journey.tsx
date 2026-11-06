"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { PauseIcon, PlayIcon } from "@phosphor-icons/react";
import { useMotionPreference } from "@/hooks/use-motion-preference";

const scenes = [
  {
    label: "The work",
    title: "A session ends. The thinking begins.",
    description:
      "Your Claude Code session is the starting point. A few useful decisions emerge from the work.",
  },
  {
    label: "The reason",
    title: "One choice. A reason you can trace.",
    description:
      "Exact quotes connect a decision to the session. Model inferences are labeled, and unverified quotes are flagged.",
  },
  {
    label: "Your words",
    title: "A little space to think for yourself.",
    description:
      "Try the question before seeing the why. Your explanation opens the reasoning, evidence, and feedback.",
  },
  {
    label: "What stays",
    title: "The same idea. A clearer explanation.",
    description:
      "Return after gaps of 1, 3, and 7 days. Your score adjusts the next review; an honest skip returns tomorrow.",
  },
];
const DURATION = 8;

/** One continuous, automatically played illustration. Real learner data never enters this scene. */
export function CinematicJourney() {
  const root = useRef<HTMLDivElement>(null);
  const animation = useRef<gsap.core.Timeline | null>(null);
  const manuallyPaused = useRef(false);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useMotionPreference();
  const uid = useId().replaceAll(":", "");

  useGSAP(
    () => {
      const element = root.current;
      if (!element || reduced) return;
      const frames = gsap.utils.toArray<HTMLElement>(element.querySelectorAll("[data-film-scene]"));
      const bars = gsap.utils.toArray<HTMLElement>(
        element.querySelectorAll(".film-chapter-progress"),
      );
      gsap.set(frames, { autoAlpha: 0 });
      gsap.set(frames[0], { autoAlpha: 1 });
      const sequence = gsap.timeline({ paused: true, repeat: -1 });
      frames.forEach((frame, index) => {
        const time = index * DURATION;
        sequence.addLabel(`chapter-${index}`, time);
        sequence.call(() => setActive(index), [], time);
        sequence.fromTo(
          frame,
          { autoAlpha: 0, x: 28 },
          { autoAlpha: 1, x: 0, duration: 0.85, ease: "power2.inOut" },
          time,
        );
        sequence.fromTo(
          frame.querySelectorAll(".film-arrive"),
          { y: 22, opacity: 0 },
          { y: 0, opacity: 1, duration: 1.1, stagger: 0.12, ease: "power3.out" },
          time + 0.2,
        );
        const drawings = frame.querySelectorAll(".film-draw");
        if (drawings.length)
          sequence.fromTo(
            drawings,
            { strokeDashoffset: 1600 },
            { strokeDashoffset: 0, duration: 4.8, stagger: 0.12, ease: "power2.inOut" },
            time + 0.15,
          );
        sequence.fromTo(
          frame.querySelectorAll(".film-drift"),
          { y: 6, rotation: -1 },
          {
            y: -7,
            rotation: 1,
            duration: 5.5,
            ease: "sine.inOut",
            transformOrigin: "center center",
          },
          time + 0.8,
        );
        if (index === 0)
          sequence.fromTo(
            frame.querySelectorAll("textPath"),
            { attr: { startOffset: "2%" } },
            { attr: { startOffset: "10%" }, duration: DURATION, ease: "none" },
            time,
          );
        sequence.fromTo(
          bars[index],
          { scaleX: 0 },
          { scaleX: 1, duration: DURATION, ease: "none" },
          time,
        );
        if (index === 2)
          sequence.fromTo(
            element.querySelector(".film-answer-reveal"),
            { attr: { width: 0 } },
            { attr: { width: 850 }, duration: 3.6, ease: "none" },
            time + 1.4,
          );
        sequence.to(
          frame,
          { autoAlpha: 0, x: -22, duration: 0.75, ease: "power2.inOut" },
          time + DURATION - 0.45,
        );
      });
      animation.current = sequence;
      let inView = false;
      const sync = () => sequence.paused(manuallyPaused.current || !inView || document.hidden);
      const observer = new IntersectionObserver(
        ([entry]) => {
          inView = entry.isIntersecting;
          sync();
        },
        { threshold: 0.15 },
      );
      observer.observe(element);
      document.addEventListener("visibilitychange", sync);
      return () => {
        observer.disconnect();
        document.removeEventListener("visibilitychange", sync);
        sequence.kill();
        animation.current = null;
      };
    },
    { scope: root, dependencies: [reduced], revertOnUpdate: true },
  );

  useEffect(() => {
    if (!reduced) return;
    const element = root.current;
    if (!element) return;
    const frames = element.querySelectorAll<HTMLElement>("[data-film-scene]");
    gsap.set(frames, { autoAlpha: 0, x: 0 });
    gsap.set(frames[active], { autoAlpha: 1 });
  }, [active, reduced]);

  function togglePlayback() {
    const next = !paused;
    manuallyPaused.current = next;
    setPaused(next);
    animation.current?.paused(next);
  }
  function chooseScene(index: number) {
    manuallyPaused.current = true;
    setPaused(true);
    setActive(index);
    animation.current?.seek(index * DURATION + 6).pause();
  }

  return (
    <div className="film" ref={root} data-active-scene={active}>
      <div className="film-overline">
        <span>
          <i />
          FROM YOUR SESSION TO YOUR UNDERSTANDING
        </span>
        <span>AN ILLUSTRATED PRODUCT JOURNEY</span>
      </div>
      <div className="film-screen">
        <div className="film-scene" data-film-scene="0" aria-hidden={active !== 0}>
          <svg viewBox="0 0 1200 550" fill="none" aria-hidden>
            <defs>
              <path
                id={`${uid}-ribbon-1`}
                d="M-80 135C160 135 190 230 370 230S590 340 740 265S960 135 1280 210"
              />
              <path
                id={`${uid}-ribbon-2`}
                d="M-80 335C160 405 280 270 450 315S670 395 850 325S1060 285 1280 360"
              />
              <path
                id={`${uid}-ribbon-3`}
                d="M-80 430C160 510 310 425 440 390S600 330 750 360S1030 505 1280 460"
              />
            </defs>
            <ellipse
              className="film-lavender-fill film-arrive"
              cx="614"
              cy="286"
              rx="206"
              ry="194"
            />
            <g className="film-faint-ink" strokeWidth="1">
              <ellipse cx="614" cy="286" rx="170" ry="165" />
              <ellipse cx="614" cy="286" rx="135" ry="165" />
              <ellipse cx="614" cy="286" rx="78" ry="165" />
              <path d="M446 242H780M447 330H780M475 180H753M475 389H753" />
            </g>
            <use href={`#${uid}-ribbon-3`} className="film-line-soft" strokeWidth="27" />
            <use href={`#${uid}-ribbon-2`} className="film-line-coral" strokeWidth="34" />
            <use href={`#${uid}-ribbon-1`} className="film-line-ink" strokeWidth="37" />
            <text className="film-ribbon-type">
              <textPath href={`#${uid}-ribbon-1`} startOffset="8%">
                › build the parser · follow the convention · run the tests · keep the context
              </textPath>
            </text>
            <text className="film-ribbon-dark-type">
              <textPath href={`#${uid}-ribbon-2`} startOffset="10%">
                read · edit · test · discuss · choose · build · read · edit · test · discuss ·
                choose · build
              </textPath>
            </text>
            <g className="film-arrive">
              <circle
                cx="615"
                cy="284"
                r="69"
                className="film-paper-fill film-ink-stroke"
                strokeWidth="2"
              />
              <circle cx="615" cy="284" r="52" className="film-ink-stroke" strokeWidth="1" />
              <path
                className="film-ink-stroke"
                strokeWidth="3"
                strokeLinecap="round"
                d="M592 279L606 291L636 263"
              />
              <path
                className="film-ink-stroke"
                strokeWidth="12"
                strokeLinecap="round"
                d="M665 335L704 375"
              />
            </g>
            <g className="film-drift">
              <path
                className="film-ink-stroke"
                strokeWidth="1.5"
                d="M916 108L935 85L953 108L935 132Z"
              />
              <circle cx="272" cy="105" r="9" className="film-pink-fill" />
              <path
                className="film-ink-stroke"
                strokeWidth="1.5"
                d="M252 437L267 422M252 422L267 437"
              />
            </g>
            <text x="127" y="89" className="film-small-type">
              THE SESSION / A WORKING RECORD
            </text>
            <text x="825" y="440" className="film-script-type film-arrive">
              a few choices worth keeping
            </text>
          </svg>
        </div>
        <div
          className="film-scene film-reason-scene"
          data-film-scene="1"
          aria-hidden={active !== 1}
        >
          <svg viewBox="0 0 1200 550" fill="none" aria-hidden>
            <path
              d="M-20 300C200 300 215 145 432 176S631 442 827 328S1035 215 1230 247"
              className="film-line-coral film-draw"
              strokeWidth="32"
            />
            <path
              d="M-20 300C200 300 215 145 432 176S631 442 827 328S1035 215 1230 247"
              className="film-ink-stroke film-draw"
              strokeWidth="1"
            />
            <g className="film-source-type film-arrive">
              <text x="102" y="141">
                01 / Read the transcript
              </text>
              <text x="102" y="175">
                02 / Keep the useful context
              </text>
              <text x="102" y="209">
                03 / Check the exact quote
              </text>
            </g>
            <g className="film-drift">
              <ellipse
                cx="601"
                cy="270"
                rx="158"
                ry="165"
                className="film-lavender-fill film-ink-stroke"
                strokeWidth="1.5"
              />
              <ellipse
                cx="601"
                cy="270"
                rx="136"
                ry="144"
                className="film-paper-fill film-ink-stroke"
                strokeWidth="1"
              />
              <path
                d="M714 389L785 461"
                className="film-ink-stroke"
                strokeWidth="25"
                strokeLinecap="round"
              />
              <text x="601" y="295" textAnchor="middle" className="film-code-hero">
                .js
              </text>
              <path
                d="M516 330Q600 348 683 330"
                className="film-green-stroke film-draw"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </g>
            <g className="film-arrive">
              <text x="823" y="148" className="film-small-type">
                THE CHOICE
              </text>
              <text x="823" y="194" className="film-medium-type">
                Follow the existing
              </text>
              <text x="823" y="234" className="film-medium-type">
                import convention.
              </text>
              <path d="M825 261H1082" className="film-ink-stroke" strokeWidth="1" />
              <text x="823" y="294" className="film-small-type">
                GROUNDED IN THE SESSION
              </text>
              <text x="823" y="333" className="film-quote-type">
                “matching resultSchema.ts’s
              </text>
              <text x="823" y="364" className="film-quote-type">
                convention”
              </text>
              <circle cx="839" cy="404" r="13" className="film-green-fill" />
              <path d="M833 404L837 408L845 400" className="film-paper-stroke" strokeWidth="2" />
              <text x="863" y="410" className="film-source-type">
                Exact quote verified
              </text>
            </g>
            <text x="155" y="436" className="film-script-type">
              less guessing, more context.
            </text>
          </svg>
        </div>
        <div
          className="film-scene film-answer-scene"
          data-film-scene="2"
          aria-hidden={active !== 2}
        >
          <svg viewBox="0 0 1200 550" fill="none" aria-hidden>
            <defs>
              <clipPath id={`${uid}-answer`}>
                <rect className="film-answer-reveal" x="150" y="208" width="850" height="190" />
              </clipPath>
            </defs>
            <ellipse cx="998" cy="391" rx="200" ry="172" className="film-pink-fill film-arrive" />
            <g className="film-ruled-lines">
              <path d="M150 310H1040M150 375H1040M150 440H1040" />
            </g>
            <text x="150" y="108" className="film-small-type film-arrive">
              THE QUESTION / BEFORE THE REASONING IS REVEALED
            </text>
            <text x="150" y="187" className="film-large-type film-arrive">
              Why use .js extensions?
            </text>
            <g clipPath={`url(#${uid}-answer)`}>
              <text x="166" y="292" className="film-written-answer">
                It follows the import convention
              </text>
              <text x="166" y="356" className="film-written-answer">
                already used in this project.
              </text>
            </g>
            <g transform="translate(941 261) rotate(31)">
              <g className="film-drift">
                <path
                  d="M0 0H22V175L11 204L0 175Z"
                  className="film-lavender-fill film-ink-stroke"
                  strokeWidth="2"
                />
                <path
                  d="M0 24H22M0 166H22M11 30V161"
                  className="film-ink-stroke"
                  strokeWidth="1.5"
                />
                <path d="M7 193L11 204L15 193" className="film-ink-fill" />
                <path
                  d="M3 0V-20Q11 -30 19 -20V0"
                  className="film-coral-fill film-ink-stroke"
                  strokeWidth="2"
                />
              </g>
            </g>
            <path
              d="M186 401C290 423 420 402 534 414"
              className="film-green-stroke film-draw"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <g className="film-arrive">
              <circle cx="198" cy="484" r="15" className="film-green-fill" />
              <path d="M191 484L196 489L205 479" className="film-paper-stroke" strokeWidth="2" />
              <text x="228" y="491" className="film-source-type">
                Your explanation → feedback → the next review
              </text>
            </g>
          </svg>
        </div>
        <div
          className="film-scene film-return-scene"
          data-film-scene="3"
          aria-hidden={active !== 3}
        >
          <svg viewBox="0 0 1200 550" fill="none" aria-hidden>
            <path
              d="M-60 406C180 459 210 187 365 235S485 437 637 351S740 180 900 239S1040 480 1260 359"
              className="film-ink-stroke film-draw"
              strokeWidth="2"
            />
            <path
              d="M-60 420C180 473 210 201 365 249S485 451 637 365S740 194 900 253S1040 494 1260 373"
              className="film-ink-stroke film-draw film-faint-ink"
              strokeWidth="1"
            />
            <g className="film-arrive">
              <text x="113" y="90" className="film-small-type">
                A LITTLE DISTANCE / A CLEARER EXPLANATION
              </text>
              <text x="113" y="148" className="film-medium-type">
                The learning keeps moving.
              </text>
            </g>
            <g className="film-drift">
              <circle
                cx="304"
                cy="258"
                r="82"
                className="film-lavender-fill film-ink-stroke"
                strokeWidth="1.5"
              />
              <text x="304" y="280" textAnchor="middle" className="film-day-number">
                +1
              </text>
              <text x="304" y="383" textAnchor="middle" className="film-source-type">
                EXPLAIN IT
              </text>
            </g>
            <g className="film-drift">
              <circle
                cx="604"
                cy="365"
                r="82"
                className="film-coral-fill film-ink-stroke"
                strokeWidth="1.5"
              />
              <text x="604" y="388" textAnchor="middle" className="film-day-number">
                +3
              </text>
              <text x="604" y="496" textAnchor="middle" className="film-source-type">
                RECALL IT
              </text>
            </g>
            <g className="film-drift">
              <circle
                cx="901"
                cy="242"
                r="82"
                className="film-pink-fill film-ink-stroke"
                strokeWidth="1.5"
              />
              <text x="901" y="266" textAnchor="middle" className="film-day-number">
                +7
              </text>
              <text x="901" y="370" textAnchor="middle" className="film-source-type">
                MAKE IT YOURS
              </text>
            </g>
            <g className="film-arrive">
              <path d="M1031 124L1047 109L1063 124L1047 141Z" className="film-green-fill" />
              <text x="862" y="465" className="film-script-type">
                a reason you can carry.
              </text>
            </g>
          </svg>
        </div>
      </div>
      <div className="film-caption">
        <div>
          <p className="film-scene-count">0{active + 1} / 04</p>
          <h2>{scenes[active].title}</h2>
          <p className="film-caption-description">{scenes[active].description}</p>
        </div>
        <button
          type="button"
          className="film-playback"
          onClick={togglePlayback}
          aria-label={paused ? "Play illustrated journey" : "Pause illustrated journey"}
          disabled={reduced}
        >
          {paused || reduced ? <PlayIcon aria-hidden /> : <PauseIcon aria-hidden />}
          <span>{reduced ? "Still view" : paused ? "Play journey" : "Playing the journey"}</span>
        </button>
      </div>
      <div className="film-chapters" aria-label="Journey chapters">
        {scenes.map((scene, index) => (
          <button
            type="button"
            key={scene.label}
            className="film-chapter"
            aria-pressed={active === index}
            onClick={() => chooseScene(index)}
          >
            <span className="film-chapter-track">
              <i className="film-chapter-progress" />
            </span>
            <span>
              <small>0{index + 1}</small>
              {scene.label}
            </span>
          </button>
        ))}
      </div>
      <span className="film-example-note">
        Illustrative example. Your actual sessions stay in your workspace.
      </span>
    </div>
  );
}
