import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";

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

const description =
  "Each Claude Code session becomes 3 to 5 decision cards. Explain them back in your own words on day 1, 3 and 7 until you know why your agent wrote what it wrote.";

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
        <ThemeProvider>
          <PortalProvider>
            {/* At the root so a toast survives navigation between groups (account deletion lands on /). */}
            <Toaster>{children}</Toaster>
          </PortalProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
