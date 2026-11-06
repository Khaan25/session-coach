"use client";
import { Suspense, type ComponentProps } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { parseProjectScope, projectHref } from "@/lib/projects/scope";

type Props = Omit<ComponentProps<typeof Link>, "href"> & { href: string };
function ScopedLink({ href, ...props }: Props) {
  const search = useSearchParams();
  return (
    <Link
      href={projectHref(
        href,
        parseProjectScope(
          search.get("project") ?? (search.get("repo") ? "repo:" + search.get("repo") : null),
        ),
      )}
      {...props}
    />
  );
}
/** The local Suspense boundary preserves a static sidebar shell and request-specific project links. */
export function ProjectLink(props: Props) {
  return (
    <Suspense fallback={<Link {...props} />}>
      <ScopedLink {...props} />
    </Suspense>
  );
}
