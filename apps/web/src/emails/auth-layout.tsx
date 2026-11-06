// oxlint-disable shadcn/no-inline-styles, shadcn/no-raw-colors -- email clients only read inline styles and hex colours.
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "react-email";

import { color, font, primaryButton } from "./brand";

// The auth emails Supabase sends (./auth), in the app's look: neutral paper, one brand-blue button, no illustration. They're exported to
// supabase/templates/*.html, so the links and the address are Supabase's Go template tags, such as {{ .TokenHash }},
// filled in when Supabase sends. {{ .SiteURL }} is the project's Site URL: localhost locally, coach.ziaa.me in
// production.

/**
 * The frame every email shares: brand line, a paper card with the heading, then a rule and a footer line. The auth
 * emails and the daily review fill it. public/email/cards.png stays on the site for emails already sent.
 *
 * @param preview - The inbox preview line.
 * @param heading - The card's heading.
 * @param children - The card's body, under the heading.
 * @param footer - The footer line's content.
 */
export function EmailShell({
  preview,
  heading,
  children,
  footer,
}: {
  preview: string;
  heading: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{ margin: 0, backgroundColor: color.canvas, fontFamily: font }}>
        <Container style={{ maxWidth: 520, margin: "0 auto", padding: "40px 16px" }}>
          <Text
            style={{
              margin: "0 0 16px",
              fontSize: 14,
              lineHeight: "20px",
              fontWeight: 600,
              color: color.ink,
            }}
          >
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
            <Heading
              as="h1"
              style={{
                margin: "0 0 12px",
                fontSize: 22,
                lineHeight: "28px",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: color.ink,
              }}
            >
              {heading}
            </Heading>
            {children}
          </Section>
          <Hr
            style={{ border: "none", borderTop: `1px solid ${color.line}`, margin: "28px 0 16px" }}
          />
          <Text style={{ margin: 0, fontSize: 12, lineHeight: "18px", color: color.text3 }}>
            {footer}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

/**
 * One auth email: the shared shell with the body, one button and a fallback link.
 *
 * @param preview - The inbox preview line.
 * @param heading - The card's heading.
 * @param children - The body paragraphs, as `<AuthText>`.
 * @param cta - The button's words.
 * @param href - The button's link, usually Supabase template tags.
 * @param footer - Why they got this email and what to do if they didn't ask for it.
 */
export function AuthEmail({
  preview,
  heading,
  children,
  cta,
  href,
  footer,
}: {
  preview: string;
  heading: string;
  children: React.ReactNode;
  cta: string;
  href: string;
  footer: string;
}) {
  return (
    <EmailShell preview={preview} heading={heading} footer={footer}>
      {children}
      <Button href={href} style={{ ...primaryButton, margin: "4px 0 0" }}>
        {cta}
      </Button>
      <Text style={{ margin: "24px 0 0", fontSize: 13, lineHeight: "19px", color: color.text3 }}>
        Button not working? Paste this link into your browser:
        <br />
        <Link href={href} style={{ color: color.text2, wordBreak: "break-all" }}>
          {href}
        </Link>
      </Text>
    </EmailShell>
  );
}

/** A body paragraph in an auth email. */
export function AuthText({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ margin: "0 0 20px", fontSize: 15, lineHeight: "22px", color: color.text2 }}>
      {children}
    </Text>
  );
}
