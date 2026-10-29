import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { themeScript } from "@/components/theme/theme-script";
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

export const metadata: Metadata = {
  title: "Session Coach",
  description: "Explain back the decisions your coding agent made.",
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
          <PortalProvider>{children}</PortalProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
