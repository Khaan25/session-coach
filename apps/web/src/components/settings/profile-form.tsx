"use client";

import { UserIcon } from "@phosphor-icons/react";
import { useId, useState } from "react";

import { useAction } from "@/components/app/dry-run";
import { Button } from "@/components/ui/button";
import { SettingsSection } from "@/components/settings/settings-section";
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

/** Waits for a profile save and throws its error. */
async function settled(action: Promise<{ error: string | null }>) {
  const { error } = await action;
  if (error) {
    throw new Error(error);
  }
}

/** Runs a save under a toast; `onFail` rolls back when it fails, and `onSettled` runs either way. */
async function saveUnderToast(
  action: Promise<{ error: string | null }>,
  messages: { loading: string; success: string },
  { onFail, onSettled }: { onFail?: () => void; onSettled: () => void },
) {
  try {
    await toast.promise(settled(action), { ...messages, error: (error: Error) => error.message });
  } catch {
    onFail?.();
  } finally {
    onSettled();
  }
}

/**
 * The Profile section of /settings, one frame: display name and email (read-only, synced from sign-in), time zone and email
 * reminders, all through the `updateProfile` Server Action. Save profile saves the name and time zone; the reminder
 * switch saves on flip, like the report switches, so turning reminders off never waits on a button.
 */
export function ProfileForm({ profile, timezones }: { profile: Profile; timezones: string[] }) {
  const id = useId();
  const save = useAction(updateProfile);
  const [timezone, setTimezone] = useState(profile.timezone);
  const [notify, setNotify] = useState(profile.notify_email);
  const [pending, setPending] = useState(false);
  const [notifyPending, setNotifyPending] = useState(false);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const name = String(new FormData(event.currentTarget).get("display_name") ?? "").trim();
        setPending(true);
        void saveUnderToast(
          // A blank name is sent as null: the database and profileUpdateSchema reject "".
          save({ display_name: name || null, timezone }),
          { loading: "Saving your profile", success: "Profile saved" },
          { onSettled: () => setPending(false) },
        );
      }}
    >
      {/* One section and one frame: the three fields are one row in profiles, saved by one Server Action. The Save in the
          frame's footer covers the name and time zone; the reminder switch saves itself. */}
      <SettingsSection
        id="profile"
        icon={<UserIcon />}
        title="Profile"
        description="Your name, the time zone that decides which day a card is due, and the daily reminder."
        footer={
          <Button type="submit" disabled={pending}>
            Save profile
          </Button>
        }
      >
        <FieldGroup>
          {/* Two columns from md: name and time zone side by side, the reminder under them. */}
          <div className="grid gap-6 md:grid-cols-2">
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
                  ? `Shown in your account menu. Email: ${profile.email}, from how you sign in.`
                  : "Shown in your account menu. No email on file."}
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
                  placeholder="Find a time zone"
                  aria-describedby={`${id}-timezone-hint`}
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
                Your day starts at midnight here, so it decides which day a card is due.
              </FieldDescription>
            </Field>
          </div>
          <FieldSeparator />
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor={`${id}-notify`}>Email reminders</FieldLabel>
              <FieldDescription id={`${id}-notify-hint`}>
                Cards come back on day 1, 4 and 11. An email on days when cards are due; nothing on
                days with none.
              </FieldDescription>
            </FieldContent>
            <Switch
              id={`${id}-notify`}
              aria-describedby={`${id}-notify-hint`}
              checked={notify}
              disabled={notifyPending}
              onCheckedChange={(next) => {
                setNotify(next);
                setNotifyPending(true);
                void saveUnderToast(
                  save({ notify_email: next }),
                  { loading: "Saving", success: next ? "Reminders on" : "Reminders off" },
                  { onFail: () => setNotify(!next), onSettled: () => setNotifyPending(false) },
                );
              }}
            />
          </Field>
        </FieldGroup>
      </SettingsSection>
    </form>
  );
}
