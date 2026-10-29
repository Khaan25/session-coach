"use client";

import { cn } from "cn";
import * as React from "react";
import * as RechartsPrimitive from "recharts";

// recharts in the design system's chart look: axis ticks in text-3 at label-sm with tabular figures, grid and reference
// lines in the row rule, the cursor in the hover wash, and a tooltip on the overlay surface (paper, the
// overlay shadow, no glass). Series colours come from the config; point them at tokens, as
// `{ sessions: { label: "Sessions", color: "var(--color-chart-1)" } }`, and read them in the chart as
// `var(--color-sessions)`.

const THEMES = { light: "", dark: ".dark" } as const;

const INITIAL_DIMENSION = { width: 320, height: 200 } as const;
type TooltipValueType = number | string | Array<number | string>;
type TooltipNameType = number | string;

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
>;

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }

  return context;
}

function ChartContainer({
  id,
  className,
  children,
  config,
  initialDimension = INITIAL_DIMENSION,
  style,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
  initialDimension?: {
    width: number;
    height: number;
  };
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center type-label-sm data text-text-2",
          // recharts paints its own greys on these parts; each is pointed at a role instead.
          "[&_.recharts-cartesian-axis-line]:stroke-line-row [&_.recharts-cartesian-axis-tick_text]:fill-text-3 [&_.recharts-cartesian-axis-tick-line]:stroke-line-row",
          "[&_.recharts-cartesian-grid_line]:stroke-line-row [&_.recharts-polar-grid_line]:stroke-line-row [&_.recharts-polar-grid_path]:stroke-line-row [&_.recharts-reference-line_line]:stroke-line-row",
          "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-strong [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-hover",
          "[&_.recharts-dot]:stroke-page [&_.recharts-radial-bar-background-sector]:fill-cell-quiet [&_.recharts-sector]:stroke-page",
          "[&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-surface]:outline-hidden",
          className,
        )}
        {...props}
        // Only --color-<key> custom properties, from the caller's config (token references, by contract).
        // oxlint-disable-next-line shadcn/no-inline-styles
        style={{ ...chartVars(config), ...style }}
      >
        <RechartsPrimitive.ResponsiveContainer initialDimension={initialDimension}>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

/**
 * The config's colours as --color-<key> on the container. A themed entry becomes light-dark(), which follows
 * the color-scheme the design system sets on each theme, so no stylesheet has to be injected.
 */
function chartVars(config: ChartConfig) {
  const vars: Record<string, string> = {};
  for (const [key, item] of Object.entries(config)) {
    const color = item.theme ? `light-dark(${item.theme.light}, ${item.theme.dark})` : item.color;
    if (color) vars[`--color-${key}`] = color;
  }
  return vars as React.CSSProperties;
}

/**
 * A series' swatch, drawn in SVG so its colour is a fill attribute rather than an inline style. dot: a 10px
 * square on the inner corner; line: a 4px bar the height of the row; dashed: a dashed rule.
 */
function Swatch({ color, indicator }: { color?: string; indicator: "line" | "dot" | "dashed" }) {
  if (indicator === "dashed") {
    return (
      <svg
        aria-hidden
        className="w-0.5 shrink-0 self-stretch"
        preserveAspectRatio="none"
        viewBox="0 0 2 10"
      >
        <line x1="1" y1="0" x2="1" y2="10" stroke={color} strokeWidth="2" strokeDasharray="2 2" />
      </svg>
    );
  }
  if (indicator === "line") {
    return (
      <svg
        aria-hidden
        className="w-1 shrink-0 self-stretch"
        preserveAspectRatio="none"
        viewBox="0 0 4 10"
      >
        <rect width="4" height="10" rx="1" fill={color} />
      </svg>
    );
  }
  return (
    <svg aria-hidden className="size-2.5 shrink-0" viewBox="0 0 10 10">
      <rect width="10" height="10" rx="2" fill={color} />
    </svg>
  );
}

