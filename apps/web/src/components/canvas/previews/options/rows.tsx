"use client";

// The redesign options on /canvas: one row per route, options A to C left to right, in the order a learner meets
// the app. Each option is a full page that teaches on the page itself. Pick one per route, then the chosen ones
// become the real screens and the full state map goes on the canvas.

import type { CanvasItem } from "../../canvas";
import { MarketingHowItWorksOptionB, MarketingPricingOptionC } from "./marketing";
import {
  AuthCheckEmailOptionB,
  AuthErrorOptionB,
  AuthForgotPasswordOptionB,
  AuthLoginOptionB,
  AuthSignUpOptionB,
  AuthUpdatePasswordOptionB,
} from "./auth";
import { OnboardingCliApproveOptionC } from "./onboarding";
import { DashboardHomeOptionB, DashboardHomeOptionBEmpty } from "./dashboard";
import { CanvasSession } from "./session";
import { CanvasQuiz, CanvasReviewQueue } from "./review";
import { DefendOptionC } from "./defend";
import {
  ProgressSettingsProgressOptionC,
  ProgressSettingsSettingsOptionA,
} from "./progress-settings";

type Entry = Omit<CanvasItem, "x" | "y">;

export const optionRows: Entry[][] = [
  [
    {
      id: "opt-how-b",
      name: "Option · How it works · B · Tabs by place",
      width: 1440,
      height: 900,
      render: () => <MarketingHowItWorksOptionB />,
    },
  ],
  [
    {
      id: "opt-pricing-c",
      name: "Option · Pricing · C · One word, three answers",
      width: 1440,
      height: 900,
      render: () => <MarketingPricingOptionC />,
    },
  ],
  [
    {
      id: "opt-login-b",
      name: "Option · Login · B · Explain panel",
      width: 1440,
      height: 900,
      render: () => <AuthLoginOptionB />,
    },
  ],
  [
    {
      id: "opt-signup-b",
      name: "Option · Sign up · B · Explain panel",
      width: 1440,
      height: 900,
      render: () => <AuthSignUpOptionB />,
    },
  ],
  [
    {
      id: "opt-check-email-b",
      name: "Option · Check email · B · Explain panel",
      width: 1440,
      height: 900,
      render: () => <AuthCheckEmailOptionB />,
    },
  ],
  [
    {
      id: "opt-forgot-b",
      name: "Option · Forgot password · B · Explain panel",
      width: 1440,
      height: 900,
      render: () => <AuthForgotPasswordOptionB />,
    },
  ],
  [
    {
      id: "opt-update-b",
      name: "Option · Update password · B · Explain panel",
      width: 1440,
      height: 900,
      render: () => <AuthUpdatePasswordOptionB />,
    },
  ],
  [
    {
      id: "opt-auth-error-b",
      name: "Option · Auth error · B · Explain panel",
      width: 1440,
      height: 900,
      render: () => <AuthErrorOptionB />,
    },
  ],
  [
    {
      id: "opt-approve-c-one-question",
      name: "Option · CLI approve · C · One question",
      width: 1440,
      height: 900,
      render: () => <OnboardingCliApproveOptionC />,
    },
  ],
  [
    {
      id: "opt-dashboard-b",
      name: "Option · Dashboard · B · Explain in place",
      width: 1440,
      height: 900,
      render: () => <DashboardHomeOptionB />,
    },
    {
      id: "opt-dashboard-b-empty",
      name: "Option · Dashboard · B · Explain in place · First visit",
      width: 1440,
      height: 900,
      render: () => <DashboardHomeOptionBEmpty />,
    },
  ],
  // /s/[id] and /review: option B was dropped after #76; these are the real pages.
  [
    {
      id: "opt-session-processing",
      name: "Session · processing",
      width: 1440,
      height: 900,
      render: () => <CanvasSession status="processing" />,
    },
    {
      id: "opt-session-ready",
      name: "Session · ready",
      width: 1440,
      height: 900,
      render: () => <CanvasSession status="ready" />,
    },
    {
      id: "opt-session-failed",
      name: "Session · failed",
      width: 1440,
      height: 900,
      render: () => <CanvasSession status="failed" />,
    },
    {
      id: "opt-session-no-cards",
      name: "Session · no cards",
      width: 1440,
      height: 900,
      render: () => <CanvasSession status="ready" noCards />,
    },
  ],
  [
    {
      id: "opt-review-queue",
      name: "Review · queue",
      width: 1440,
      height: 900,
      render: () => <CanvasReviewQueue />,
    },
  ],
  [
    {
      id: "opt-review-card",
      name: "Review · card",
      width: 1440,
      height: 900,
      render: () => <CanvasQuiz />,
    },
  ],
  [
    {
      id: "opt-defend-c-focused",
      name: "Option · Defend it · C · One focused column",
      width: 1440,
      height: 900,
      render: () => <DefendOptionC />,
    },
  ],
  [
    {
      id: "opt-progress-c",
      name: "Option · Progress · C · Follow one card",
      width: 1440,
      height: 900,
      render: () => <ProgressSettingsProgressOptionC />,
    },
  ],
  [
    {
      id: "opt-settings-a",
      name: "Option · Settings · A · Guided checklist",
      width: 1440,
      height: 900,
      render: () => <ProgressSettingsSettingsOptionA />,
    },
  ],
];
