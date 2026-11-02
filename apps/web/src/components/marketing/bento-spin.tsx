"use client";

import { useState } from "react";

import { Sprite } from "@/components/art/sprite";

// The bento's art: the cards sprite turns once on its vertical axis when pressed (900ms, in-out). Each press
// remounts the sprite so the turn starts again. Reduced motion keeps it still.
export function BentoSpin() {
  const [turns, setTurns] = useState(0);
  return (
    <button
      type="button"
      onClick={() => setTurns((n) => n + 1)}
      aria-label="Turn the cards"
      className="cursor-pointer rounded-soft focus-visible:focus-ring"
    >
      <span
        key={turns}
        className={turns > 0 ? "block animate-spin-y motion-reduce:animate-none" : "block"}
      >
        <Sprite name="cards" className="w-40 sm:w-48" />
      </span>
    </button>
  );
}
