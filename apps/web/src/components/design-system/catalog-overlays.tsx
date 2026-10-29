"use client";

import { DotsThreeIcon, InfoIcon, TrashIcon, WarningIcon } from "@phosphor-icons/react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleRow,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsCount, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { GallerySection, Specimen } from "./gallery-section";
import { cards, REVIEW_DAYS, session } from "./sample";

const SIDES = ["top", "right", "bottom", "left"] as const;
const SWIPES = ["down", "up", "left", "right"] as const;

function Dialogs() {
  return (
    <>
      <Specimen label="Dialog sizes (scale in)">
        {(["sm", "default", "lg"] as const).map((size) => (
          <Dialog key={size}>
            <DialogTrigger render={<Button variant="secondary" />}>Dialog {size}</DialogTrigger>
            <DialogContent size={size}>
              <DialogHeader>
                <DialogTitle>{cards[0].question}</DialogTitle>
                <DialogDescription>From {session.title}.</DialogDescription>
              </DialogHeader>
              <DialogBody>
                <p className="type-body text-text-1">{cards[0].decision}</p>
              </DialogBody>
              <DialogFooter showCloseButton>
                <Button>Explain back</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ))}
        <Dialog>
          <DialogTrigger render={<Button variant="secondary" />}>No close button</DialogTrigger>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Card written</DialogTitle>
              <DialogDescription>Close with the button or Escape.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button />}>Done</DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Specimen>

      <Specimen label="Alert dialog sizes">
        {(["default", "sm"] as const).map((size) => (
          <AlertDialog key={size}>
            <AlertDialogTrigger render={<Button variant="destructive" />}>
              <TrashIcon data-icon="inline-start" />
              Delete session ({size})
            </AlertDialogTrigger>
            <AlertDialogContent size={size}>
              <AlertDialogHeader>
                <AlertDialogMedia>
                  <WarningIcon />
                </AlertDialogMedia>
                <AlertDialogTitle>Delete {session.title}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Its {cards.length} decision cards and their review schedule go with it. This
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep session</AlertDialogCancel>
                <AlertDialogAction variant="destructive">Delete session</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ))}
      </Specimen>

      <Specimen label="Sheet sides (slide in)">
        {SIDES.map((side) => (
          <Sheet key={side}>
            <SheetTrigger render={<Button variant="secondary" />}>Sheet {side}</SheetTrigger>
            <SheetContent side={side} showCloseButton={side !== "bottom"}>
              <SheetHeader>
                <SheetTitle>{session.title}</SheetTitle>
                <SheetDescription>
                  {session.repo} on {session.branch}
                </SheetDescription>
              </SheetHeader>
              <SheetBody>
                {cards.map((card) => (
                  <p key={card.id} className="type-body text-text-1">
                    {card.decision}
                  </p>
                ))}
              </SheetBody>
              <SheetFooter>
                <SheetClose render={<Button variant="secondary" />}>Close</SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        ))}
      </Specimen>

      <Specimen label="Drawer swipe directions, handle, snap points and nesting (follows the finger)">
        {SWIPES.map((direction) => (
          <Drawer key={direction} swipeDirection={direction} showSwipeHandle>
            <DrawerTrigger render={<Button variant="secondary" />}>
              Drawer {direction}
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>{cards[1].question}</DrawerTitle>
                <DrawerDescription>Swipe {direction} to close.</DrawerDescription>
              </DrawerHeader>
              <DrawerFooter>
                <DrawerClose render={<Button variant="secondary" />}>Close</DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        ))}
        <Drawer snapPoints={[0.5, 1]} showSwipeHandle>
          <DrawerTrigger render={<Button variant="secondary" />}>Snap points</DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Half, then full</DrawerTitle>
              <DrawerDescription>Drag up to the second snap point.</DrawerDescription>
            </DrawerHeader>
            <DrawerFooter>
              <Drawer showSwipeHandle>
                <DrawerTrigger render={<Button />}>Open a nested drawer</DrawerTrigger>
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle>Nested drawer</DrawerTitle>
                    <DrawerDescription>The one behind steps back.</DrawerDescription>
                  </DrawerHeader>
                  <DrawerFooter>
                    <DrawerClose render={<Button variant="secondary" />}>Back</DrawerClose>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
        <Drawer modal={false}>
          <DrawerTrigger render={<Button variant="ghost" />}>Non-modal drawer</DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>The page stays usable</DrawerTitle>
            </DrawerHeader>
            <DrawerFooter>
              <DrawerClose render={<Button variant="secondary" />}>Close</DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </Specimen>
    </>
  );
}

