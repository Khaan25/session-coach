import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  render,
  Section,
  Text,
} from "@react-email/components";

import { type DailyReviewCopy, dailyReviewCopy } from "@/lib/email/daily-review";

// The daily review reminder in the app's look: icy paper, navy-graphite ink, Geist, the watercolour card stack.
// Email clients don't read CSS variables or oklch, so the design tokens are copied here as hex (light theme,
// from styles/tokens.css; the alpha text steps are flattened onto paper). Keep them in step with the tokens.
const color = {
  canvas: "#fbfcfd", // --surface-canvas
  paper: "#fdfeff", // --paper
  ink: "#101621", // --ink, --text-1
  text2: "#3f444d", // --text-2 on paper
  text3: "#61656c", // --text-3 on paper
  line: "#eaecee", // --line-row on paper
  runTint: "#c2defb", // --hue-3-tint
  runLabel: "#274562", // --hue-3-label
  doneTint: "#bfe6d0", // --hue-5-tint
  doneLabel: "#204c37", // --hue-5-label
};
const font = 'Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';

/** The review schedule as the auth pages show it: three review days, then mastered. */
const steps = ["Day 1", "Day 3", "Day 7"];

/**
 * The reminder email. Every word comes from `dailyReviewCopy`, so the plain-text part says the same thing.
 *
 * @param copy - The words and links.
 * @param siteUrl - The deployed origin, for the illustration.
 */
export function DailyReviewEmail({ copy, siteUrl }: { copy: DailyReviewCopy; siteUrl: string }) {
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{copy.preview}</Preview>
      <Body style={{ margin: 0, backgroundColor: color.canvas, fontFamily: font }}>
        <Container style={{ maxWidth: 520, margin: "0 auto", padding: "40px 16px" }}>
          <Text style={{ margin: "0 0 16px", fontSize: 14, lineHeight: "20px", color: color.ink }}>
            Session Coach
          </Text>
          <Section
            style={{
              backgroundColor: color.paper,
              border: `1px solid ${color.line}`,
              borderRadius: 12,
              padding: "32px 32px 28px",
            }}
          >
            <Img
              src={`${siteUrl}/email/cards.png`}
              width={96}
              height={80}
              alt=""
              style={{ display: "block", margin: "0 0 20px" }}
            />
            <Heading
              as="h1"
              style={{
                margin: "0 0 12px",
                fontSize: 28,
                lineHeight: "34px",
                fontWeight: 400,
                letterSpacing: "-0.01em",
                color: color.ink,
              }}
            >
              {copy.heading}
            </Heading>
            <Text
              style={{ margin: "0 0 20px", fontSize: 16, lineHeight: "24px", color: color.text2 }}
            >
              {copy.body}
            </Text>
            <Section style={{ margin: "0 0 28px" }}>
              {steps.map((step) => (
                <Pill key={step} background={color.runTint} foreground={color.runLabel}>
                  {step}
                </Pill>
              ))}
              <Pill background={color.doneTint} foreground={color.doneLabel}>
                Mastered
              </Pill>
            </Section>
            <Button
              href={copy.reviewUrl}
              style={{
                display: "inline-block",
                backgroundColor: color.ink,
                color: color.paper,
                borderRadius: 8,
                padding: "12px 20px",
                fontSize: 15,
                lineHeight: "20px",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              {copy.cta}
            </Button>
          </Section>
          <Hr
            style={{ border: "none", borderTop: `1px solid ${color.line}`, margin: "28px 0 16px" }}
          />
          <Text style={{ margin: 0, fontSize: 12, lineHeight: "18px", color: color.text3 }}>
            You get this because daily reminders are on.{" "}
            <Link
              href={copy.settingsUrl}
              style={{ color: color.text3, textDecoration: "underline" }}
            >
              Turn them off in Settings
            </Link>
            .
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

/** A schedule step: the app's fully round tag on a kind tint. */
function Pill({
  background,
  foreground,
  children,
}: {
  background: string;
  foreground: string;
  children: string;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        margin: "0 6px 6px 0",
        padding: "2px 10px",
        borderRadius: 999,
        backgroundColor: background,
        color: foreground,
        fontSize: 12,
        lineHeight: "18px",
      }}
    >
      {children}
    </span>
  );
}

/**
 * One learner's reminder: subject, plain text and the rendered HTML.
 *
 * @param count - Cards due today, at least 1.
 * @param siteUrl - The deployed origin, without a trailing slash.
 */
export async function composeDailyReview(count: number, siteUrl: string) {
  const copy = dailyReviewCopy(count, siteUrl);
  const html = await render(<DailyReviewEmail copy={copy} siteUrl={siteUrl} />);
  return { subject: copy.subject, text: copy.text, html };
}