const ChartTooltip = RechartsPrimitive.Tooltip;

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
  React.ComponentProps<"div"> & {
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: "line" | "dot" | "dashed";
    nameKey?: string;
    labelKey?: string;
  } & Omit<
    RechartsPrimitive.DefaultTooltipContentProps<TooltipValueType, TooltipNameType>,
    "accessibilityLayer"
  >) {
  const { config } = useChart();

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !payload?.length) {
      return null;
    }

    const [item] = payload;
    const key = `${labelKey ?? item?.dataKey ?? item?.name ?? "value"}`;
    const itemConfig = getPayloadConfigFromPayload(config, item, key);
    const value =
      !labelKey && typeof label === "string" ? (config[label]?.label ?? label) : itemConfig?.label;

    if (labelFormatter) {
      return (
        <div className={cn("type-label-sm text-text-1", labelClassName)}>
          {labelFormatter(value, payload)}
        </div>
      );
    }

    if (!value) {
      return null;
    }

    return <div className={cn("type-label-sm text-text-1", labelClassName)}>{value}</div>;
  }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey]);

  if (!active || !payload?.length) {
    return null;
  }

  const nestLabel = payload.length === 1 && indicator !== "dot";

  return (
    <div
      className={cn(
        "grid min-w-32 items-start gap-1.5 rounded-soft bg-page px-2.5 py-1.5 type-label-sm text-text-1 shadow-overlay forced-colors:outline forced-colors:outline-1",
        className,
      )}
    >
      {!nestLabel ? tooltipLabel : null}
      <div className="grid gap-1.5">
        {payload
          .filter((item) => item.type !== "none")
          .map((item, index) => {
            const key = `${nameKey ?? item.name ?? item.dataKey ?? "value"}`;
            const itemConfig = getPayloadConfigFromPayload(config, item, key);
            const indicatorColor = color ?? item.payload?.fill ?? item.color;

            return (
              <div
                key={index}
                className={cn(
                  "flex w-full flex-wrap items-stretch gap-2 [&>svg]:size-2.5 [&>svg]:text-text-3",
                  indicator === "dot" && "items-center",
                )}
              >
                {formatter && item?.value !== undefined && item.name ? (
                  formatter(item.value, item.name, item, index, item.payload)
                ) : (
                  <>
                    {itemConfig?.icon ? (
                      <itemConfig.icon />
                    ) : (
                      !hideIndicator && <Swatch color={indicatorColor} indicator={indicator} />
                    )}
                    <div
                      className={cn(
                        "flex flex-1 justify-between gap-3 leading-none",
                        nestLabel ? "items-end" : "items-center",
                      )}
                    >
                      <div className="grid gap-1.5">
                        {nestLabel ? tooltipLabel : null}
                        <span className="text-text-2">{itemConfig?.label ?? item.name}</span>
                      </div>
                      {item.value != null && (
                        <span className="data text-text-1">
                          {typeof item.value === "number"
                            ? item.value.toLocaleString()
                            : String(item.value)}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

const ChartLegend = RechartsPrimitive.Legend;

function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = "bottom",
  nameKey,
}: React.ComponentProps<"div"> & {
  hideIcon?: boolean;
  nameKey?: string;
} & RechartsPrimitive.DefaultLegendContentProps) {
  const { config } = useChart();

  if (!payload?.length) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-4 type-label-sm text-text-2",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className,
      )}
    >
      {payload
        .filter((item) => item.type !== "none")
        .map((item, index) => {
          const key = `${nameKey ?? item.dataKey ?? "value"}`;
          const itemConfig = getPayloadConfigFromPayload(config, item, key);

          return (
            <div
              key={index}
              className="flex items-center gap-1.5 [&>svg]:size-3 [&>svg]:text-text-3"
            >
              {itemConfig?.icon && !hideIcon ? (
                <itemConfig.icon />
              ) : (
                <svg aria-hidden className="size-2 shrink-0" viewBox="0 0 8 8">
                  <rect width="8" height="8" rx="2" fill={item.color} />
                </svg>
              )}
              {itemConfig?.label}
            </div>
          );
        })}
    </div>
  );
}

function getPayloadConfigFromPayload(config: ChartConfig, payload: unknown, key: string) {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const payloadPayload =
    "payload" in payload && typeof payload.payload === "object" && payload.payload !== null
      ? payload.payload
      : undefined;

  let configLabelKey: string = key;

  if (key in payload && typeof payload[key as keyof typeof payload] === "string") {
    configLabelKey = payload[key as keyof typeof payload] as string;
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
  ) {
    configLabelKey = payloadPayload[key as keyof typeof payloadPayload] as string;
  }

  return configLabelKey in config ? config[configLabelKey] : config[key];
}

export { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent };
