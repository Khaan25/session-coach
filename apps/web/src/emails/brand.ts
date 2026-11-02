// The app's look for email. Email clients don't read CSS variables or oklch, so the design tokens are copied here as
// hex (light theme, from styles/tokens.css; the alpha text steps are flattened onto paper). Keep them in step with
// the tokens. Shared by the daily review email and the auth emails in ./auth.
export const color = {
  canvas: "#fbfcfd", // --surface-canvas
  paper: "#fdfeff", // --paper
  ink: "#101621", // --ink, --text-1
  text2: "#3f444d", // --text-2 on paper
  text3: "#61656c", // --text-3 on paper
  line: "#eaecee", // --line-row on paper
  well: "#eff1f3", // --surface-card
  dueTint: "#c2defb", // --hue-3-tint
  dueLabel: "#274562", // --hue-3-label
  newTint: "#bfe6d0", // --hue-5-tint
  newLabel: "#204c37", // --hue-5-label
};

export const font =
  'Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
