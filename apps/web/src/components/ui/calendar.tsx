"use client";

import { CaretDownIcon, CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { cn } from "cn";
import * as React from "react";
import { DayPicker, getDefaultClassNames, type DayButton, type Locale } from "react-day-picker";

import { Button, buttonVariants } from "@/components/ui/button";

// A month grid on react-day-picker, in Quartz's date-picker look: 32px days on the soft corner, edge to edge,
// numbers in tabular figures. The selected day (or a range's ends) is ink with paper text; the band between
// a range's ends is the selected wash with straight inner edges; today carries a short bar under its number;
// outside days are text-3 and disabled days are struck through.

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  locale,
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "group/calendar bg-page p-3 text-text-1 [--cell-radius:var(--radius-soft)] [--cell-size:var(--control)] in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      captionLayout={captionLayout}
      locale={locale}
      formatters={{
        formatMonthDropdown: (date) => date.toLocaleString(locale?.code, { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit max-w-full", defaultClassNames.root),
        months: cn("relative flex flex-col gap-6 sm:flex-row", defaultClassNames.months),
        month: cn("flex w-full flex-col gap-2", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav,
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant, size: "icon-sm" }),
          "select-none aria-disabled:text-text-disabled",
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant, size: "icon-sm" }),
          "select-none aria-disabled:text-text-disabled",
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          "flex h-(--control-sm) w-full items-center justify-center px-(--cell-size)",
          defaultClassNames.month_caption,
        ),
        dropdowns: cn(
          "flex h-(--control-sm) w-full items-center justify-center gap-1.5 type-label",
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn(
          "relative rounded-(--cell-radius) has-focus-visible:focus-ring",
          defaultClassNames.dropdown_root,
        ),
        dropdown: cn("absolute inset-0 bg-raised opacity-0", defaultClassNames.dropdown),
        caption_label: cn(
          "type-label select-none",
          captionLayout !== "label" &&
            "flex items-center gap-1 rounded-(--cell-radius) [&>svg]:size-3.5 [&>svg]:text-text-3",
          defaultClassNames.caption_label,
        ),
        month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "flex h-(--control-sm) flex-1 items-center justify-center type-label-sm font-normal text-text-3 select-none",
          defaultClassNames.weekday,
        ),
        week: cn("mt-0.5 flex w-full", defaultClassNames.week),
        week_number_header: cn("w-(--cell-size) select-none", defaultClassNames.week_number_header),
        week_number: cn(
          "type-label-sm data text-text-3 select-none",
          defaultClassNames.week_number,
        ),
        day: cn(
          "group/day relative aspect-square h-full w-full rounded-(--cell-radius) p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-e-(--cell-radius)",
          props.showWeekNumber
            ? "[&:nth-child(2)[data-selected=true]_button]:rounded-s-(--cell-radius)"
            : "[&:first-child[data-selected=true]_button]:rounded-s-(--cell-radius)",
          defaultClassNames.day,
        ),
        // The band is the selected wash; its ends keep their straight band-side edges.
        range_start: cn(
          "relative isolate z-0 rounded-s-(--cell-radius) bg-accent-wash after:absolute after:inset-y-0 after:end-0 after:w-4 after:bg-accent-wash",
          defaultClassNames.range_start,
        ),
        range_middle: cn("rounded-none bg-accent-wash", defaultClassNames.range_middle),
        range_end: cn(
          "relative isolate z-0 rounded-e-(--cell-radius) bg-accent-wash after:absolute after:inset-y-0 after:start-0 after:w-4 after:bg-accent-wash",
          defaultClassNames.range_end,
        ),
        today: cn("text-text-1", defaultClassNames.today),
        outside: cn("text-text-3 aria-selected:text-text-3", defaultClassNames.outside),
        disabled: cn("text-text-disabled", defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return <div data-slot="calendar" ref={rootRef} className={cn(className)} {...props} />;
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return <CaretLeftIcon className={cn("size-4 rtl:rotate-180", className)} {...props} />;
          }

          if (orientation === "right") {
            return <CaretRightIcon className={cn("size-4 rtl:rotate-180", className)} {...props} />;
          }

          return <CaretDownIcon className={cn("size-4", className)} {...props} />;
        },
        DayButton: ({ ...props }) => <CalendarDayButton locale={locale} {...props} />,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-(--cell-size) items-center justify-center text-center">
                {children}
              </div>
            </td>
          );
        },
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  locale,
  ...props
}: React.ComponentProps<typeof DayButton> & { locale?: Partial<Locale> }) {
  const defaultClassNames = getDefaultClassNames();

  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <button
      ref={ref}
      type="button"
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-today={(modifiers.today && !modifiers.outside) || undefined}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "relative isolate z-10 flex aspect-square size-auto w-full min-w-(--cell-size) flex-col items-center justify-center gap-1 rounded-(--cell-radius) data type-label text-current",
        // The button's press: a 2% sink, as every Button takes.
        "transition-[color,background-color,scale] duration-(--dur-fast) ease-(--ease-step) active:duration-(--dur-press) active:not-disabled:scale-[0.98] motion-reduce:scale-none!",
        // Days sit edge to edge: the ring sits inside, and on an ink end it is paper.
        "group-data-[focused=true]/day:focus-ring-inset focus-visible:focus-ring-inset",
        "hover:not-disabled:not-data-[selected-single=true]:not-data-[range-start=true]:not-data-[range-end=true]:bg-hover",
        "data-[selected-single=true]:bg-ink data-[selected-single=true]:text-text-inverse data-[selected-single=true]:focus-visible:focus-ring-ink",
        "data-[range-start=true]:rounded-(--cell-radius) data-[range-start=true]:rounded-s-(--cell-radius) data-[range-start=true]:bg-ink data-[range-start=true]:text-text-inverse data-[range-start=true]:focus-visible:focus-ring-ink",
        "data-[range-end=true]:rounded-(--cell-radius) data-[range-end=true]:rounded-e-(--cell-radius) data-[range-end=true]:bg-ink data-[range-end=true]:text-text-inverse data-[range-end=true]:focus-visible:focus-ring-ink",
        "data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-transparent data-[range-middle=true]:text-text-1",
        "data-today:after:absolute data-today:after:bottom-1.5 data-today:after:h-0.5 data-today:after:w-3 data-today:after:bg-current data-today:after:content-['']",
        "disabled:cursor-not-allowed disabled:text-text-disabled disabled:line-through disabled:decoration-1",
        "forced-colors:data-[selected-single=true]:border-2 [&>span]:type-label-sm [&>span]:text-text-3",
        defaultClassNames.day,
        className,
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
