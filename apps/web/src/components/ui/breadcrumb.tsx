import * as React from "react";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { DotsThreeIcon } from "@phosphor-icons/react/ssr";
import { cn } from "cn";

// Quartz's breadcrumb, kept server-safe (no hooks, the SSR icon entry). Ancestors are text-2 links that go to ink
// on hover; the current page is ink and not a link; the separator is a text-3 slash. IDs (run_8f2a…) take
// BreadcrumbId, which sets them in mono and cuts the middle while keeping the type prefix.

function Breadcrumb({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      aria-label="Breadcrumb"
      data-slot="breadcrumb"
      className={cn("min-w-0", className)}
      {...props}
    />
  );
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 type-label wrap-break-word text-text-2",
        className,
      )}
      {...props}
    />
  );
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn("inline-flex min-w-0 items-center gap-1.5", className)}
      {...props}
    />
  );
}

function BreadcrumbLink({ className, render, ...props }: useRender.ComponentProps<"a">) {
  return useRender({
    defaultTagName: "a",
    props: mergeProps<"a">(
      {
        className: cn(
          "inline-flex min-h-6 min-w-0 items-center gap-1.5 rounded-inner text-text-2 decoration-1 underline-offset-4 transition-colors",
          "hover:text-text-1 hover:underline",
          "[&_svg]:shrink-0",
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: "breadcrumb-link",
    },
  });
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-page"
      aria-current="page"
      className={cn(
        "inline-flex min-w-0 items-center gap-1.5 text-text-1 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}

function BreadcrumbSeparator({ children, className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn("text-text-3 select-none [&>svg]:size-4", className)}
      {...props}
    >
      {children ?? "/"}
    </li>
  );
}

/** The folded crumbs, as a static marker. */
function BreadcrumbEllipsis({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      className={cn("flex size-6 items-center justify-center rounded-soft text-text-2", className)}
      {...props}
    >
      <DotsThreeIcon className="size-4" />
      <span className="sr-only">More</span>
    </span>
  );
}

/** Cuts an ID in the middle and keeps its type prefix: run_8f2a91c0d4e5b6a7 reads run_8f2a…e5b6a7. */
function shortId(id: string) {
  if (id.length <= 18) return null;
  const prefix = id.indexOf("_");
  const headLength = prefix > 0 && prefix < 10 ? prefix + 5 : 10;
  return { head: id.slice(0, headLength), tail: id.slice(-6) };
}

/** An identifier inside a link or page: mono, with the middle cut when it runs past 18 characters. */
function BreadcrumbId({
  children,
  className,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & { children: string }) {
  const cut = shortId(children);
  return (
    <span
      data-slot="breadcrumb-id"
      title={cut ? children : undefined}
      className={cn("type-tag [overflow-wrap:anywhere]", className)}
      {...props}
    >
      {cut ? (
        <>
          <span aria-hidden>
            {cut.head}…{cut.tail}
          </span>
          <span className="sr-only">{children}</span>
        </>
      ) : (
        children
      )}
    </span>
  );
}

export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbId,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
};
