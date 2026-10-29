"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { CheckboxGroup as CheckboxGroupPrimitive } from "@base-ui/react/checkbox-group";
import { CheckIcon, MinusIcon } from "@phosphor-icons/react";
import { cn } from "cn";

// Quartz's checkbox: a 16px square with the soft corner. Unticked is paper with a 1px control edge at
// --border-control (the 3:1 edge a tick box needs) that turns ink on hover. Ticked and mixed are solid ink
// with a paper glyph, so the state reads from the fill. Invalid turns the edge to the fail line; the fill stays ink.
// The box stops its click from bubbling, so ticking a checkbox inside a clickable row never opens the row.
function Checkbox({ className, onClick, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      onClick={(event) => {
        onClick?.(event);
        event.stopPropagation();
      }}
      className={cn(
        "peer relative inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-soft outline-none [-webkit-tap-highlight-color:transparent]",
        "bg-page text-text-inverse control-edge transition-shadow [--frame-color:var(--border-control)]",
        "touch-target not-pointer-coarse:after:absolute not-pointer-coarse:after:-inset-x-3 not-pointer-coarse:after:-inset-y-2",
        "hover:not-data-disabled:not-data-readonly:not-data-checked:not-data-indeterminate:not-aria-invalid:[--frame-color:var(--ink)]",
        "data-indeterminate:bg-ink data-checked:bg-ink",
        "active:not-data-disabled:not-data-readonly:not-data-checked:not-data-indeterminate:bg-pressed active:not-data-disabled:not-data-readonly:data-indeterminate:bg-button-primary-hover active:not-data-disabled:not-data-readonly:data-checked:bg-button-primary-hover",
        // Invalid: the fail edge, no wash. Disabled: a fainter edge on paper, and no lift.
        "aria-invalid:[--frame-color:var(--fail-line)]",
        "group-has-disabled/field:[--frame-color:var(--text-disabled)] data-disabled:cursor-not-allowed data-disabled:bg-page data-disabled:text-text-inverse data-disabled:[--control-lift:var(--elev-none)] data-disabled:[--frame-color:var(--text-disabled)]",
        "data-disabled:data-indeterminate:bg-text-disabled data-disabled:data-checked:bg-text-disabled",
        "data-readonly:cursor-default",
        "forced-colors:border forced-colors:border-solid forced-colors:border-[CanvasText]",
        "forced-colors:data-checked:bg-[Highlight]! forced-colors:data-checked:text-[HighlightText]! forced-colors:data-checked:[forced-color-adjust:none]",
        className,
      )}
      {...props}
    >
      {/* `keepMounted` so the tick can animate out as well as in. */}
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        keepMounted
        className="grid place-content-center text-current transition-[opacity,filter,scale] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none data-unchecked:scale-25 data-unchecked:opacity-0 data-unchecked:blur-[4px] [&>svg]:size-3"
        render={(indicatorProps, state) => (
          <span {...indicatorProps}>
            {state.indeterminate ? <MinusIcon weight="bold" /> : <CheckIcon weight="bold" />}
          </span>
        )}
      />
    </CheckboxPrimitive.Root>
  );
}

/** A set of checkboxes with one value array. Give it `allValues` to let a `parent` Checkbox select all. */
function CheckboxGroup({ className, ...props }: CheckboxGroupPrimitive.Props) {
  return (
    <CheckboxGroupPrimitive
      data-slot="checkbox-group"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

export { Checkbox, CheckboxGroup };
