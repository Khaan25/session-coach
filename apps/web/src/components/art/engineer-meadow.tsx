"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useMotionPreference } from "@/hooks/use-motion-preference";

/** Independent illustrated layers: the engineer stays still while foliage and the agent move. */
export function EngineerMeadow({ placement = "landing" }: { placement?: "landing" | "dashboard" }) {
  const id = useId(),
    root = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(false);
  const reduced = useMotionPreference();
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    let visible = false;
    const update = () => setActive(visible && !document.hidden);
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        update();
      },
      { threshold: 0.15 },
    );
    observer.observe(node);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  const plate = "/art/companion/engineer-meadow-v6.webp";
  return (
    <span
      ref={root}
      className="studio-engineer-meadow meadow-living"
      data-running={active && !reduced}
      data-placement={placement}
      aria-hidden="true"
    >
      <svg viewBox="0 0 2172 724" width="2172" height="724" fill="none">
        <defs>
          <clipPath id={`${id}-center`}>
            <rect x="610" y="0" width="970" height="724" />
          </clipPath>
          <clipPath id={`${id}-left`}>
            <rect x="0" y="0" width="635" height="724" />
          </clipPath>
          <clipPath id={`${id}-right`}>
            <rect x="1560" y="0" width="612" height="724" />
          </clipPath>
        </defs>
        <image href={plate} width="2172" height="724" clipPath={`url(#${id}-center)`} />
        <g className="meadow-grass-left">
          <image href={plate} width="2172" height="724" clipPath={`url(#${id}-left)`} />
        </g>
        <g className="meadow-grass-right">
          <image href={plate} width="2172" height="724" clipPath={`url(#${id}-right)`} />
        </g>
        <ellipse className="meadow-pet-shadow" cx="1360" cy="681" rx="95" ry="13" />
        <g className="meadow-pet">
          <image href="/art/companion/agent-v6.webp" x="1110" y="255" width="480" height="439" />
        </g>
      </svg>
    </span>
  );
}
