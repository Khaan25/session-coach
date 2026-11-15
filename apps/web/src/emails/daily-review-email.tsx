// oxlint-disable shadcn/no-inline-styles, shadcn/no-raw-colors -- email clients only read inline styles and hex colours.
import { Button, Link, Section, Text } from "react-email";

import type { DailyReviewCopy, ListedCard } from "@/lib/email/daily-review";

import { EmailShell } from "./auth-layout";
import { color, primaryButton } from "./brand";

// The daily review reminder in the app's look: neutral paper, graphite ink, the system sans and one brand-blue button.

/** New cards in the model green, due-again ones in the run blue: the two kind tints the app already uses. */
const tagColor: Record<ListedCard["tag"], { background: string; foreground: string }> = {
  New: { background: color.newTint, foreground: color.newLabel },
  Due: { background: color.dueTint, foreground: color.dueLabel },
};

/**
 * The reminder email. Every word comes from `dailyReviewCopy`, so the plain-text part says the same thing.
 *
 * @param copy - The words and links.
 */
export function DailyReviewEmail({ copy }: { copy: DailyReviewCopy }) {
  return (
    <EmailShell
      preview={copy.preview}
      heading={copy.heading}
      footer={
        <>
          {copy.footer}{" "}
          <Link href={copy.settingsUrl} style={{ color: color.text3, textDecoration: "underline" }}>
            {copy.footerLink}
          </Link>
          {copy.unsubscribeUrl ? (
            <>
              {" or "}
              <Link
                href={copy.unsubscribeUrl}
                style={{ color: color.text3, textDecoration: "underline" }}
              >
                unsubscribe
              </Link>
            </>
          ) : null}
          .
        </>
      }
    >
      <Text style={{ margin: "0 0 20px", fontSize: 15, lineHeight: "22px", color: color.text2 }}>
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
            // oxlint-disable-next-line react/no-array-index-key -- two cards can share a title, and cards have no id here
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
      <Text style={{ margin: "0 0 8px", fontSize: 15, lineHeight: "22px", color: color.text2 }}>
        {copy.body}
      </Text>
      <Text style={{ margin: "0 0 24px", fontSize: 14, lineHeight: "20px", color: color.text3 }}>
        {copy.progress}
      </Text>
      <Button href={copy.reviewUrl} style={primaryButton}>
        {copy.cta}
      </Button>
    </EmailShell>
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
