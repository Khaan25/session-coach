"use client";

import { LaptopIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { ChecklistStep } from "@/components/settings/checklist-step";
import { RevokeTokenDialog, type DeviceListRow } from "@/components/setup/device-section";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";

/**
 * Step 5 of the settings checklist: every computer the CLI signed in on (one cli_tokens row each), with Disconnect,
 * which revokes that token. New devices come from session-coach login; /setup also makes a token by hand.
 *
 * @param devices - The learner's devices, or null when they couldn't be read.
 */
export function DevicesStep({ devices }: { devices: DeviceListRow[] | null }) {
  const [rows, setRows] = useState(devices);
  return (
    <ChecklistStep
      n={5}
      title="Devices"
      changes="Each device is the CLI token it signed in with. Disconnect revokes that token: the computer can't push until you run npx session-coach login there again."
      done={rows ? rows.length > 0 : undefined}
    >
      {rows === null ? (
        <ErrorState
          variant="plain"
          title="Couldn't load your devices"
          message="Reload the page to try again."
        />
      ) : rows.length === 0 ? (
        <EmptyState
          variant="plain"
          title="No computer connected yet"
          description="Run npx session-coach login on the computer you code on, or follow Setup."
        />
      ) : (
        <ItemGroup aria-label="Connected devices">
          {rows.map((row) => (
            // ItemGroup is a div with role="list" (see ui/item.tsx), so the row takes the matching role.
            // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
            <Item key={row.id} role="listitem">
              <ItemMedia variant="icon">
                <LaptopIcon aria-hidden />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{row.label}</ItemTitle>
                <ItemDescription>
                  {/* last_used_at moves on any CLI call, not only a push, so it says "used". */}
                  {row.lastUsed ? `Last used ${row.lastUsed}` : "Never used"}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <RevokeTokenDialog
                  id={row.id}
                  label={row.label}
                  verb="Disconnect"
                  onRevoke={() =>
                    setRows((current) => current?.filter(({ id }) => id !== row.id) ?? null)
                  }
                />
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      )}
    </ChecklistStep>
  );
}
