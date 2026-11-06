import type { Metadata, Viewport } from "next";
import { Geist_Mono, Mona_Sans } from "next/font/google";
import { SkulletProvider } from "skullet/react";

import { UiSounds } from "@/components/sound/ui-sounds";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { themeScript } from "@/components/theme/theme-script";
import { Toaster } from "@/components/ui/toast";
import { siteUrl } from "@/lib/site";
import { PortalProvider } from "@/lib/ui/portal";

import "./globals.css";

// One family for the UI and the headlines, after serveros.com (docs/DECISIONS.md, 2026-11-06).
const monaSans = Mona_Sans({
  variable: "--font-mona-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Skullet's measured skeletons in the design system's still block: the skeleton fill, the control radius and the pulse.
// The tokens already flip with the theme class, so light and dark take the same values.
const skeletonColors = { base: "var(--surface-skeleton)", highlight: "var(--cell-quiet)" };
const skeletonTheme = {
  light: skeletonColors,
  dark: skeletonColors,
  radius: "var(--radius-soft)",
  animation: "pulse",
} as const;

const description =
  "Own the code your agent writes. Each Claude Code session becomes up to 5 decision cards, filed by project: explain each one in your own words on day 1, 4 and 11 until it's yours, and defend it whenever you like.";

// metadataBase makes the opengraph-image and canonical paths absolute; pages override title and description. Open Graph
// and Twitter leave title and description out so Next fills them from each page's own; "./" resolves to the page's path.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Session Coach",
  description,
  applicationName: "Session Coach",
  alternates: { canonical: "./" },
  openGraph: { type: "website", siteName: "Session Coach", locale: "en_US", url: "./" },
  twitter: { card: "summary_large_image" },
};

// The browser chrome matches the page ground: --paper in each theme (styles/tokens.css).
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0d" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The theme script adds the theme class before paint, so <html> differs from the server render.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${monaSans.variable} ${geistMono.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <UiSounds />
        <ThemeProvider>
          <SkulletProvider theme={skeletonTheme}>
            <PortalProvider>
              {/* At the root so a toast survives navigation between groups (account deletion lands on /). */}
              <Toaster>{children}</Toaster>
            </PortalProvider>
          </SkulletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
