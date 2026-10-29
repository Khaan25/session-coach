"use client";

import { useState } from "react";
import { GitBranchIcon, MagnifyingGlassIcon, PaperPlaneRightIcon } from "@phosphor-icons/react";
import type { DateRange } from "react-day-picker";

import { Calendar } from "@/components/ui/calendar";
import { Checkbox, CheckboxGroup } from "@/components/ui/checkbox";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxClear,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Label, LabelHint } from "@/components/ui/label";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { GallerySection, Specimen } from "./gallery-section";
import { cards, REVIEW_DAYS, session } from "./sample";

const CONTROL_SIZES = ["sm", "default", "lg"] as const;
const CARD_FILES = [...new Set(cards.flatMap((card) => card.files))];
const SOURCES = [
  { value: "stated", label: "Stated" },
  { value: "inferred", label: "Inferred" },
];
const DECISIONS = cards.map((card) => card.decision);
const GROUPED = [
  { value: "Stated", items: cards.filter((c) => c.source === "stated").map((c) => c.decision) },
  { value: "Inferred", items: cards.filter((c) => c.source === "inferred").map((c) => c.decision) },
];
// A fixed "today", so the server render and the browser agree (cacheComponents rejects a live clock here).
const SESSION_DAY = new Date(2026, 9, 27);
const REVIEW_DATES = REVIEW_DAYS.map((day) => new Date(2026, 9, 27 + day));

function TextFields() {
  return (
    <>
      <Specimen label="Input and textarea">
        <div className="grid w-full gap-3 *:min-w-0 sm:grid-cols-2 lg:grid-cols-4">
          <Input aria-label="Default input" placeholder="Explain the decision" />
          <Input aria-label="Disabled input" placeholder="Disabled" disabled />
          <Input aria-label="Invalid input" defaultValue="too short" aria-invalid />
          <Input aria-label="Read-only input" defaultValue={session.title} readOnly />
          <Input aria-label="Transcript file" type="file" />
          <Textarea aria-label="Default textarea" placeholder="Why did the agent do this?" />
          <Textarea aria-label="Disabled textarea" placeholder="Disabled" disabled />
          <Textarea aria-label="Invalid textarea" defaultValue="Because." aria-invalid />
          <Textarea aria-label="Read-only textarea" defaultValue={cards[0].why} readOnly />
        </div>
      </Specimen>

      <Specimen label="Label">
        <Label htmlFor="label-demo">Your explanation</Label>
        <Label htmlFor="label-demo" optional>
          Notes
        </Label>
        <Label htmlFor="label-demo">
          Answer <LabelHint>280 characters</LabelHint>
        </Label>
        <Input id="label-demo" className="w-64" />
      </Specimen>

      <Specimen label="Field">
        <div className="grid w-full gap-6 *:min-w-0 lg:grid-cols-2">
          <FieldSet>
            <FieldLegend>Explain back</FieldLegend>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="field-answer">{cards[0].question}</FieldLabel>
                <Textarea id="field-answer" />
                <FieldDescription>
                  Answer in your own words. TODO(zia): scoring copy.
                </FieldDescription>
              </Field>
              <Field data-invalid>
                <FieldLabel htmlFor="field-invalid">Short answer</FieldLabel>
                <Input id="field-invalid" aria-invalid defaultValue="idk" />
                <FieldError
                  errors={[
                    { message: "Write at least one sentence." },
                    { message: "Name the file." },
                  ]}
                />
              </Field>
              <Field data-disabled>
                <FieldLabel htmlFor="field-disabled">Locked until day 3</FieldLabel>
                <Input id="field-disabled" disabled />
              </Field>
            </FieldGroup>
          </FieldSet>
          <FieldSet>
            <FieldLegend variant="label">Review reminders</FieldLegend>
            <FieldGroup>
              <Field orientation="horizontal">
                <Checkbox id="field-email" defaultChecked />
                <FieldContent>
                  <FieldLabel htmlFor="field-email">Email me on review days</FieldLabel>
                  <FieldDescription>Day 1, 3 and 7 after a session ends.</FieldDescription>
                </FieldContent>
              </Field>
              <FieldSeparator>or</FieldSeparator>
              <Field orientation="responsive">
                <FieldContent>
                  <FieldTitle>Timezone</FieldTitle>
                  <FieldDescription>TODO(zia): where reminders are sent from.</FieldDescription>
                </FieldContent>
                <Input aria-label="Timezone" defaultValue="Asia/Kathmandu" />
              </Field>
              <FieldSeparator />
            </FieldGroup>
          </FieldSet>
        </div>
      </Specimen>

      <Specimen label="Input group">
        <div className="grid w-full gap-3 *:min-w-0 sm:grid-cols-2">
          <InputGroup>
            <InputGroupAddon>
              <MagnifyingGlassIcon />
            </InputGroupAddon>
            <InputGroupInput aria-label="Search decisions" placeholder="Search decisions" />
          </InputGroup>
          <InputGroup>
            <InputGroupAddon>
              <GitBranchIcon />
            </InputGroupAddon>
            <InputGroupInput aria-label="Branch" defaultValue={session.branch} />
            <InputGroupAddon align="inline-end">
              <InputGroupText>{session.repo}</InputGroupText>
            </InputGroupAddon>
          </InputGroup>
          <InputGroup>
            <InputGroupInput aria-label="Session ID" defaultValue={session.id} readOnly />
            <InputGroupAddon align="inline-end">
              <InputGroupButton size="icon-xs" aria-label="Send">
                <PaperPlaneRightIcon />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <InputGroup>
            <InputGroupInput aria-label="Invalid grouped input" aria-invalid defaultValue="E99" />
            <InputGroupAddon align="inline-end">
              <InputGroupButton size="xs">Check</InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <InputGroup>
            <InputGroupInput aria-label="Disabled grouped input" disabled placeholder="Disabled" />
            <InputGroupAddon align="inline-end">
              <InputGroupButton size="sm" disabled>
                Save
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <InputGroup>
            <InputGroupTextarea aria-label="Answer with a hint" placeholder="Explain it back" />
            <InputGroupAddon align="block-end">
              <InputGroupText>0 of 280</InputGroupText>
              <InputGroupButton size="icon-sm" variant="default" aria-label="Submit answer">
                <PaperPlaneRightIcon />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <InputGroup>
            <InputGroupAddon align="block-start">
              <InputGroupText>Question</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput aria-label="Question" defaultValue={cards[1].question} />
          </InputGroup>
        </div>
      </Specimen>
    </>
  );
}

