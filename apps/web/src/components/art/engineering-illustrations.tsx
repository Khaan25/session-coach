import { PaperCompanion } from "@/components/art/paper-companion";
import {
  ArrowCounterClockwiseIcon,
  BracketsCurlyIcon,
  ChatTextIcon,
  CheckIcon,
  CodeIcon,
  FingerprintIcon,
  GearSixIcon,
  GitBranchIcon,
  QuotesIcon,
  ShieldCheckIcon,
  TerminalWindowIcon,
} from "@phosphor-icons/react/ssr";

type MarkKind =
  | "new"
  | "explain"
  | "recall"
  | "final"
  | "owned"
  | "defend"
  | "session"
  | "setup"
  | "settings"
  | "proof";
const marks = {
  new: [CodeIcon, "blue"],
  explain: [ChatTextIcon, "blue"],
  recall: [ArrowCounterClockwiseIcon, "violet"],
  final: [FingerprintIcon, "amber"],
  owned: [CheckIcon, "green"],
  defend: [ShieldCheckIcon, "violet"],
  session: [GitBranchIcon, "blue"],
  setup: [TerminalWindowIcon, "blue"],
  settings: [GearSixIcon, "neutral"],
  proof: [QuotesIcon, "amber"],
} as const;
/** Shared, labelled-by-context marks: color reinforces the adjacent words, never replaces them. */
export function LearningMark({
  kind,
  size = "normal",
}: {
  kind: MarkKind;
  size?: "small" | "normal";
}) {
  const [Icon, tone] = marks[kind];
  return (
    <span className="learning-mark" data-tone={tone} data-size={size} aria-hidden="true">
      <Icon weight="duotone" />
    </span>
  );
}

/** The same paper guide used on the landing, quiet and compact during learning. */
export function EngineeringGuide({
  pose = "reflect",
  size = "small",
}: {
  pose?: "hero" | "reflect" | "complete" | "defend" | "connect";
  size?: "mini" | "small" | "scene" | "hero";
}) {
  return (
    <span
      className="coach-companion engineering-guide"
      data-pose={pose}
      data-size={size}
      aria-hidden="true"
    >
      <PaperCompanion pose={pose} size={size} />
    </span>
  );
}

/** Decorative concept art, deliberately free of scores, charts or sample answer text. */
export function DecisionScene({
  variant = "review",
}: {
  variant?: "review" | "session" | "connect" | "defend";
}) {
  return (
    <span className="engineering-scene" data-scene={variant} aria-hidden="true">
      <svg viewBox="0 0 320 160" fill="none">
        <ellipse className="eng-scene-ground" cx="157" cy="135" rx="137" ry="13" />
        <path className="eng-orbit" d="M28 91c-3-43 35-78 96-78s109 10 142 47" />
        <path className="eng-window-back" d="m41 25 121-5 15 12v97L56 137l-15-12Z" />
        <path className="eng-window-side" d="m162 20 15 12v97l-15-12Z" />
        <rect className="eng-window" x="29" y="27" width="133" height="96" rx="11" />
        <path className="eng-window-rule" d="M30 50h131" />
        <circle className="eng-blue-fill" cx="43" cy="39" r="3" />
        <circle className="eng-violet-fill" cx="54" cy="39" r="3" />
        <circle className="eng-amber-fill" cx="65" cy="39" r="3" />
        <path className="eng-code-violet" d="m51 67-8 8 8 8m18-16 8 8-8 8m-6-19-7 22" />
        <path className="eng-code-blue" d="M91 70h40M91 81h27M44 100h30" />
        <path className="eng-code-muted" d="M84 100h48" />
        <path
          className="eng-connector"
          d="M163 76h25a12 12 0 0 0 12-12V48a12 12 0 0 1 12-12h18m-42 40h24m-12-12v44a12 12 0 0 0 12 12h35"
        />
        <circle className="eng-junction" cx="188" cy="76" r="4" />
        <rect className="eng-note-blue" x="228" y="17" width="64" height="40" rx="10" />
        <path className="eng-blue-stroke" d="M242 29h32m-32 9h23m-23 9h12" />
        <rect className="eng-note-violet" x="213" y="62" width="70" height="35" rx="10" />
        {variant === "defend" ? (
          <path
            className="eng-violet-stroke"
            d="m242 68 12 4v8c0 7-12 12-12 12s-12-5-12-12v-8Zm-5 11 4 4 7-8"
          />
        ) : (
          <path className="eng-violet-stroke" d="M229 74h37m-37 9h24" />
        )}
        <rect className="eng-note-green" x="244" y="106" width="57" height="32" rx="10" />
        <path className="eng-green-stroke" d="m261 122 7 6 12-13" />
        <circle className="eng-amber-fill" cx="287" cy="82" r="4" />
        <path className="eng-guide-detail" d="M17 116h8m-4-4v8" />
      </svg>
    </span>
  );
}

/** The center is a rounded display percentage; the ring itself uses the exact owned fraction. */
export function OwnershipRing({
  owned,
  total,
  size = "summary",
  identity,
}: {
  owned: number;
  total: number;
  size?: "summary" | "project";
  identity?: string;
}) {
  const identityTones = ["blue", "violet", "amber"] as const;
  const tone =
    identityTones[
      Array.from(identity ?? "").reduce((sum, char) => sum + char.charCodeAt(0), 0) %
        identityTones.length
    ];
  const ratio = total > 0 ? Math.min(1, Math.max(0, owned / total)) : 0;
  return (
    <svg
      className="ownership-ring"
      data-size={size}
      data-project-tone={tone}
      viewBox="0 0 120 120"
      aria-hidden="true"
    >
      <circle className="ownership-ring-track" cx="60" cy="60" r="49" />
      <circle
        className="ownership-ring-fill"
        cx="60"
        cy="60"
        r="49"
        pathLength="100"
        strokeDasharray={`${ratio * 100} 100`}
        transform="rotate(-90 60 60)"
      />
      {size === "summary" ? (
        <>
          <text className="ownership-ring-number" x="60" y="58" textAnchor="middle">
            {Math.round(ratio * 100)}%
          </text>
          <text className="ownership-ring-caption" x="60" y="79" textAnchor="middle">
            owned
          </text>
        </>
      ) : (
        <foreignObject x="40" y="40" width="40" height="40">
          <BracketsCurlyIcon className="ownership-ring-code" />
        </foreignObject>
      )}
    </svg>
  );
}
