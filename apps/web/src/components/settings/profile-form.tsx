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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type Profile = {
  display_name: string | null;
  email: string | null;
  timezone: string;
  notify_email: boolean;
};

/**
 * The profile: display name, email (read-only, synced from sign-in), time zone and email reminders. Saving is a mock.
 * TODO(zia): update display_name, timezone and notify_email through the anon client (the only columns a learner may
 * write), validated with profileUpdateSchema.
 */
export function ProfileForm({ profile, timezones }: { profile: Profile; timezones: string[] }) {
  const id = useId();
  const [timezone, setTimezone] = useState(profile.timezone);
  return (
    <form onSubmit={(event) => event.preventDefault()}>
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
              <Select
                name="timezone"
                value={timezone}
                onValueChange={(value) => value && setTimezone(value)}
              >
                <SelectTrigger id={`${id}-timezone`} aria-describedby={`${id}-timezone-hint`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((zone) => (
                    <SelectItem key={zone} value={zone}>
                      {zone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Switch
                id={`${id}-notify`}
                name="notify_email"
                defaultChecked={profile.notify_email}
              />
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter>
          {/* TODO(zia): mock save; nothing is written yet. */}
          <Button type="submit">Save profile</Button>
        </CardFooter>
      </Card>
    </form>
  );
}
