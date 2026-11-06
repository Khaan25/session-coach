"use client";

import { useEffect, useRef, useState } from "react";
import type { DecisionScene, SculptureChapter } from "./decision-renderer";

export function DecisionSculpture({
  chapter = "session",
  variant = "hero",
}: {
  chapter?: SculptureChapter;
  variant?: "hero" | "ambient";
}) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<DecisionScene | null>(null);
  const pending = useRef<SculptureChapter>(chapter);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    pending.current = chapter;
    controller.current?.setChapter(chapter);
  }, [chapter]);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let cancelled = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        Promise.all([import("./decision-renderer"), document.fonts.ready])
          .then(([module]) => {
            if (cancelled) return;
            try {
              controller.current = module.createDecisionScene(element, pending.current);
              setReady(true);
            } catch {
              /* The static illustration remains available without WebGL. */
            }
          })
          .catch(() => {});
      },
      { rootMargin: "160px" },
    );
    observer.observe(element);
    return () => {
      cancelled = true;
      observer.disconnect();
      controller.current?.dispose();
      controller.current = null;
    };
  }, []);
  return (
    <div
      className="decision-sculpture"
      data-variant={variant}
      data-ready={ready}
      data-chapter={chapter}
      aria-hidden
    >
      <div className="sculpture-fallback">
        <svg viewBox="0 0 640 440" fill="none">
          <ellipse
            cx="320"
            cy="220"
            rx="190"
            ry="105"
            stroke="currentColor"
            strokeWidth="23"
            transform="rotate(-12 320 220)"
          />
          <g fill="var(--sculpture-paper)" stroke="var(--sculpture-ink)" strokeWidth="2">
            <circle cx="153" cy="187" r="24" />
            <circle cx="402" cy="125" r="24" />
            <circle cx="395" cy="302" r="24" />
          </g>
        </svg>
      </div>
      <div className="sculpture-canvas" ref={host} />
    </div>
  );
}
