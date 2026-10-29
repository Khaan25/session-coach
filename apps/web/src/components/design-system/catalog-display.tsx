"use client";

import { DotsThreeIcon, FileTsIcon, MagnifyingGlassIcon, RobotIcon } from "@phosphor-icons/react";

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge, CodeTag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DataList,
  DataListEmpty,
  DataListItem,
  DataListLabel,
  DataListValue,
} from "@/components/ui/data-list";
import {
  Empty,
  EmptyCode,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyQuery,
  EmptyStatus,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemHeader,
  ItemLink,
  ItemMedia,
  ItemMeta,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkline } from "@/components/ui/sparkline";
import {
  Stat,
  StatDelta,
  StatDescription,
  StatGroup,
  StatLabel,
  StatRow,
  StatTrend,
  StatUnit,
  StatValue,
} from "@/components/ui/stat";
import { InkSlot, Status, StatusArc, statuses } from "@/components/ui/status";
import { kinds } from "@/lib/quartz/kind";

import { GallerySection, Specimen } from "./gallery-section";
import { cards, session } from "./sample";

const BADGE_VARIANTS = [
  "default",
  "secondary",
  "outline",
  "ghost",
  "warn",
  "destructive",
  "success",
  "warning",
  "link",
] as const;
const AVATAR_SIZES = ["2xs", "xs", "sm", "default", "lg"] as const;
const AVATAR_TYPES = ["person", "agent", "source"] as const;
// Sample numbers for the trend specimens; there is no real series yet. TODO(zia): real explain-back scores.
const TREND = [52, 58, 55, 61, 66, 64, 72];

function BadgesAndStatus() {
  return (
    <>
      <Specimen label="Badge variants and sizes">
        {BADGE_VARIANTS.map((variant) => (
          <Badge key={variant} variant={variant}>
            {variant}
          </Badge>
        ))}
        {BADGE_VARIANTS.map((variant) => (
          <Badge key={variant} variant={variant} size="sm">
            {variant}
          </Badge>
        ))}
      </Specimen>
      <Specimen label="Badge kinds, statuses and counts">
        {kinds.map((kind) => (
          <Badge key={kind} kind={kind} />
        ))}
        <Badge kind="agent" label={session.agent} />
        <Badge status="warn" />
        <Badge status="fail" label="Unverified quote" />
        <Badge count={cards.length} />
        <Badge count={1200} max={999} variant="outline" />
        <Badge render={<a href="#display" />} variant="outline">
          Linked badge
        </Badge>
      </Specimen>
      <Specimen label="Code tag">
        {(["soft", "solid", "outline"] as const).map((fill) => (
          <CodeTag key={fill} fill={fill}>
            E{cards[0].evidence[0].event_index}
          </CodeTag>
        ))}
        <CodeTag code={200} />
        <CodeTag code={404} />
        <CodeTag code={503} fill="solid" />
        <CodeTag status="warn">stale</CodeTag>
      </Specimen>
      <Specimen label="Status, status arc and ink slot">
        {statuses.map((status) => (
          <Status key={status} status={status} />
        ))}
        <Status status="ok" label="Scored" live />
        <Status status="running">Writing cards</Status>
        <StatusArc name="Writing cards" />
        <InkSlot>Your review</InkSlot>
        <InkSlot size="sm">3 due</InkSlot>
      </Specimen>
    </>
  );
}

function People() {
  return (
    <Specimen label="Avatar sizes, types, image, badge and group">
      {AVATAR_TYPES.map((type) =>
        AVATAR_SIZES.map((size) => (
          <Avatar key={`${type}-${size}`} type={type} size={size}>
            <AvatarFallback>
              {type === "agent" ? <RobotIcon /> : type === "source" ? "R" : "ZR"}
            </AvatarFallback>
          </Avatar>
        )),
      )}
      <Avatar>
        <AvatarImage src="/favicon.ico" alt="Session Coach" />
        <AvatarFallback>SC</AvatarFallback>
      </Avatar>
      <Avatar size="lg">
        <AvatarImage src="/missing-avatar.png" alt="Broken image falls back" />
        <AvatarFallback>KS</AvatarFallback>
        <AvatarBadge />
      </Avatar>
      <AvatarGroup>
        <Avatar>
          <AvatarFallback>ZR</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>KS</AvatarFallback>
        </Avatar>
        <Avatar type="agent">
          <AvatarFallback>
            <RobotIcon />
          </AvatarFallback>
        </Avatar>
        <AvatarGroupCount>+2</AvatarGroupCount>
      </AvatarGroup>
    </Specimen>
  );
}

