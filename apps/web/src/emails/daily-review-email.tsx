// oxlint-disable shadcn/no-inline-styles, shadcn/no-raw-colors -- email clients only read inline styles and hex colours.
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
} from "react-email";

import {
  type DailyReviewCopy,
  dailyReviewCopy,
  type ListedCard,
  type Recipient,
} from "@/lib/email/daily-review";

import { color, font } from "./brand";

// The daily review reminder in the app's look: icy paper, navy-graphite ink, Geist, the watercolour card stack.

/** New cards in the model green, due-again ones in the run blue: the two kind tints the app already uses. */
const tagColor: Record<ListedCard["tag"], { background: string; foreground: string }> = {
  New: { background: color.newTint, foreground: color.newLabel },
  Due: { background: color.dueTint, foreground: color.dueLabel },
};

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
              style={{ margin: "0 0 20px", fontSize: 15, lineHeight: "22px", color: color.text2 }}
            >
              {copy.summary}
            </Text>
            <Section
              style={{
                margin: "0 0 20px",
                backgroundColor: color.well,
                borderRadius: 8,
                padding: "4px 16px",
              }}
            >
              {copy.cards.map((card, i) => (
                <Text
                  key={`${i}-${card.title}`}
                  style={{
                    margin: 0,
                    padding: "12px 0",
                    borderTop: i === 0 ? "none" : `1px solid ${color.line}`,
                    fontSize: 15,
                    lineHeight: "22px",
                    color: color.ink,
                  }}
                >
                  <Pill {...tagColor[card.tag]}>{card.tag}</Pill> {card.title}
                </Text>
              ))}
              {copy.more && (
                <Text
                  style={{
                    margin: 0,
                    padding: "12px 0",
                    borderTop: `1px solid ${color.line}`,
                    fontSize: 14,
                    lineHeight: "20px",
                    color: color.text3,
                  }}
                >
                  {copy.more}
                </Text>
              )}
            </Section>
            <Text
              style={{ margin: "0 0 8px", fontSize: 15, lineHeight: "22px", color: color.text2 }}
            >
              {copy.body}
            </Text>
            <Text
              style={{ margin: "0 0 24px", fontSize: 14, lineHeight: "20px", color: color.text3 }}
            >
              {copy.progress}
            </Text>
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
            {copy.footer}{" "}
            <Link
              href={copy.settingsUrl}
              style={{ color: color.text3, textDecoration: "underline" }}
            >
              {copy.footerLink}
            </Link>
            .
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

/** A New or Due tag: the app's fully round tag on a kind tint. */
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
        margin: "0 6px 0 0",
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
 * @param recipient - What this learner has to do and has done.
 * @param siteUrl - The deployed origin, without a trailing slash.
 */
export async function composeDailyReview(recipient: Recipient, siteUrl: string) {
  const copy = dailyReviewCopy(recipient, siteUrl);
  const html = await render(<DailyReviewEmail copy={copy} siteUrl={siteUrl} />);
  return { subject: copy.subject, text: copy.text, html };
}
