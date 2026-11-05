"use client";

// The redesign options on /canvas: one row per route, options A to C left to right, in the order a learner meets
// the app. Each option is a full page that teaches on the page itself. Pick one per route, then the chosen ones
// become the real screens and the full state map goes on the canvas.

import type { CanvasItem } from "../../canvas";
import {
  MarketingHowItWorksOptionB,
  MarketingLandingOptionA,
  MarketingLandingOptionB,
  MarketingLandingOptionC,
  MarketingPricingOptionC,
  MarketingSupportOptionA,
  MarketingSupportOptionB,
  MarketingSupportOptionC,
} from "./marketing";
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
import {
  SessionFailedOptionB,
  SessionNoCardsOptionB,
  SessionProcessingOptionB,
  SessionReadyOptionB,
} from "./session";
import { ReviewCardOptionB, ReviewQueueOptionB } from "./review";
import { DefendOptionC } from "./defend";
import {
  ProgressSettingsProgressOptionC,
  ProgressSettingsSettingsOptionA,
} from "./progress-settings";

type Entry = Omit<CanvasItem, "x" | "y">;

export const optionRows: Entry[][] = [
  [
    {
      id: "opt-landing-a",
      name: "Option · Landing · A · First-week checklist",
      width: 1440,
      height: 900,
      render: () => <MarketingLandingOptionA />,
    },
    {
      id: "opt-landing-b",
      name: "Option · Landing · B · Annotated live card",
      width: 1440,
      height: 900,
      render: () => <MarketingLandingOptionB />,
    },
    {
      id: "opt-landing-c",
      name: "Option · Landing · C · One card, nothing else",
      width: 1440,
      height: 900,
      render: () => <MarketingLandingOptionC />,
    },
  ],
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
      id: "opt-support-a",
      name: "Option · Support · A · Troubleshooter",
      width: 1440,
      height: 900,
      render: () => <MarketingSupportOptionA />,
    },
    {
      id: "opt-support-b",
      name: "Option · Support · B · Topic tabs FAQ",
      width: 1440,
      height: 900,
      render: () => <MarketingSupportOptionB />,
    },
    {
      id: "opt-support-c",
      name: "Option · Support · C · Read the badges",
      width: 1440,
      height: 900,
      render: () => <MarketingSupportOptionC />,
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
  [
    {
      id: "opt-session-b-processing",
      name: "Option · Session · B · Explain as you go · Processing",
      width: 1440,
      height: 900,
      render: () => <SessionProcessingOptionB />,
    },
    {
      id: "opt-session-b-ready",
      name: "Option · Session · B · Explain as you go · Ready",
      width: 1440,
      height: 900,
      render: () => <SessionReadyOptionB />,
    },
    {
      id: "opt-session-b-failed",
      name: "Option · Session · B · Explain as you go · Failed",
      width: 1440,
      height: 900,
      render: () => <SessionFailedOptionB />,
    },
    {
      id: "opt-session-b-no-cards",
      name: "Option · Session · B · Explain as you go · No cards",
      width: 1440,
      height: 900,
      render: () => <SessionNoCardsOptionB />,
    },
  ],
  [
    {
      id: "opt-review-queue-b",
      name: "Option · Review queue · B · Split explain-as-you-go",
      width: 1440,
      height: 900,
      render: () => <ReviewQueueOptionB />,
    },
  ],
  [
    {
      id: "opt-review-card-b",
      name: "Option · Review card · B · Split explain-as-you-go",
      width: 1440,
      height: 900,
      render: () => <ReviewCardOptionB />,
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