function Numbers() {
  return (
    <>
      <Specimen label="Stat sizes, variants, states and group">
        <div className="grid w-full gap-4 *:min-w-0 lg:grid-cols-3">
          {(["default", "lg", "xl"] as const).map((size) => (
            <Stat key={size} size={size} variant="framed" kind="run">
              <StatLabel>Cards this week ({size})</StatLabel>
              <StatRow>
                <StatValue>
                  12<StatUnit>cards</StatUnit>
                </StatValue>
                <StatTrend data={TREND} label="Cards per day" />
              </StatRow>
              <StatDelta from={9} to={12} period="last week" />
            </Stat>
          ))}
          <Stat variant="plain">
            <StatLabel>Plain</StatLabel>
            <StatValue>{session.duration_min} min</StatValue>
            <StatDescription>Length of the sample session.</StatDescription>
          </Stat>
          <Stat variant="framed" loading>
            <StatLabel>Loading</StatLabel>
            <StatValue />
          </Stat>
          <Stat variant="framed" status="warn">
            <StatLabel>Flagged cards</StatLabel>
            <StatValue>{cards.filter((c) => c.flagged).length}</StatValue>
            <StatDescription>A quote did not pass the evidence check.</StatDescription>
          </Stat>
          <Stat variant="framed" status="fail">
            <StatLabel>Missed reviews</StatLabel>
            <StatValue>2</StatValue>
            <StatDelta trend="down">2 overdue</StatDelta>
            <StatDescription>TODO(zia): what a missed review means.</StatDescription>
          </Stat>
        </div>
        <StatGroup kind="agent" className="w-full">
          <Stat>
            <StatLabel>Events</StatLabel>
            <StatValue>{session.event_count}</StatValue>
          </Stat>
          <Stat>
            <StatLabel>Duration</StatLabel>
            <StatValue>
              {session.duration_min}
              <StatUnit>min</StatUnit>
            </StatValue>
          </Stat>
          <Stat>
            <StatLabel>Cards</StatLabel>
            <StatValue>{cards.length}</StatValue>
          </Stat>
        </StatGroup>
        <StatGroup variant="plain" className="w-full">
          <Stat>
            <StatLabel>Plain group</StatLabel>
            <StatValue>3</StatValue>
          </Stat>
          <Stat>
            <StatLabel>Second cell</StatLabel>
            <StatValue>7</StatValue>
          </Stat>
        </StatGroup>
      </Specimen>
      <Specimen label="Sparkline">
        {(["sm", "default", "lg"] as const).map((size) => (
          <Sparkline
            key={size}
            size={size}
            data={TREND}
            label={`Scores (${size})`}
            className="w-24"
          />
        ))}
        {kinds.map((kind) => (
          <Sparkline
            key={kind}
            kind={kind}
            data={TREND}
            label={`${kind} trend`}
            area
            className="w-24"
          />
        ))}
        <Sparkline
          variant="bar"
          data={[3, 5, 4, null, 5]}
          label="Cards per session"
          className="w-24"
        />
      </Specimen>
      <Specimen label="Progress">
        <div className="grid w-full gap-6 *:min-w-0 sm:grid-cols-2">
          <Progress value={33}>
            <ProgressLabel>Day 1 of 3 reviews</ProgressLabel>
            <ProgressValue />
          </Progress>
          <Progress value={100}>
            <ProgressLabel>Reviews done</ProgressLabel>
            <ProgressValue />
          </Progress>
          <Progress value={66} data-status="warn">
            <ProgressLabel>Warn</ProgressLabel>
            <ProgressValue />
          </Progress>
          <Progress value={20} data-status="fail">
            <ProgressLabel>Fail</ProgressLabel>
            <ProgressValue />
          </Progress>
          <Progress value={50} data-kind="agent">
            <ProgressLabel>Agent kind</ProgressLabel>
          </Progress>
          <Progress value={null}>
            <ProgressLabel>Indeterminate</ProgressLabel>
          </Progress>
        </div>
      </Specimen>
    </>
  );
}

