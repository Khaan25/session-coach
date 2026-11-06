// oxlint-disable shadcn/no-inline-styles, shadcn/no-raw-colors -- ImageResponse only reads inline styles and literal colours.
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

export const alt =
  "Session Coach: Own the code your agent writes. Explain it until it's yours. A decision card due on day 1, 4 and 11.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// ImageResponse can't read CSS variables, so these literals match the light theme's tokens (styles/tokens.css):
// --ink, --text-3, --line-frame, --line-row, --surface-card, --brand.
const ink = "#121212";
const muted = "#626262";
const frame = "#dedede";
const row = "#ececec";
const well = "#f3f3f3";
const brand = "#1c4bb0";

// Mona Sans 500, the hero's weight, read from disk so the build makes no font request (licence: assets/MonaSans-OFL.txt).
const monaSans = readFile(join(process.cwd(), "assets/MonaSans-Medium.ttf"));

/** The site's share card, after the landing hero: the mark, the headline and a decision card on its schedule. */
export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "#ffffff",
        color: ink,
        fontFamily: "Mona Sans",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 30 }}>
        {/* BrandMark: Phosphor's Cards icon, duotone, in the brand blue. */}
        <svg width="44" height="44" viewBox="0 0 256 256" fill={brand}>
          <path
            d="M192,88V200a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V88a8,8,0,0,1,8-8H184A8,8,0,0,1,192,88Z"
            opacity="0.2"
          />
          <path d="M184,72H40A16,16,0,0,0,24,88V200a16,16,0,0,0,16,16H184a16,16,0,0,0,16-16V88A16,16,0,0,0,184,72Zm0,128H40V88H184V200ZM232,56V176a8,8,0,0,1-16,0V56H64a8,8,0,0,1,0-16H216A16,16,0,0,1,232,56Z" />
        </svg>
        Session Coach
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontSize: 76,
          lineHeight: 1.06,
          letterSpacing: "-0.04em",
        }}
      >
        <span>Own the code your agent writes.</span>
        <span style={{ color: muted }}>Explain it until it&rsquo;s yours.</span>
      </div>

      {/* A decision card's silhouette: two text lines and the day 1 · 4 · 11 schedule, day 1 done. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 32,
          padding: "22px 28px",
          border: `1px solid ${frame}`,
          borderRadius: 16,
          fontSize: 22,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12, flexGrow: 1 }}>
          <div style={{ width: "72%", height: 14, borderRadius: 7, background: row }} />
          <div style={{ width: "48%", height: 14, borderRadius: 7, background: well }} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div
            style={{
              display: "flex",
              padding: "8px 18px",
              borderRadius: 999,
              background: brand,
              color: "#ffffff",
            }}
          >
            Day 1
          </div>
          {["Day 4", "Day 11"].map((day) => (
            <div
              key={day}
              style={{
                display: "flex",
                padding: "7px 17px",
                borderRadius: 999,
                border: `1px solid ${frame}`,
                color: muted,
              }}
            >
              {day}
            </div>
          ))}
        </div>
      </div>
    </div>,
    { ...size, fonts: [{ name: "Mona Sans", data: await monaSans, style: "normal", weight: 500 }] },
  );
}
