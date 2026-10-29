import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderRow,
  PageHeaderTitle,
} from "@/components/ui/page-header";

/**
 * The one h1 of an app page, a line of description and the page's actions (one primary, the rest secondary or ghost).
 * `children` goes under the row, for PageHeaderStats.
 */
export function AppPageHeader({
  title,
  description,
  actions,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <PageHeader>
      <PageHeaderRow>
        <PageHeaderContent>
          <PageHeaderTitle>{title}</PageHeaderTitle>
          {description && <PageHeaderDescription>{description}</PageHeaderDescription>}
        </PageHeaderContent>
        {actions && <PageHeaderActions>{actions}</PageHeaderActions>}
      </PageHeaderRow>
      {children}
    </PageHeader>
  );
}
