"use client";

import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";
import { cn } from "cn";
import * as React from "react";

// Who or what did something. The design system's shapes: a person is round (the only round thing besides the radio),
// initials on paper inside the control edge; an agent is a soft-cornered square on the agent tint, so a person
// and an agent never read alike; a source (a cited page, a connected tool) is a soft-cornered square.
// Built on Base UI's Avatar, so the fallback shows while an image loads and stays if it fails.

type AvatarSize = "2xs" | "xs" | "sm" | "default" | "lg";
type AvatarType = "person" | "agent" | "source";

function Avatar({
  className,
  size = "default",
  type = "person",
  ...props
}: AvatarPrimitive.Root.Props & {
  size?: AvatarSize;
  type?: AvatarType;
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      data-type={type}
      data-kind={type === "agent" ? "agent" : undefined}
      className={cn(
        "group/avatar relative inline-flex size-8 shrink-0 rounded-full select-none data-[size=2xs]:size-4 data-[size=lg]:size-10 data-[size=sm]:size-6 data-[size=xs]:size-5",
        "data-[type=agent]:rounded-soft data-[type=source]:overflow-hidden data-[type=source]:rounded-soft",
        className,
      )}
      {...props}
    />
  );
}

function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      decoding="async"
      draggable={false}
      className={cn(
        "aspect-square size-full rounded-[inherit] object-cover group-data-[type=source]/avatar:object-contain",
        className,
      )}
      {...props}
    />
  );
}

function AvatarFallback({ className, ...props }: AvatarPrimitive.Fallback.Props) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center overflow-hidden rounded-[inherit] bg-page type-label-sm text-text-1",
        // A person's initials and a source's letter sit on paper inside the control edge; an image has no edge.
        "group-data-[type=person]/avatar:control-edge group-data-[type=source]/avatar:text-text-2 group-data-[type=source]/avatar:control-edge",
        "group-data-[type=agent]/avatar:bg-accent-tint group-data-[type=agent]/avatar:text-accent-label",
        "group-data-[size=lg]/avatar:type-label [&>svg:not([class*='size-'])]:size-4",
        "forced-colors:outline forced-colors:outline-1 forced-colors:-outline-offset-1",
        className,
      )}
      {...props}
    />
  );
}

/** A mark on the avatar's corner, cut out of the page by a 2px ring. */
function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        "absolute end-0 bottom-0 z-(--z-raised) inline-flex items-center justify-center rounded-full bg-inverse text-text-inverse ring-2 ring-page select-none",
        "group-data-[size=2xs]/avatar:size-1.5 group-data-[size=2xs]/avatar:[&>svg]:hidden",
        "group-data-[size=xs]/avatar:size-2 group-data-[size=xs]/avatar:[&>svg]:hidden",
        "group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden",
        "group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2",
        "group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2",
        className,
      )}
      {...props}
    />
  );
}

/** Avatars that overlap, each cut out of the page by a 2px ring. */
function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-page rtl:space-x-reverse",
        className,
      )}
      {...props}
    />
  );
}

/** The +N at the end of a group. */
function AvatarGroupCount({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center rounded-full bg-page type-label-sm data text-text-1 shadow-[inset_0_0_0_1px_var(--line-control),0_0_0_var(--ring-cutout)_var(--surface-page)] group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3",
        "group-has-data-[size=2xs]/avatar-group:size-4 group-has-data-[size=xs]/avatar-group:size-5 group-has-data-[size=2xs]/avatar-group:[&>svg]:hidden group-has-data-[size=xs]/avatar-group:[&>svg]:hidden",
        "forced-colors:outline forced-colors:outline-1",
        className,
      )}
      {...props}
    />
  );
}

export {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
  type AvatarSize,
  type AvatarType,
};
