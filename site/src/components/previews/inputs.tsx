import { Icon } from "@senvenli/react/display";
import { Input } from "@senvenli/react/form";
import { Checkbox, Slider, Switch } from "@senvenli/react/selection";
import type { ReactNode } from "react";
import { Btn, FieldBox, Float, Line, Photo, Row, Word } from "./kit";

/** A swatch in one of the theme's chart colors, so the color family follows the theme too. */
const SWATCH = ["bg-ds-chart-1", "bg-ds-chart-2", "bg-ds-chart-3", "bg-ds-chart-4", "bg-ds-chart-5"];

/** A month, drawn: weekday bars, then days as dots, one of them chosen. */
function MiniMonth({ rows = 4 }: { rows?: number }) {
  return (
    <div className="grid grid-cols-7 gap-ds-050">
      {Array.from({ length: 7 }, (_, day) => (
        <span key={`w${day}`} className="h-0.5 w-2.5 rounded-ds-full bg-ds-background-neutral-pressed" />
      ))}
      {Array.from({ length: rows * 7 }, (_, day) => (
        <span key={day} className={`size-2.5 rounded-ds-xsmall ${day === 10 ? "bg-ds-background-brand-bold" : "bg-ds-background-neutral"}`} />
      ))}
    </div>
  );
}

/** A date or time, as the segments a field edits one by one. */
function Segments({ parts, separator }: { parts: string[]; separator: string }) {
  return (
    <span className="flex items-center gap-ds-025 text-body-small leading-none text-ds-text tabular-nums">
      {parts.map((part, index) => (
        <span key={index} className="flex items-center gap-ds-025">
          {index > 0 && <span className="text-ds-text-subtlest">{separator}</span>}
          <span className={index === 0 ? "rounded-ds-xsmall bg-ds-background-selected px-ds-025 py-ds-025" : "py-ds-025"}>{part}</span>
        </span>
      ))}
    </span>
  );
}

