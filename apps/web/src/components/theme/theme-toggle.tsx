"use client";

import { MoonIcon, SunIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useTheme, type Theme } from "./theme-provider";

const OPTIONS: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

/*
 * Ported from the vennsol design-system zip (`ThemeToggle.tsx`). A three-way radio menu, because
 * "follow the OS" is its own choice and a boolean cannot hold it. Both icons stay mounted and
 * cross-fade off `resolvedTheme`; `motion-reduce` drops the rotation and keeps the fade.
 */
export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="icon" />}
        aria-label={`Theme: ${theme}`}
      >
        <span className="relative size-4">
          <SunIcon
            aria-hidden="true"
            data-resolved={resolvedTheme}
            className="absolute inset-0 size-4 scale-100 rotate-0 opacity-100 transition duration-200 ease-out-quint data-[resolved=dark]:scale-0 data-[resolved=dark]:-rotate-90 data-[resolved=dark]:opacity-0 motion-reduce:transition-opacity"
          />
          <MoonIcon
            aria-hidden="true"
            data-resolved={resolvedTheme}
            className="absolute inset-0 size-4 scale-0 rotate-90 opacity-0 transition duration-200 ease-out-quint data-[resolved=dark]:scale-100 data-[resolved=dark]:rotate-0 data-[resolved=dark]:opacity-100 motion-reduce:transition-opacity"
          />
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as Theme)}>
          {OPTIONS.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
