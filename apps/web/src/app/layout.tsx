import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { SkulletProvider } from "skullet/react";

import { PreviewNav } from "@/components/design-system/preview-nav";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { themeScript } from "@/components/theme/theme-script";
import { Toaster } from "@/components/ui/toast";
import { siteUrl } from "@/lib/site";
import { PortalProvider } from "@/lib/ui/portal";

import "./globals.css";
import "../styles/serveros.css";
import "../styles/editions.css";
import "../styles/diffuse.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
  "Own the code your agent writes. Each Claude Code session becomes up to 5 decision cards, filed by project: explain each one in your own words on day 1, 4 and 11 until it's yours, and defend it whenever you like.";

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
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <SkulletProvider theme={skeletonTheme}>
            <PortalProvider>
              {/* At the root so a toast survives navigation between groups (account deletion lands on /). */}
              <Toaster>
                {children}
                {process.env.NODE_ENV === "development" && process.env.DESIGN_PREVIEW === "1" && (
                  <Suspense fallback={null}>
                    <PreviewNav
                      port={Number(process.env.DESIGN_PREVIEW_PORT ?? 54329)}
                      shared={Boolean(process.env.DESIGN_SHARE_ORIGIN)}
                    />
                  </Suspense>
                )}
              </Toaster>
            </PortalProvider>
          </SkulletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