function Anchored() {
  return (
    <Specimen label="Popover, tooltip and dropdown menu (grow from the trigger)">
      {SIDES.map((side) => (
        <Popover key={side}>
          <PopoverTrigger render={<Button variant="secondary" />}>Popover {side}</PopoverTrigger>
          <PopoverContent side={side}>
            <PopoverHeader>
              <PopoverTitle>Why is this card flagged?</PopoverTitle>
              <PopoverDescription>
                One of its evidence quotes did not match the transcript.
              </PopoverDescription>
            </PopoverHeader>
            <PopoverClose render={<Button size="sm" variant="secondary" />}>Got it</PopoverClose>
          </PopoverContent>
        </Popover>
      ))}
      {SIDES.map((side) => (
        <Tooltip key={side}>
          <TooltipTrigger
            render={<Button variant="ghost" size="icon" aria-label={`Info (${side})`} />}
          >
            <InfoIcon />
          </TooltipTrigger>
          <TooltipContent side={side}>
            Search cards <Kbd>/</Kbd>
          </TooltipContent>
        </Tooltip>
      ))}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="secondary" size="icon" aria-label="Card actions" />}
        >
          <DotsThreeIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Card</DropdownMenuLabel>
            <DropdownMenuItem>
              Explain back
              <DropdownMenuShortcut>E</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem inset>Skip for now</DropdownMenuItem>
            <DropdownMenuItem disabled>Reopen</DropdownMenuItem>
            <DropdownMenuLinkItem href="#overlays">Open session</DropdownMenuLinkItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem defaultChecked>Show flagged cards</DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem>Show evidence</DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel inset>Review on</DropdownMenuLabel>
          <DropdownMenuRadioGroup defaultValue="1">
            {REVIEW_DAYS.map((day) => (
              <DropdownMenuRadioItem key={day} value={String(day)}>
                Day {day}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Move to</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>{session.repo}</DropdownMenuItem>
              <DropdownMenuItem>TODO(zia)</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem variant="destructive">Delete card</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Specimen>
  );
}

function Disclosure() {
  return (
    <>
      <Specimen label="Collapsible (height slides)">
        <div className="flex w-full flex-col gap-2">
          {(["sm", "default", "row"] as const).map((size) => (
            <Collapsible key={size}>
              <CollapsibleRow size={size} summary={`${cards.length} cards`}>
                Cards ({size})
              </CollapsibleRow>
              <CollapsibleContent>
                <ul className="flex flex-col gap-1 px-2 py-2 type-body-sm text-text-2">
                  {cards.map((card) => (
                    <li key={card.id}>{card.decision}</li>
                  ))}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          ))}
          <Collapsible>
            <CollapsibleRow summary="1 of 3 flagged" summaryStatus="warn">
              Evidence
            </CollapsibleRow>
            <CollapsibleContent>
              <p className="px-2 py-2 type-body-sm text-text-2">{cards[2].evidence[1].quote}</p>
            </CollapsibleContent>
          </Collapsible>
          <Collapsible>
            <CollapsibleRow summary="1 hidden" summaryStatus="fail" caret={false}>
              Hidden cards
            </CollapsibleRow>
            <CollapsibleContent>
              <p className="px-2 py-2 type-body-sm text-text-2">
                No verified quote, so the learner never sees it.
              </p>
            </CollapsibleContent>
          </Collapsible>
          <Collapsible disabled>
            <CollapsibleRow>Disabled</CollapsibleRow>
          </Collapsible>
          <Collapsible>
            <CollapsibleTrigger render={<Button variant="link" />}>
              Unstyled trigger
            </CollapsibleTrigger>
            <CollapsibleContent>
              <p className="py-2 type-body-sm text-text-2">{cards[0].why}</p>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </Specimen>

      <Specimen label="Tabs: default and line, sizes, vertical (the indicator slides)">
        <div className="grid w-full gap-6 *:min-w-0 lg:grid-cols-2">
          {(["default", "line"] as const).map((variant) =>
            (["default", "sm"] as const).map((size) => (
              <Tabs key={`${variant}-${size}`} defaultValue="cards">
                <TabsList variant={variant} size={size}>
                  <TabsTrigger value="cards">
                    Cards <TabsCount>{cards.length}</TabsCount>
                  </TabsTrigger>
                  <TabsTrigger value="evidence">Evidence</TabsTrigger>
                  <TabsTrigger value="schedule">Schedule</TabsTrigger>
                  <TabsTrigger value="locked" disabled>
                    Locked
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="cards" className="mt-3">
                  {cards[0].decision}
                </TabsContent>
                <TabsContent value="evidence" className="mt-3">
                  {cards[0].evidence[0].quote}
                </TabsContent>
                <TabsContent value="schedule" className="mt-3">
                  Explain back on day 1, 3 and 7.
                </TabsContent>
              </Tabs>
            )),
          )}
          <Tabs defaultValue="1" orientation="vertical">
            <TabsList variant="line">
              {REVIEW_DAYS.map((day) => (
                <TabsTrigger key={day} value={String(day)}>
                  Day {day}
                </TabsTrigger>
              ))}
            </TabsList>
            {REVIEW_DAYS.map((day) => (
              <TabsContent key={day} value={String(day)} className="ms-4">
                Review on day {day}: {cards[day % cards.length].question}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </Specimen>
    </>
  );
}

function OverlaysCatalog() {
  return (
    <GallerySection
      id="overlays"
      title="Overlays and motion"
      description="Dialog, alert dialog, sheet, drawer, popover, tooltip, dropdown menu, collapsible and tabs. Open each to see its motion."
    >
      <Dialogs />
      <Anchored />
      <Disclosure />
    </GallerySection>
  );
}

export { OverlaysCatalog };