function Surfaces() {
  return (
    <>
      <Specimen label="Card sizes">
        <div className="grid w-full gap-4 *:min-w-0 lg:grid-cols-3">
          {(["sm", "default", "lg"] as const).map((size) => (
            <Card key={size} size={size}>
              <CardHeader>
                <CardTitle>{session.title}</CardTitle>
                <CardDescription>Card size {size}</CardDescription>
                <CardAction>
                  <Button variant="ghost" size="icon-sm" aria-label="More">
                    <DotsThreeIcon />
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent>{cards[0].decision}</CardContent>
              <CardFooter>
                <Button size="sm">Explain back</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </Specimen>

      <Specimen label="Item variants, sizes and parts">
        <div className="grid w-full gap-4 *:min-w-0 lg:grid-cols-2">
          {(["default", "outline", "muted"] as const).map((variant) => (
            <ItemGroup key={variant}>
              {(["default", "sm", "xs"] as const).map((size, index) => (
                <div key={size} className="contents">
                  {index > 0 && <ItemSeparator />}
                  <Item variant={variant} size={size} selected={index === 0} kind="run">
                    <ItemMedia variant="icon">
                      <FileTsIcon />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>
                        {variant} {size}
                      </ItemTitle>
                      {size === "default" && <ItemDescription>{cards[index].why}</ItemDescription>}
                    </ItemContent>
                    <ItemMeta>{cards[index].source}</ItemMeta>
                  </Item>
                </div>
              ))}
            </ItemGroup>
          ))}
          <Item variant="outline">
            <ItemHeader>Card 1 of {cards.length}</ItemHeader>
            <ItemMedia variant="image">
              <Avatar type="agent" size="lg">
                <AvatarFallback>
                  <RobotIcon />
                </AvatarFallback>
              </Avatar>
            </ItemMedia>
            <ItemContent>
              <ItemTitle>
                <ItemLink href="#display">{cards[0].decision}</ItemLink>
              </ItemTitle>
              <ItemDescription>{cards[0].question}</ItemDescription>
            </ItemContent>
            <ItemActions>
              <Button variant="secondary" size="sm">
                Explain back
              </Button>
            </ItemActions>
            <ItemFooter>
              <Badge variant="outline">{cards[0].files[0]}</Badge>
            </ItemFooter>
          </Item>
          <Item>
            <ItemMedia>
              <Avatar size="sm">
                <AvatarFallback>ZR</AvatarFallback>
              </Avatar>
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Default media</ItemTitle>
            </ItemContent>
          </Item>
        </div>
      </Specimen>

      <Specimen label="Data list">
        <div className="grid w-full gap-4 *:min-w-0 lg:grid-cols-2">
          {(["plain", "framed"] as const).map((variant) =>
            (["horizontal", "vertical"] as const).map((orientation) => (
              <DataList
                key={`${variant}-${orientation}`}
                variant={variant}
                orientation={orientation}
                size={orientation === "vertical" ? "sm" : "default"}
              >
                <DataListItem>
                  <DataListLabel>Session</DataListLabel>
                  <DataListValue>{session.title}</DataListValue>
                </DataListItem>
                <DataListItem>
                  <DataListLabel>ID</DataListLabel>
                  <DataListValue mono>{session.external_id}</DataListValue>
                </DataListItem>
                <DataListItem>
                  <DataListLabel>Events</DataListLabel>
                  <DataListValue numeric>{session.event_count}</DataListValue>
                </DataListItem>
                <DataListItem>
                  <DataListLabel>Error</DataListLabel>
                  <DataListValue>{session.error}</DataListValue>
                </DataListItem>
                <DataListItem>
                  <DataListLabel>Notes</DataListLabel>
                  <DataListValue>
                    <DataListEmpty>Not written yet</DataListEmpty>
                  </DataListValue>
                </DataListItem>
              </DataList>
            )),
          )}
        </div>
      </Specimen>

      <Specimen label="Empty: reasons, variants and sizes">
        <div className="grid w-full gap-4 *:min-w-0 lg:grid-cols-2">
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No sessions yet</EmptyTitle>
              <EmptyDescription>
                When a coding session ends, its decision cards land here.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button size="sm">TODO(zia): first-run action</Button>
            </EmptyContent>
          </Empty>
          <Empty reason="no-results" size="sm">
            <EmptyHeader>
              <EmptyMedia>
                <MagnifyingGlassIcon weight="duotone" />
              </EmptyMedia>
              <EmptyTitle>
                No decisions match <EmptyQuery>timeout</EmptyQuery>
              </EmptyTitle>
            </EmptyHeader>
          </Empty>
          <Empty reason="no-access" variant="plain">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <RobotIcon weight="duotone" />
              </EmptyMedia>
              <EmptyTitle>This session belongs to another learner</EmptyTitle>
              <EmptyDescription>Learners can only read their own sessions.</EmptyDescription>
            </EmptyHeader>
          </Empty>
          <Empty reason="error">
            <EmptyHeader>
              <EmptyStatus>Failed</EmptyStatus>
              <EmptyTitle>Cards could not be written</EmptyTitle>
              <EmptyDescription>
                Request <EmptyCode>{session.id}</EmptyCode>
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="secondary" size="sm">
                Retry {session.title}
              </Button>
            </EmptyContent>
          </Empty>
          <Empty reason="error" status="warn" size="sm">
            <EmptyHeader>
              <EmptyStatus>Partly written</EmptyStatus>
              <EmptyTitle>One card was hidden by the evidence check</EmptyTitle>
            </EmptyHeader>
          </Empty>
        </div>
      </Specimen>

      <Specimen label="Skeleton, separator and scroll area">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="flex h-8 items-center gap-3">
          <span className="type-body-sm text-text-2">Stated</span>
          <Separator orientation="vertical" />
          <span className="type-body-sm text-text-2">Inferred</span>
        </div>
        <Separator />
        <ScrollArea className="h-32 w-64">
          <ol className="flex flex-col gap-2 p-2 type-body-sm text-text-1">
            {Array.from({ length: 12 }, (_, i) => (
              <li key={i}>Event E{i + 1}</li>
            ))}
          </ol>
        </ScrollArea>
        <ScrollArea className="w-64">
          <div className="flex w-max gap-2 p-2">
            {cards.map((card) => (
              <Badge key={card.id} variant="outline">
                {card.decision}
              </Badge>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </Specimen>
    </>
  );
}

function DisplayCatalog() {
  return (
    <GallerySection
      id="display"
      title="Display"
      description="Badge, code tag, status, avatar, stat, sparkline, progress, card, item, data list, empty, skeleton, separator and scroll area."
    >
      <BadgesAndStatus />
      <People />
      <Numbers />
      <Surfaces />
    </GallerySection>
  );
}

export { DisplayCatalog };
