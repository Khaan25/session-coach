"use client";

import { Suspense } from "react";
import {
  BookOpenIcon,
  CardsIcon,
  DotsThreeIcon,
  GearIcon,
  PlusIcon,
  TerminalWindowIcon,
} from "@phosphor-icons/react";

import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbId,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { DirectionProvider } from "@/components/ui/direction";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

import { GallerySection, Specimen } from "./gallery-section";
import { cards, session } from "./sample";

function SidebarDemo() {
  return (
    <SidebarProvider className="min-h-0">
      <div className="frame flex h-96 w-full overflow-hidden">
        <Sidebar collapsible="none">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg">
                  <TerminalWindowIcon />
                  <span>Session Coach</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <SidebarInput aria-label="Search sessions" placeholder="Search sessions" />
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Learn</SidebarGroupLabel>
              <SidebarGroupAction aria-label="New session">
                <PlusIcon />
              </SidebarGroupAction>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton isActive tooltip="Sessions">
                      <BookOpenIcon />
                      <span>Sessions</span>
                    </SidebarMenuButton>
                    <SidebarMenuBadge>1</SidebarMenuBadge>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton href="#navigation" isActive>
                          {session.title}
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton href="#navigation" size="sm">
                          TODO(zia)
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton variant="outline">
                      <CardsIcon />
                      <span>Cards due</span>
                    </SidebarMenuButton>
                    <SidebarMenuAction showOnHover aria-label="Card options">
                      <DotsThreeIcon />
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton size="sm">
                      <GearIcon />
                      <span>Settings</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    {/* SidebarMenuSkeleton picks its width with Math.random(), which cacheComponents only allows behind Suspense. */}
                    <Suspense fallback={null}>
                      <SidebarMenuSkeleton showIcon />
                    </Suspense>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarSeparator />
          </SidebarContent>
          <SidebarFooter>
            <SidebarTrigger />
          </SidebarFooter>
        </Sidebar>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <p className="type-body text-text-2">The page beside the sidebar.</p>
        </div>
      </div>
    </SidebarProvider>
  );
}

function NavigationCatalog() {
  return (
    <GallerySection
      id="navigation"
      title="Navigation and direction"
      description="Breadcrumb, sidebar and direction."
    >
      <Specimen label="Breadcrumb">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#navigation">Sessions</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbEllipsis />
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="#navigation">
                <BreadcrumbId>{`session_${session.external_id.replaceAll("-", "")}`}</BreadcrumbId>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Card {cards[0].position + 1}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </Specimen>

      <Specimen label="Sidebar (collapsible none, inside a frame)">
        <SidebarDemo />
      </Specimen>

      <Specimen label="Right to left">
        <DirectionProvider direction="rtl">
          <div dir="rtl" className="flex w-full flex-wrap items-center gap-4">
            <Slider aria-label="RTL slider" defaultValue={[30]} className="w-48" />
            <Switch aria-label="RTL switch" defaultChecked />
            <SegmentedControl defaultValue="a" aria-label="RTL segments">
              <SegmentedControlItem value="a">First</SegmentedControlItem>
              <SegmentedControlItem value="b">Second</SegmentedControlItem>
            </SegmentedControl>
            <Button variant="outline">Button</Button>
          </div>
        </DirectionProvider>
      </Specimen>
    </GallerySection>
  );
}

export { NavigationCatalog };
