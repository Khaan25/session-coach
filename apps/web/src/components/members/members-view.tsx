import { InfoIcon, UserPlusIcon, UsersIcon } from "@phosphor-icons/react/ssr";
import { useId } from "react";

import { SettingsSection } from "@/components/settings/settings-section";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLES = [
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" },
];

/**
 * /members before v2: a note that sharing isn't built yet, the invite form switched off, and the one member there is, the
 * learner, as Owner. Static: nothing here reads or writes other people.
 *
 * @param name - The learner's display name, or their email when they have none.
 * @param email - Their sign-in email.
 * @param initials - Their avatar letters, from lib/auth/initials.
 */
export function MembersView({
  name,
  email,
  initials,
}: {
  name: string;
  email: string | null;
  initials: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-6">
      <Item variant="muted">
        <ItemMedia variant="icon">
          <InfoIcon aria-hidden />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Members is coming in v2</ItemTitle>
          <ItemDescription>
            You will invite teammates to share projects. Until then, your projects are yours alone.
          </ItemDescription>
        </ItemContent>
      </Item>
      <SettingsSection
        id="invite"
        icon={<UserPlusIcon />}
        title="Invite people"
        description="They get an email with a link to join."
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Field>
              <FieldLabel htmlFor={`${id}-email`}>Email address</FieldLabel>
              <Input
                id={`${id}-email`}
                type="email"
                placeholder="sam@company.com"
                aria-describedby={`${id}-hint`}
                disabled
              />
            </Field>
          </div>
          <div className="sm:w-40">
            <Field>
              <FieldLabel htmlFor={`${id}-role`}>Role</FieldLabel>
              <Select items={ROLES} defaultValue="member" disabled>
                <SelectTrigger id={`${id}-role`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Button disabled>Send invite</Button>
        </div>
        <FieldDescription id={`${id}-hint`}>Invites open in v2.</FieldDescription>
      </SettingsSection>
      <SettingsSection
        id="members"
        icon={<UsersIcon />}
        title="Members"
        meta={<Badge variant="outline">1</Badge>}
      >
        <ItemGroup aria-label="Members">
          {/* ItemGroup is a div with role="list" (see ui/item.tsx), so the row takes the matching role. */}
          {/* eslint-disable-next-line jsx-a11y/prefer-tag-over-role */}
          <Item role="listitem">
            <ItemMedia>
              <Avatar>
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </ItemMedia>
            <ItemContent>
              <ItemTitle>
                <span>
                  {name} <span className="text-text-2">(you)</span>
                </span>
              </ItemTitle>
              {email && <ItemDescription>{email}</ItemDescription>}
            </ItemContent>
            <ItemActions>
              <span className="type-body-sm text-text-2">Owner</span>
            </ItemActions>
          </Item>
        </ItemGroup>
      </SettingsSection>
    </div>
  );
}
