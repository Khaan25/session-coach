"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
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
 * The profile: display name, email (read-only, synced from sign-in), time zone and email reminders. Saves the three
 * columns a learner may write through the `updateProfile` Server Action.
 */
export function ProfileForm({ profile, timezones }: { profile: Profile; timezones: string[] }) {
  const id = useId();
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
            updateProfile({ display_name: name || null, timezone, notify_email: notify }).then(
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
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Profile</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`${id}-name`}>Display name</FieldLabel>
              <Input
                id={`${id}-name`}
                name="display_name"
                defaultValue={profile.display_name ?? ""}
                maxLength={100}
                autoComplete="name"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-email`}>Email</FieldLabel>
              <Input
                id={`${id}-email`}
                type="email"
                value={profile.email ?? ""}
                readOnly
                aria-describedby={`${id}-email-hint`}
              />
              <FieldDescription id={`${id}-email-hint`}>
                Comes from how you sign in. TODO(zia): how to change it.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-timezone`}>Time zone</FieldLabel>
              <Combobox
                items={timezones}
                value={timezone}
                onValueChange={(value: string | null) => value && setTimezone(value)}
              >
                <ComboboxInput
                  id={`${id}-timezone`}
                  aria-describedby={`${id}-timezone-hint`}
                  placeholder="Find a time zone"
                />
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
              <FieldDescription id={`${id}-timezone-hint`}>
                Sets when a card is due today.
              </FieldDescription>
            </Field>
            <FieldSeparator />
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor={`${id}-notify`}>Email reminders</FieldLabel>
                <FieldDescription>An email on days when cards are due.</FieldDescription>
              </FieldContent>
              <Switch id={`${id}-notify`} checked={notify} onCheckedChange={setNotify} />
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending}>
            Save profile
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
