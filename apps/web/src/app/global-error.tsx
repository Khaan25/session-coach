"use client";

import { ErrorPage } from "@/components/errors/error-page";
import { themeScript } from "@/components/theme/theme-script";

import "./globals.css";

// Replaces the root layout when it fails, so it brings its own document, styles and theme. No next/font here: the
// page falls back to the system stack, which is fine for a last resort.
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <head>
        <title>Something went wrong | Session Coach</title>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <ErrorPage error={error} retry={retry} />
      </body>
    </html>
  );
}
