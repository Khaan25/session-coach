// The SSR entry: no React context, so this renders in server pages and client forms alike.
import { InfoIcon, WarningIcon } from "@phosphor-icons/react/ssr";

import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";

/**
 * The note under an auth form: what happened and what to do next. Render it inside the form's live region.
 *
 * @param fail - Draws the fail row for errors.
 */
export function AuthNotice({
  title,
  children,
  fail,
}: {
  title: string;
  children?: React.ReactNode;
  fail?: boolean;
}) {
  const Icon = fail ? WarningIcon : InfoIcon;
  return (
    <Item variant="outline" data-status={fail ? "fail" : undefined}>
      <ItemMedia variant="icon">
        <Icon weight="duotone" aria-hidden />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{title}</ItemTitle>
        {children && <ItemDescription>{children}</ItemDescription>}
      </ItemContent>
    </Item>
  );
}