/** Form, selection, date and color. */
export const INPUTS: Record<string, ReactNode> = {
  // Form
  field: (
    <div className="flex w-40 flex-col gap-ds-075">
      <Word>Label</Word>
      <FieldBox />
      <Word tone="subtle">Help text</Word>
    </div>
  ),
  "file-upload": (
    <div className="flex h-20 w-40 flex-col items-center justify-center gap-ds-100 rounded-ds-medium border border-dashed border-ds-border-bold">
      <Icon name="upload" size="small" color="subtle" />
      <Line w="w-20" />
    </div>
  ),
  form: (
    <div className="flex w-40 flex-col gap-ds-100">
      <Line w="w-10" strong />
      <FieldBox small />
      <Line w="w-14" strong />
      <FieldBox small />
      <div className="flex justify-end gap-ds-050 pt-ds-025">
        <Btn small>Cancel</Btn>
        <Btn primary small>
          Save
        </Btn>
      </div>
    </div>
  ),
  "image-cropper": (
    <div className="relative h-20 w-32">
      <Photo className="size-full rounded-ds-small" />
      <span className="absolute inset-0 rounded-ds-small bg-ds-blanket" />
      <span className="absolute inset-x-6 inset-y-3 overflow-hidden rounded-ds-xsmall border border-ds-border-focused">
        <Photo className="absolute -inset-x-6 -inset-y-3 rounded-none" />
      </span>
    </div>
  ),
  "input-group": (
    <div className="flex h-7 w-44 items-stretch overflow-hidden rounded-ds-control-small border border-ds-border bg-ds-background-input">
      <span className="flex items-center bg-ds-background-neutral px-ds-100">
        <Word tone="subtle">https://</Word>
      </span>
      <span className="flex min-w-0 flex-1 items-center px-ds-100">
        <Word>example</Word>
      </span>
      <span className="flex items-center px-ds-075 text-ds-text-subtle">
        <Icon name="copy" size="small" />
      </span>
    </div>
  ),
  input: (
    <div className="w-40">
      <Input label="Email" placeholder="you@example.com" size="small" />
    </div>
  ),
  "otp-field": (
    <div className="flex items-center gap-ds-050">
      {["4", "8", "2", "", "", ""].map((digit, index) => (
        <span
          key={index}
          className={`flex h-8 w-6 items-center justify-center rounded-ds-control-small border bg-ds-background-input text-body leading-none text-ds-text ${index === 3 ? "border-ds-border-focused" : "border-ds-border"}`}
        >
          {digit}
        </span>
      ))}
    </div>
  ),
  "text-area": (
    <div className="relative flex h-20 w-40 flex-col gap-ds-100 rounded-ds-control-small border border-ds-border bg-ds-background-input p-ds-100">
      <Line />
      <Line w="w-5/6" />
      <Line w="w-1/2" />
      <svg viewBox="0 0 8 8" className="absolute bottom-1 right-1 size-2 stroke-ds-text-subtlest" strokeLinecap="round">
        <path d="M7 2 2 7M7 5.5 5.5 7" />
      </svg>
    </div>
  ),

  // Selection
  autocomplete: (
    <div className="flex w-40 flex-col gap-ds-050">
      <FieldBox focused>
        <Icon name="search" size="small" color="subtle" />
        <Word>inv</Word>
      </FieldBox>
      <Float className="flex flex-col p-ds-050">
        <Row selected>
          <Word>
            inv<span className="text-ds-text-subtle">oices</span>
          </Word>
        </Row>
        <Row>
          <Word>
            inv<span className="text-ds-text-subtle">entory</span>
          </Word>
        </Row>
      </Float>
    </div>
  ),
  checkbox: (
    <div className="flex flex-col gap-ds-100">
      <Checkbox defaultSelected size="small">
        Remember me
      </Checkbox>
      <Checkbox size="small">Send updates</Checkbox>
    </div>
  ),
  combobox: (
    <div className="flex w-40 flex-col gap-ds-050">
      <FieldBox>
        <Word className="flex-1">Design</Word>
        <Icon name="chevron-down" size="small" color="subtle" />
      </FieldBox>
      <Float className="flex flex-col p-ds-050">
        <Row selected>
          <Word className="flex-1">Design</Word>
          <Icon name="check" size="small" />
        </Row>
        <Row>
          <Word>Engineering</Word>
        </Row>
      </Float>
    </div>
  ),
  "list-box": (
    <div className="flex w-36 flex-col gap-ds-025 rounded-ds-medium border border-ds-border p-ds-050">
      <Row>
        <Line w="w-16" strong />
      </Row>
      <Row selected="accent">
        <Line w="w-20" strong className="flex-none" />
        <span className="flex-1" />
        <Icon name="check" size="small" />
      </Row>
      <Row>
        <Line w="w-12" strong />
      </Row>
    </div>
  ),
  radio: (
    <div className="flex flex-col gap-ds-100">
      {["Monthly", "Yearly"].map((label, index) => (
        <span key={label} className="flex items-center gap-ds-100">
          <span className={`flex size-4 items-center justify-center rounded-ds-full border ${index === 1 ? "border-ds-background-brand-bold bg-ds-background-brand-bold" : "border-ds-border-bold bg-ds-background-input"}`}>
            {index === 1 && <span className="size-1.5 rounded-ds-full bg-ds-text-on-brand" />}
          </span>
          <Word>{label}</Word>
        </span>
      ))}
    </div>
  ),
  select: (
    <FieldBox className="w-36">
      <Word className="flex-1">Last 30 days</Word>
      <Icon name="chevrons-up-down" size="small" color="subtle" />
    </FieldBox>
  ),
  slider: (
    <div className="w-40">
      <Slider label="Volume" defaultValue={60} />
    </div>
  ),
  switch: (
    <div className="flex flex-col gap-ds-100">
      <Switch defaultSelected size="small">
        Notifications
      </Switch>
      <Switch size="small">Weekly digest</Switch>
    </div>
  ),
  "tag-group": (
    <div className="flex items-center gap-ds-075">
      {["Design", "Docs", "Bug"].map((tag) => (
        <span key={tag} className="flex h-6 items-center gap-ds-050 rounded-ds-control-small bg-ds-background-neutral pl-ds-100 pr-ds-050">
          <Word>{tag}</Word>
          <Icon name="x" size="small" color="subtle" />
        </span>
      ))}
    </div>
  ),

  // Date
  calendar: (
    <div className="flex flex-col gap-ds-100">
      <div className="flex items-center justify-between">
        <Icon name="chevron-left" size="small" color="subtle" />
        <Line w="w-12" strong />
        <Icon name="chevron-right" size="small" color="subtle" />
      </div>
      <MiniMonth rows={5} />
    </div>
  ),
  "date-field": (
    <FieldBox className="w-32">
      <Segments parts={["03", "18", "2026"]} separator="/" />
    </FieldBox>
  ),
  "date-picker": (
    <div className="flex flex-col items-start gap-ds-050">
      <FieldBox className="w-32">
        <Word className="flex-1 tabular-nums">03/18/2026</Word>
        <Icon name="calendar" size="small" color="subtle" />
      </FieldBox>
      <Float className="p-ds-100">
        <MiniMonth rows={3} />
      </Float>
    </div>
  ),
  "time-field": (
    <FieldBox className="w-28">
      <Segments parts={["09", "30"]} separator=":" />
      <Word tone="subtle">AM</Word>
      <span className="flex-1" />
      <Icon name="clock" size="small" color="subtle" />
    </FieldBox>
  ),

  // Color
  "color-field": (
    <FieldBox className="w-32">
      <span className="size-4 shrink-0 rounded-ds-xsmall bg-ds-chart-2" />
      <Word tone="subtle">#</Word>
      <Line w="w-12" strong />
    </FieldBox>
  ),
  "color-picker": (
    <div className="flex w-32 flex-col gap-ds-100">
      {/* The one place a gradient is the subject itself: the picker's color area, from the surface to one of the chart colors. */}
      <div className="relative h-14 rounded-ds-small" style={{ background: "linear-gradient(to right, var(--ds-surface-raised), var(--ds-chart-2))" }}>
        <span className="absolute right-6 top-3 size-3 rounded-ds-full border-2 border-ds-surface-raised shadow-ds-raised" />
      </div>
      <div className="flex h-2 overflow-hidden rounded-ds-full">
        {SWATCH.map((color) => (
          <span key={color} className={`flex-1 ${color}`} />
        ))}
      </div>
    </div>
  ),
  "color-swatch-picker": (
    <div className="flex items-center gap-ds-100">
      {SWATCH.map((color, index) => (
        <span key={color} className={`flex size-6 items-center justify-center rounded-ds-full ${index === 1 ? "border-2 border-ds-border-focused" : ""}`}>
          <span className={`rounded-ds-full ${color} ${index === 1 ? "size-3.5" : "size-5"}`} />
        </span>
      ))}
    </div>
  ),
  "color-swatch": (
    <div className="flex items-center gap-ds-150">
      <span className="size-10 rounded-ds-medium bg-ds-chart-2" />
      <span className="flex flex-col gap-ds-100">
        <Line w="w-12" strong />
        <Line w="w-16" />
      </span>
    </div>
  ),
};
