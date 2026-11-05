"use client";

import { PauseIcon, PlayIcon } from "@phosphor-icons/react";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardInset,
  CardTitle,
} from "@/components/ui/card";

// The hero's product film (24 s, muted, seamless loop, in public/video). Under reduced motion it never starts and
// shows its poster, the film's first frame. It plays without sound, so there are no captions to add; everything it
// says is on screen, and the label says it for screen readers. The button pauses it, as WCAG 2.2.2 asks of motion
// that runs longer than 5 seconds.
export function HeroVideo() {
  const video = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion();
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (reduced) el.pause();
    // A browser that blocks autoplay leaves the poster up and the button on Play; nothing else to handle.
    else el.play().catch(() => {});
  }, [reduced]);

  function toggle() {
    const el = video.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  }

  return (
    <Card variant="panel" className="mx-auto w-full max-w-4xl text-start">
      <CardHeader>
        <CardTitle>Session Coach in 24 seconds</CardTitle>
        <CardDescription>From one Claude Code session to a decision you own.</CardDescription>
        <CardAction>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label={playing ? "Pause the film" : "Play the film"}
          >
            {playing ? (
              <PauseIcon weight="fill" aria-hidden />
            ) : (
              <PlayIcon weight="fill" aria-hidden />
            )}
          </Button>
        </CardAction>
      </CardHeader>
      <CardInset>
        <video
          ref={video}
          className="block aspect-video w-full"
          width={1920}
          height={1080}
          poster="/video/session-coach-hero-poster.jpg"
          muted
          loop
          playsInline
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          aria-label="Code with Claude Code as usual, get up to 5 decision cards per session, explain the why in your own words, and each card comes back on days 1, 4 and 11 until you own it."
        >
          <source src="/video/session-coach-hero.webm" type="video/webm" />
          <source src="/video/session-coach-hero.mp4" type="video/mp4" />
        </video>
      </CardInset>
    </Card>
  );
}
