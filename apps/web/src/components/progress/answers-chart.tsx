"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const config = {
  answers: { label: "Answers", color: "var(--color-chart-1)" },
} satisfies ChartConfig;

/** Answers per day: one bar a day, with the total said in words for screen readers. */
export function AnswersChart({ data }: { data: { day: string; answers: number }[] }) {
  const total = data.reduce((sum, { answers }) => sum + answers, 0);
  return (
    <figure className="flex flex-col gap-2">
      <ChartContainer config={config} className="h-56 w-full" aria-hidden>
        <BarChart data={data}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="day" tickLine={false} axisLine={false} interval={6} />
          <YAxis tickLine={false} axisLine={false} width={24} allowDecimals={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="answers" fill="var(--color-answers)" />
        </BarChart>
      </ChartContainer>
      <figcaption className="type-body-sm text-text-2">
        {total} answers in the last {data.length} days, from {data[0]?.day} to {data.at(-1)?.day}.
      </figcaption>
    </figure>
  );
}