function ChoiceControls() {
  const [files, setFiles] = useState<string[]>([CARD_FILES[0]]);
  return (
    <>
      <Specimen label="Checkbox (the tick blurs in and out)">
        <Checkbox aria-label="Unchecked" />
        <Checkbox aria-label="Checked" defaultChecked />
        <Checkbox aria-label="Mixed" indeterminate />
        <Checkbox aria-label="Disabled" disabled />
        <Checkbox aria-label="Disabled checked" disabled defaultChecked />
        <Checkbox aria-label="Invalid" aria-invalid />
        <Checkbox aria-label="Read-only" readOnly defaultChecked />
        <CheckboxGroup
          aria-label="Files the cards touch"
          value={files}
          onValueChange={setFiles}
          allValues={CARD_FILES}
        >
          <Field orientation="horizontal">
            <Checkbox id="file-all" parent />
            <FieldLabel htmlFor="file-all">All files</FieldLabel>
          </Field>
          {CARD_FILES.map((file) => (
            <Field key={file} orientation="horizontal">
              <Checkbox id={`file-${file}`} value={file} />
              <FieldLabel htmlFor={`file-${file}`}>{file}</FieldLabel>
            </Field>
          ))}
        </CheckboxGroup>
      </Specimen>

      <Specimen label="Switch (the thumb squashes on press)">
        {(["sm", "default"] as const).map((size) => (
          <Field key={size} orientation="horizontal" className="w-auto">
            <Switch id={`switch-${size}`} size={size} defaultChecked={size === "default"} />
            <FieldLabel htmlFor={`switch-${size}`}>Reminders ({size})</FieldLabel>
          </Field>
        ))}
        <Switch aria-label="Disabled" disabled />
        <Switch aria-label="Disabled on" disabled defaultChecked />
        <Switch aria-label="Saving" pending defaultChecked />
        <Switch aria-label="Invalid" aria-invalid />
      </Specimen>

      <Specimen label="Slider">
        <div className="grid w-full items-center gap-6 *:min-w-0 sm:grid-cols-2 lg:grid-cols-4">
          <Slider aria-label="Cards per session" defaultValue={[4]} min={3} max={5} />
          <Slider
            defaultValue={[1, 7]}
            min={1}
            max={7}
            thumbLabels={["First review", "Last review"]}
          />
          <Slider aria-label="Disabled slider" defaultValue={[40]} disabled />
          <div className="h-40">
            <Slider aria-label="Vertical slider" defaultValue={[60]} orientation="vertical" />
          </div>
        </div>
      </Specimen>

      <Specimen label="Select">
        {CONTROL_SIZES.map((size) => (
          <Select key={size} items={SOURCES} defaultValue="stated">
            <SelectTrigger size={size} aria-label={`Source (${size})`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOURCES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
        <Select defaultValue={DECISIONS[0]}>
          <SelectTrigger aria-label="Decision" className="w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GROUPED.map((group, index) => (
              <SelectGroup key={group.value}>
                {index > 0 && <SelectSeparator />}
                <SelectLabel>{group.value}</SelectLabel>
                {group.items.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
            <SelectItem value="hidden" disabled>
              Hidden card
            </SelectItem>
          </SelectContent>
        </Select>
        <Select disabled>
          <SelectTrigger aria-label="Disabled select">
            <SelectValue placeholder="Disabled" />
          </SelectTrigger>
          <SelectContent />
        </Select>
        <Select>
          <SelectTrigger aria-label="Invalid select" aria-invalid>
            <SelectValue placeholder="Pick a source" />
          </SelectTrigger>
          <SelectContent>
            {SOURCES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select multiple defaultValue={["1", "3"]}>
          <SelectTrigger aria-label="Review days">
            <SelectValue placeholder="Review days" />
          </SelectTrigger>
          <SelectContent>
            {REVIEW_DAYS.map((day) => (
              <SelectItem key={day} value={String(day)}>
                Day {day}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Specimen>

      <Specimen label="Segmented control">
        {(["xs", "sm", "default"] as const).map((size) => (
          <SegmentedControl
            key={size}
            size={size}
            defaultValue="all"
            aria-label={`Cards (${size})`}
          >
            <SegmentedControlItem value="all" count={cards.length}>
              All
            </SegmentedControlItem>
            <SegmentedControlItem value="stated">Stated</SegmentedControlItem>
            <SegmentedControlItem value="inferred">Inferred</SegmentedControlItem>
          </SegmentedControl>
        ))}
        <SegmentedControl multiple defaultValue={["flagged"]} countMax={99} aria-label="Filters">
          <SegmentedControlItem value="flagged" count={cards.filter((c) => c.flagged).length}>
            Flagged
          </SegmentedControlItem>
          <SegmentedControlItem value="due" count={0}>
            Due today
          </SegmentedControlItem>
        </SegmentedControl>
        <SegmentedControl disabled defaultValue="a" aria-label="Disabled control">
          <SegmentedControlItem value="a">Disabled</SegmentedControlItem>
          <SegmentedControlItem value="b">Control</SegmentedControlItem>
        </SegmentedControl>
        <div className="w-full">
          <SegmentedControl fill defaultValue="1" aria-label="Review day">
            {REVIEW_DAYS.map((day) => (
              <SegmentedControlItem key={day} value={String(day)}>
                Day {day}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        </div>
      </Specimen>
    </>
  );
}

function Comboboxes() {
  const anchor = useComboboxAnchor();
  return (
    <Specimen label="Combobox">
      <div className="grid w-full gap-3 *:min-w-0 sm:grid-cols-2 lg:grid-cols-3">
        {CONTROL_SIZES.map((size) => (
          <Combobox key={size} items={DECISIONS}>
            <ComboboxInput
              size={size}
              aria-label={`Decision (${size})`}
              placeholder="Find a decision"
            />
            <ComboboxContent>
              <ComboboxEmpty>No decisions match.</ComboboxEmpty>
              <ComboboxList>
                {(item: string) => (
                  <ComboboxItem key={item} value={item}>
                    {item}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        ))}
        <Combobox items={GROUPED} defaultValue={DECISIONS[0]}>
          <ComboboxInput showClear aria-label="Grouped decisions" />
          <ComboboxContent>
            <ComboboxEmpty>No decisions match.</ComboboxEmpty>
            <ComboboxList>
              {(group: (typeof GROUPED)[number], index: number) => (
                <ComboboxGroup key={group.value} items={group.items}>
                  {index > 0 && <ComboboxSeparator />}
                  <ComboboxLabel>{group.value}</ComboboxLabel>
                  <ComboboxCollection>
                    {(item: string) => (
                      <ComboboxItem key={item} value={item}>
                        {item}
                      </ComboboxItem>
                    )}
                  </ComboboxCollection>
                </ComboboxGroup>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        <Combobox items={DECISIONS} disabled>
          <ComboboxInput disabled aria-label="Disabled combobox" placeholder="Disabled" />
        </Combobox>
        <Combobox items={DECISIONS}>
          <ComboboxInput aria-label="Invalid combobox" aria-invalid placeholder="Required" />
          <ComboboxContent>
            <ComboboxList>
              {(item: string) => (
                <ComboboxItem key={item} value={item}>
                  {item}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        <Combobox items={CARD_FILES} multiple defaultValue={[CARD_FILES[0]]}>
          <ComboboxChips ref={anchor}>
            <ComboboxValue>
              {(value: string[]) => (
                <>
                  {value.map((file) => (
                    <ComboboxChip key={file}>{file}</ComboboxChip>
                  ))}
                  <ComboboxChipsInput
                    aria-label="Files"
                    placeholder={value.length ? "" : "Files"}
                  />
                </>
              )}
            </ComboboxValue>
          </ComboboxChips>
          <ComboboxContent anchor={anchor}>
            <ComboboxEmpty>No files match.</ComboboxEmpty>
            <ComboboxList>
              {(item: string) => (
                <ComboboxItem key={item} value={item}>
                  {item}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        <Combobox items={SOURCES.map((s) => s.label)} defaultValue="Stated">
          <ComboboxTrigger aria-label="Source">
            <ComboboxValue />
          </ComboboxTrigger>
          <ComboboxClear aria-label="Clear source" />
          <ComboboxContent>
            <ComboboxInput aria-label="Search sources" placeholder="Search" />
            <ComboboxList>
              {(item: string) => (
                <ComboboxItem key={item} value={item}>
                  {item}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>
    </Specimen>
  );
}

function Calendars() {
  const [range, setRange] = useState<DateRange | undefined>({
    from: REVIEW_DATES[0],
    to: REVIEW_DATES[2],
  });
  return (
    <Specimen label="Calendar">
      <Calendar
        mode="multiple"
        today={SESSION_DAY}
        defaultMonth={SESSION_DAY}
        selected={REVIEW_DATES}
        aria-label="Review days"
      />
      <Calendar
        mode="range"
        today={SESSION_DAY}
        defaultMonth={SESSION_DAY}
        selected={range}
        onSelect={setRange}
        disabled={{ before: SESSION_DAY }}
        aria-label="Review window"
      />
      <Calendar
        mode="single"
        today={SESSION_DAY}
        defaultMonth={SESSION_DAY}
        captionLayout="dropdown"
        startMonth={new Date(2026, 0)}
        endMonth={new Date(2027, 11)}
        aria-label="Pick a day"
      />
    </Specimen>
  );
}

function InputsCatalog() {
  return (
    <GallerySection
      id="inputs"
      title="Inputs"
      description="Input, textarea, label, field, input group, checkbox, switch, slider, select, segmented control, combobox and calendar."
    >
      <TextFields />
      <ChoiceControls />
      <Comboboxes />
      <Calendars />
    </GallerySection>
  );
}

export { InputsCatalog };
