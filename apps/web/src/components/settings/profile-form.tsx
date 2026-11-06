"use client";

import { useId, useState } from "react";

import { useAction } from "@/components/app/dry-run";
import { Button } from "@/components/ui/button";
import { ChecklistStep } from "@/components/settings/checklist-step";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";

import { updateProfile } from "@/app/(app)/settings/actions";

type Profile = {
  display_name: string | null;
  email: string | null;
  timezone: string;
  notify_email: boolean;
};

/**
 * Steps 1 to 3 of the settings checklist: display name and email (read-only, synced from sign-in), time zone and email
 * reminders. Saves the three columns a learner may write through the `updateProfile` Server Action, with one button.
 */
export function ProfileForm({ profile, timezones }: { profile: Profile; timezones: string[] }) {
  const id = useId();
  const save = useAction(updateProfile);
  const [timezone, setTimezone] = useState(profile.timezone);
  const [notify, setNotify] = useState(profile.notify_email);
  const [pending, setPending] = useState(false);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const name = String(new FormData(event.currentTarget).get("display_name") ?? "").trim();
        setPending(true);
        toast
          .promise(
            // A blank name is sent as null: the database and profileUpdateSchema reject "".
            save({ display_name: name || null, timezone, notify_email: notify }).then(
              ({ error }) => {
                if (error) throw new Error(error);
              },
            ),
            {
              loading: "Saving your profile",
              success: "Profile saved",
              error: (error: Error) => error.message,
            },
          )
          .catch(() => {})
          .finally(() => setPending(false));
      }}
    >
      <ol className="flex flex-col gap-8">
        <ChecklistStep
          n={1}
          title="Your name"
          changes="Shown in your account menu."
          done={Boolean(profile.display_name)}
        >
          <Field>
            <FieldLabel htmlFor={`${id}-name`}>Display name</FieldLabel>
            <Input
              id={`${id}-name`}
              name="display_name"
              defaultValue={profile.display_name ?? ""}
              maxLength={100}
              autoComplete="name"
              aria-describedby={`${id}-email-hint`}
            />
            {/* TODO(zia): say how to change the email. */}
            <FieldDescription id={`${id}-email-hint`}>
              {profile.email
                ? `Email: ${profile.email}, from how you sign in.`
                : "No email on file."}
            </FieldDescription>
          </Field>
        </ChecklistStep>
        <ChecklistStep
          n={2}
          title="Time zone"
          changes="Your day starts at midnight here, so it decides which day a card is due."
          // UTC is the column's default, so it may never have been chosen.
          done={profile.timezone !== "UTC"}
        >
          <Field>
            <FieldLabel htmlFor={`${id}-timezone`}>Time zone</FieldLabel>
            <Combobox
              items={timezones}
              value={timezone}
              onValueChange={(value: string | null) => value && setTimezone(value)}
            >
              <ComboboxInput id={`${id}-timezone`} placeholder="Find a time zone" />
              <ComboboxContent>
                <ComboboxEmpty>No time zones match.</ComboboxEmpty>
                <ComboboxList>
                  {(zone: string) => (
                    <ComboboxItem key={zone} value={zone}>
                      {zone}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </Field>
        </ChecklistStep>
        <ChecklistStep
          n={3}
          title="Daily reminder"
          changes="Cards come back on day 1, 4 and 11. The email tells you when one is due."
          done
        >
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor={`${id}-notify`}>Email reminders</FieldLabel>
              <FieldDescription id={`${id}-notify-hint`}>
                An email on days when cards are due. Nothing on days with none.
              </FieldDescription>
            </FieldContent>
            <Switch
              id={`${id}-notify`}
              aria-describedby={`${id}-notify-hint`}
              checked={notify}
              onCheckedChange={setNotify}
            />
          </Field>
        </ChecklistStep>
      </ol>
      {/* One save for steps 1 to 3: they are one row in profiles, saved by one Server Action. */}
      <div className="mt-4 flex flex-wrap items-center gap-3 md:ms-auto md:w-2/3">
        <Button type="submit" disabled={pending}>
          Save profile
        </Button>
        <p className="type-body-sm text-text-2">Saves steps 1 to 3.</p>
      </div>
    </form>
  );
}
