"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { niceScale } from "@/components/ui/chart-scale";
import { Code, CodeBlock, CopyCodeButton, MaskedKey } from "@/components/ui/code-block";
import { Timeline, type TimelineSpan } from "@/components/ui/timeline";

import { GallerySection, Specimen } from "./gallery-section";
import { cards, session } from "./sample";

// Sample chart numbers: there is no real series yet. TODO(zia): real cards and scores per day.
const BY_DAY = [
  { day: "Mon", cards: 4, explained: 3 },
  { day: "Tue", cards: 3, explained: 3 },
  { day: "Wed", cards: 5, explained: 2 },
  { day: "Thu", cards: 0, explained: 1 },
  { day: "Fri", cards: 4, explained: 4 },
];
const CHART_CONFIG = {
  cards: { label: "Cards written", color: "var(--color-chart-1)" },
  explained: { label: "Explained back", color: "var(--color-chart-2)" },
} satisfies ChartConfig;

// The loop as one run: the session, the card writer, the evidence check and the reviews. Times are sample ms.
const SPANS: TimelineSpan[] = [
  { id: "session", label: session.title, start: 0, end: 4200, kind: "agent", meta: session.agent },
  {
    id: "parse",
    label: "Read transcript",
    start: 200,
    end: 900,
    depth: 1,
    status: "ok",
    meta: `${session.event_count} events`,
  },
  {
    id: "write",
    label: "Write decision cards",
    start: 900,
    end: 3100,
    depth: 1,
    kind: "model",
    figure: `${cards.length} cards`,
  },
  {
    id: "check",
    label: "Check evidence quotes",
    start: 3100,
    end: 3900,
    depth: 1,
    status: "warn",
    meta: "1 unverified",
  },
  {
    id: "hidden",
    label: "Hide card without proof",
    start: 3900,
    end: 4100,
    depth: 2,
    status: "fail",
  },
  { id: "review", label: "Day 1 review", start: 4100, status: "waiting" },
];
const SAMPLE_CODE = `// ${cards[0].files[0]}
import { resultSchema } from "./resultSchema.js";

export function parseLine(line: string) {
  const event = JSON.parse(line);
  if (!KNOWN_TYPES.has(event.type)) return null; // skip, don't throw
  return resultSchema.parse(event);
}`;
const ticks = niceScale(0, session.event_count).ticks;

function DataCatalog() {
  return (
    <GallerySection
      id="data"
      title="Data"
      description="Chart, chart scale, timeline, code block, inline code and masked key."
    >
      <Specimen label="Chart: bars and lines, tooltip and legend">
        <div className="grid w-full gap-6 lg:grid-cols-2">
          <ChartContainer config={CHART_CONFIG} className="h-56 w-full">
            <BarChart data={BY_DAY}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="cards" fill="var(--color-cards)" />
              <Bar dataKey="explained" fill="var(--color-explained)" />
            </BarChart>
          </ChartContainer>
          <ChartContainer config={CHART_CONFIG} className="h-56 w-full">
            <LineChart data={BY_DAY}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={24} />
              <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
              <Line dataKey="explained" stroke="var(--color-explained)" dot={false} />
              <Line dataKey="cards" stroke="var(--color-cards)" strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ChartContainer>
        </div>
      </Specimen>

      <Specimen label="Chart scale">
        <span className="type-body-sm text-text-2">
          niceScale(0, {session.event_count}) gives ticks
        </span>
        {ticks.map((tick) => (
          <Badge key={tick} variant="outline">
            {tick}
          </Badge>
        ))}
      </Specimen>

      <Specimen label="Timeline: kind bars, quiet bars, small and loading">
        <div className="grid w-full gap-4">
          <Timeline label={session.title} spans={SPANS} now={4600} kind="agent" />
          <Timeline
            label="Quiet bars"
            spans={SPANS}
            now={4600}
            bars="quiet"
            activeId="write"
            size="sm"
          />
          <Timeline label="Loading" spans={[]} loading />
        </div>
      </Specimen>

      <Specimen label="Code">
        <div className="grid w-full gap-4 lg:grid-cols-2">
          <CodeBlock
            code={SAMPLE_CODE}
            language="ts"
            filename={cards[0].files[0]}
            header
            lineNumbers
            highlight={[6]}
          />
          <div className="flex flex-col gap-4">
            <CodeBlock variant="command" command={["pnpm install", "pnpm dev"]} />
            <CodeBlock
              variant="command"
              size="sm"
              code={`$ export COACH_TOKEN=sc_demo_0000\nToken saved`}
              secret="sc_demo_0000"
            />
            <CodeBlock code={`{ "status": "${session.status}" }`} language="json" defaultWrap />
          </div>
        </div>
        <p className="type-body text-text-1">
          The parser lives in <Code>{cards[0].files[0]}</Code>, set as plain{" "}
          <Code variant="plain">transcriptParser</Code>, and as a run reference{" "}
          <Code kind="run" href="#data">
            run_8f2a91c0
          </Code>
          .
        </p>
        <MaskedKey prefix="sc_demo_" tail="i0p0" length={24} />
        <CopyCodeButton text={session.raw_path} label="Copy raw path" />
      </Specimen>
    </GallerySection>
  );
}

export { DataCatalog };
