import Link from "next/link";
import { TerminalWindowIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  PageHeader,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderRow,
  PageHeaderTitle,
} from "@/components/ui/page-header";

export default function DashboardPage() {
  return (
    <div className="mx-auto flex w-full max-w-(--container) flex-col gap-6 px-(--gutter-sm) py-6 sm:px-(--gutter)">
      <PageHeader>
        <PageHeaderRow>
          <PageHeaderContent>
            <PageHeaderTitle>Dashboard</PageHeaderTitle>
            <PageHeaderDescription>
              Explain back the decisions your coding agent made.
            </PageHeaderDescription>
          </PageHeaderContent>
        </PageHeaderRow>
      </PageHeader>
      <Empty>
        <EmptyHeader>
          <EmptyMedia>
            <TerminalWindowIcon weight="duotone" />
          </EmptyMedia>
          <EmptyTitle>No sessions yet</EmptyTitle>
          <EmptyDescription>
            Your sessions appear here once the CLI is set up. Each session becomes 3 to 5 decision
            cards, and you explain them back on day 1, 3 and 7.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button nativeButton={false} render={<Link href="/setup" />}>
            Set up the CLI
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
