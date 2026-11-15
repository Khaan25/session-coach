// The app's look for email. Email clients don't read CSS variables or oklch, so the design tokens are copied here as
// hex (light theme, from styles/tokens.css; the alpha text steps are flattened onto paper). Keep them in step with
// the tokens. Shared by the daily review email and the auth emails in ./auth.
export const color = {
  // --surface-canvas
  canvas: "#f9f9f9",
  // --paper
  paper: "#ffffff",
  // --ink, --text-1
  ink: "#111111",
  // --text-2 on paper
  text2: "#414141",
  // --text-3 on paper
  text3: "#5f5f5f",
  // --line-row on paper
  line: "#ebebeb",
  // --surface-card
  well: "#f2f2f2",
  // --brand: the one blue, for the primary button only
  brand: "#1c4bb0",
  // the primary key's lighter rim
  brandRing: "#4a74d6",
  // --text-on-brand
  onBrand: "#ffffff",
  // --hue-3-tint
  dueTint: "#c2defb",
  // --hue-3-label
  dueLabel: "#274562",
  // --hue-5-tint
  newTint: "#bfe6d0",
  // --hue-5-label
  newLabel: "#204c37",
};

// Mona Sans where the reader has it, then each platform's own sans. Never a webfont: most clients block them, and a
// missing first family must fall back to a sans, not the client's default (often a serif or a mono).
export const font =
  '"Mona Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';

/** The app's primary key in email: the brand fill and its lighter rim, no gradient (most clients drop them). */
export const primaryButton = {
  display: "inline-block",
  backgroundColor: color.brand,
  border: `1px solid ${color.brandRing}`,
  color: color.onBrand,
  borderRadius: 6,
  padding: "10px 16px",
  fontSize: 14,
  lineHeight: "18px",
  fontWeight: 500,
  textDecoration: "none",
} as const;
