"use client";

import {
  ArrowRightIcon,
  CaretDownIcon,
  PlusIcon,
  TextBolderIcon,
  TextItalicIcon,
  TextUnderlineIcon,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from "@/components/ui/button-group";
import { CopyButton } from "@/components/ui/copy-button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Spinner } from "@/components/ui/spinner";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { GallerySection, Specimen } from "./gallery-section";
import { session } from "./sample";

const VARIANTS = ["default", "secondary", "ghost", "destructive", "link"] as const;
const SIZES = ["xs", "sm", "default", "lg"] as const;
const ICON_SIZES = ["icon-xs", "icon-sm", "icon", "icon-lg"] as const;
const TOGGLE_SIZES = ["sm", "default", "lg"] as const;

// A value fetched on demand, so the copy button shows its pending state for a moment.
const fetchSessionId = () =>
  new Promise<string>((resolve) => setTimeout(() => resolve(session.id), 1200));

function ActionsCatalog() {
  return (
    <GallerySection
      id="actions"
      title="Actions"
      description="Button, button group, toggle, toggle group, copy button, kbd and spinner."
    >
      {VARIANTS.map((variant) => (
        <Specimen key={variant} label={`Button ${variant}`}>
          {SIZES.map((size) => (
            <Button key={size} variant={variant} size={size}>
              Explain back
            </Button>
          ))}
          <Button variant={variant} disabled>
            Disabled
          </Button>
          <Button variant={variant} aria-invalid>
            Invalid
          </Button>
        </Specimen>
      ))}
      <Specimen label="Button icon sizes">
        {ICON_SIZES.map((size) => (
          <Button key={size} variant="secondary" size={size} aria-label="Add card">
            <PlusIcon />
          </Button>
        ))}
      </Specimen>
      <Specimen label="Button with icons, loading and static">
        <Button>
          <PlusIcon data-icon="inline-start" />
          New session
        </Button>
        <Button variant="secondary">
          Next card
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
        <Button disabled>
          <Spinner data-icon="inline-start" />
          Scoring answer
        </Button>
        <Button variant="secondary" data-static>
          No press scale
        </Button>
      </Specimen>

      <Specimen label="Button group">
        <ButtonGroup>
          <Button variant="secondary">Day 1</Button>
          <Button variant="secondary">Day 3</Button>
          <Button variant="secondary">Day 7</Button>
        </ButtonGroup>
        <ButtonGroup>
          <Button>Explain back</Button>
          <Button size="icon" aria-label="More review options">
            <CaretDownIcon />
          </Button>
        </ButtonGroup>
        <ButtonGroup>
          <ButtonGroupText>Repo</ButtonGroupText>
          <Button variant="secondary">{session.repo}</Button>
          <ButtonGroupSeparator />
          <Button variant="ghost">{session.branch}</Button>
        </ButtonGroup>
        <ButtonGroup orientation="vertical">
          <Button variant="secondary">Stated</Button>
          <Button variant="secondary">Inferred</Button>
        </ButtonGroup>
        <ButtonGroup>
          <ButtonGroup>
            <Button variant="secondary">Previous</Button>
            <Button variant="secondary">Next</Button>
          </ButtonGroup>
          <ButtonGroup>
            <Button variant="secondary" disabled>
              Skip
            </Button>
          </ButtonGroup>
        </ButtonGroup>
      </Specimen>

      {(["default", "outline"] as const).map((variant) => (
        <Specimen key={variant} label={`Toggle ${variant}`}>
          {TOGGLE_SIZES.map((size) => (
            <Toggle key={size} variant={variant} size={size} aria-label="Bold">
              <TextBolderIcon />
            </Toggle>
          ))}
          <Toggle variant={variant} defaultPressed>
            Pressed
          </Toggle>
          <Toggle variant={variant} disabled>
            Disabled
          </Toggle>
          <Toggle variant={variant} disabled defaultPressed>
            Disabled pressed
          </Toggle>
          <Toggle variant={variant} aria-invalid>
            Invalid
          </Toggle>
        </Specimen>
      ))}

      <Specimen label="Toggle group">
        <ToggleGroup multiple defaultValue={["bold"]} aria-label="Text style">
          <ToggleGroupItem value="bold" aria-label="Bold">
            <TextBolderIcon />
          </ToggleGroupItem>
          <ToggleGroupItem value="italic" aria-label="Italic">
            <TextItalicIcon />
          </ToggleGroupItem>
          <ToggleGroupItem value="underline" aria-label="Underline">
            <TextUnderlineIcon />
          </ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup variant="outline" spacing={0} defaultValue={["3"]} aria-label="Review day">
          <ToggleGroupItem value="1">Day 1</ToggleGroupItem>
          <ToggleGroupItem value="3">Day 3</ToggleGroupItem>
          <ToggleGroupItem value="7">Day 7</ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup
          variant="outline"
          size="sm"
          orientation="vertical"
          spacing={0}
          aria-label="Source"
        >
          <ToggleGroupItem value="stated">Stated</ToggleGroupItem>
          <ToggleGroupItem value="inferred">Inferred</ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup size="lg" disabled aria-label="Disabled group">
          <ToggleGroupItem value="a">Disabled</ToggleGroupItem>
          <ToggleGroupItem value="b">Group</ToggleGroupItem>
        </ToggleGroup>
      </Specimen>

      <Specimen label="Copy button">
        <CopyButton value={session.id} label="session ID" />
        <CopyButton value={session.id} label="session ID" showLabel />
        <CopyButton value={session.id} label="session ID" variant="secondary" showLabel />
        <CopyButton value={fetchSessionId} label="fetched session ID" showLabel />
        <CopyButton value={session.id} label="session ID" forceState="copied" showLabel />
        <CopyButton value={session.id} label="session ID" forceState="failed" showLabel />
        <CopyButton value={session.id} label="session ID" forceState="fetching" showLabel />
        <CopyButton value={session.id} label="session ID" disabled />
      </Specimen>

      <Specimen label="Kbd and spinner">
        <Kbd>Esc</Kbd>
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
        <Spinner className="size-3" />
        <Spinner />
      </Specimen>
    </GallerySection>
  );
}

export { ActionsCatalog };
