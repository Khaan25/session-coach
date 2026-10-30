import "server-only";

// SAMPLE account data for /setup and /settings. TODO(zia): the signed-in profile (Phase 2) and cli_tokens rows
// (Phase 3, Kasam's token API).

/** SAMPLE: the learner's profile, as the columns /settings shows. */
export const sampleProfile = {
  display_name: "Sample Learner",
  email: "learner@example.com",
  timezone: "Asia/Karachi",
  notify_email: true,
};

/** SAMPLE: the signed-in user as the header and the sidebar show it. */
export const sampleUser = {
  name: sampleProfile.display_name,
  email: sampleProfile.email,
  initials: "SL",
};

/** SAMPLE: a short list of IANA names. TODO(zia): the full list (Intl.supportedValuesOf("timeZone")) in a combobox. */
export const sampleTimezones = [
  "UTC",
  "Asia/Karachi",
  "Asia/Kathmandu",
  "Asia/Kolkata",
  "Europe/London",
  "America/New_York",
];

/** A token row as the list shows it. The raw token is never stored, so it never appears here. */
export type TokenRow = {
  id: string;
  label: string;
  created_at: string;
  last_used_at: string | null;
};

/** SAMPLE: the learner's CLI tokens. */
export const sampleTokens: TokenRow[] = [
  {
    id: "c1a2b3c4-d5e6-4f70-8a91-b2c3d4e5f601",
    label: "SAMPLE: work laptop",
    created_at: "2026-10-20T10:00:00+05:45",
    last_used_at: "2026-10-27T16:40:00+05:45",
  },
  {
    id: "c1a2b3c4-d5e6-4f70-8a91-b2c3d4e5f602",
    label: "SAMPLE: home desktop",
    created_at: "2026-10-25T19:30:00+05:45",
    last_used_at: null,
  },
];

/** An obviously fake token for the "Create token" dialog. TODO(zia): the raw token from POST /api/cli/tokens. */
export const SAMPLE_TOKEN = "sc_sample_0000000000000000000000000000";
