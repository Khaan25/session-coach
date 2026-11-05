import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { SkulletProvider } from "skullet/react";

import { UiSounds } from "@/components/sound/ui-sounds";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { themeScript } from "@/components/theme/theme-script";
import { Toaster } from "@/components/ui/toast";
import { siteUrl } from "@/lib/site";
import { PortalProvider } from "@/lib/ui/portal";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display face for marketing headlines only (`font-display`); the UI stays on Geist.
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
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
  "Own the code your agent writes. Each Claude Code session becomes up to 5 decision cards, filed by project: explain each one in your own words after 1 day, then 3, then 7, defend it, and keep it until it's yours.";

// metadataBase makes the opengraph-image and canonical paths absolute; pages override title and description.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Session Coach",
  description,
  applicationName: "Session Coach",
  openGraph: {
    type: "website",
    siteName: "Session Coach",
    title: "Session Coach",
    description,
    locale: "en_US",
  },
  twitter: { card: "summary_large_image", title: "Session Coach", description },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The theme script adds the theme class before paint, so <html> differs from the server render.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full`}
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
