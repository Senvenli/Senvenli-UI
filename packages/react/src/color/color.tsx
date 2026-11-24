"use client";

import * as React from "react";
import {
  ColorArea,
  ColorField as AriaColorField,
  ColorFieldContext,
  ColorFieldStateContext,
  ColorPicker as AriaColorPicker,
  ColorSlider,
  ColorSwatch as AriaColorSwatch,
  ColorSwatchPicker as AriaColorSwatchPicker,
  ColorSwatchPickerItem,
  ColorThumb,
  Dialog,
  DialogTrigger,
  Input,
  Label,
  Popover,
  SliderTrack,
  Text,
  parseColor,
  useLocale,
  type Color,
  type ColorChannel,
} from "react-aria-components";

import { createTheme, formatHex } from "@senvenli/tokens";

import { cn } from "../utils";
import { Button } from "../action/index";
import { IconGlyph } from "../display/icon";
import { FieldDescription, FieldError, FieldLabel } from "../form/field-parts";
import { InputAddon, InputGroup } from "../form/input-group";
import { DESCRIPTION, FIELD_STACK, INPUT, LABEL } from "../form/styles";
import { useRequiredChoice, type RequiredValidation } from "../form/validation";
import {
  customColorLabel,
  hexExpectedLabel,
  nameSelectedLabel,
} from "../i18n";
import { POPOVER } from "../selection/listbox";
import { contrastRatio } from "./contrast";

/** The neutral default primary: the picker starts from the color a theme without one uses. */
const DEFAULT_PRIMARY = formatHex(createTheme().light["ds-background-brand-bold"]!).toUpperCase();

/** "#1E63D0", or "#1E63D0CC" when the color carries alpha. */
function toHex(color: Color): string {
  const alpha = color.getChannelValue("alpha");
  const hex = color.toString("hex").toUpperCase();
  if (alpha >= 1) return hex;
  return hex + Math.round(alpha * 255).toString(16).padStart(2, "0").toUpperCase();
}

function tryParse(value: string | null | undefined): Color | null {
  if (!value) return null;
  try {
    return parseColor(value.startsWith("#") ? value : `#${value}`);
  } catch {
    return null;
  }
}

/** The color space a single-channel field edits in (React Aria refuses an HSL channel on an RGB color). */
function spaceFor(channel: ColorChannel): "rgb" | "hsl" | "hsb" {
  if (channel === "hue" || channel === "saturation" || channel === "lightness") return "hsl";
  if (channel === "brightness") return "hsb";
  return "rgb";
}

/** What the hex field takes: 6 digits or the 3-digit shorthand, "#" optional (no 4/8-digit alpha forms). */
const HEX_TEXT = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Empty or unreadable: a checkerboard instead of a color (design tokens, not React Aria's greys). */
const CHECKERBOARD: React.CSSProperties = {
  background: "repeating-conic-gradient(var(--ds-background-neutral-pressed) 0 25%, var(--ds-surface-raised) 0 50%) 0 0 / 8px 8px",
};

/**
 * The 18px round thumb with a light ring, on the area and the sliders. The ring is paper (#fcfcfb) in both
 * themes, so it shows over any color; keyboard focus turns the ring itself the focus color (no outer ring).
 */
const THUMB =
  "size-4.5 rounded-ds-full border-2 border-[#fcfcfb] shadow-ds-raised outline-hidden " +
  "data-[focus-visible]:border-ds-border-focused " +
  "data-[dragging]:size-5";

export type ColorFieldProps = {
  label: React.ReactNode;
  description?: React.ReactNode;
  /** Shown while the field is invalid; a malformed hex says what a valid one looks like by itself. */
  errorMessage?: React.ReactNode;
  /** "#1E63D0" (also "1e63d0" and "#16D"); `null` for none. */
  value?: string | null;
  defaultValue?: string | null;
  /** The normalised hex ("#1E63D0"), or `null` when emptied. */
  onChange?: (value: string | null) => void;
  /** `hex` by default; a single channel ("hue", "saturation", "red"…) types that channel's number instead. */
  channel?: ColorChannel;
  isRequired?: boolean;
  /**
   * Who says an empty required ColorField is missing: inside a DS Form, `field` (default) shows "Fill in this
   * field." on blur and on submit, which it then blocks; `app` only marks the field. See {@link RequiredValidation}.
   * The app's `isInvalid` (`true` with its `errorMessage`, or `false`) overrides the check, as on TextField. Disabled,
   * empty and required, it still blocks a DS Form's submit and cannot take focus (as TextField).
   */
  requiredValidation?: RequiredValidation;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isInvalid?: boolean;
  name?: string;
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
};

/**
 * Keeps a malformed hex visible after blur. React Aria puts the last valid color back when focus leaves
 * the field; the design keeps what the user typed, with an example of a valid value under it.
 */
function KeepTyped({ typed }: { typed: string | null }) {
  const state = React.useContext(ColorFieldStateContext);
  const inputValue = state?.inputValue;
  React.useLayoutEffect(() => {
    if (state && typed !== null && inputValue !== typed) state.setInputValue(typed);
  }, [typed, inputValue]);
  return null;
}

/** Inside ColorPicker the hex field carries a "HEX" addon and leaves the swatch to the picker (32px). */
type ColorFieldInternals = { hexAddon?: boolean };

/**
 * Types a color as hex with a live swatch: the text part of ColorPicker, and on its own in compact
 * settings. Accepts "1e63d0", "#1E63D0" and "#16D"; shows "#1E63D0" after blur. A malformed value stays
 * as typed with "Enter a 6-digit hex code: #1E63D0".
 */
export function ColorField(props: ColorFieldProps) {
  return <ColorFieldBase {...props} />;
}

function ColorFieldBase({
  label, description, errorMessage: errorMessageProp, value, defaultValue, onChange, channel, isInvalid: isInvalidProp, hexAddon, "aria-label": ariaLabel,
  requiredValidation, ...rest
}: ColorFieldProps & ColorFieldInternals) {
  const { locale } = useLocale();
  const [typed, setTyped] = React.useState<string | null>(null);
  const [own, setOwn] = React.useState<string | null>(defaultValue ?? null);
  const current = value !== undefined ? value : own;
  // A new value from outside (the picker's area, the parent) replaces a malformed entry.
  const [seen, setSeen] = React.useState(current);
  if (seen !== current) {
    setSeen(current);
    setTyped(null);
  }
  const shown = typed !== null ? null : tryParse(current);
  const malformed = typed !== null;
  // React Aria never finds an empty required ColorField missing under `aria` validation; the DS does.
  // Malformed text is not empty: it has its own message.
  const required = useRequiredChoice({
    filled: (current != null && current !== "") || malformed, isRequired: rest.isRequired, requiredValidation, isInvalid: isInvalidProp, errorMessage: errorMessageProp,
  });
  const isInvalid = required.isInvalid;
  const errorMessage = required.errorMessage;
  const input = React.useRef<HTMLInputElement>(null);
  // A single-channel field keeps the color it last reported (as an object in that channel's space): while
  // the value is still that color's hex, it is used, so typing a hue on a grey is not lost to the hex.
  const [last, setLast] = React.useState<Color | null>(null);
  const given = tryParse(current);
  const parsed = channel && last && given && toHex(last) === toHex(given) ? last : given;
  /** Leaving the field, or Enter: a malformed hex is kept as typed (React Aria would put the last color back). */
  const judge = (text: string) => setTyped(!channel && text !== "" && !HEX_TEXT.test(text) ? text : null);
  return (
    <AriaColorField
      {...rest}
      aria-label={ariaLabel}
      channel={channel}
      // Always controlled here, so React Aria cannot commit a value the field rejects ("12AB" as #1122AA).
      value={channel && parsed ? parsed.toFormat(spaceFor(channel)) : (current ?? null)}
      isInvalid={malformed || isInvalid}
      onBlur={required.onBlur}
      onChange={(color) => {
        const text = input.current?.value.trim() ?? "";
        if (!channel && color && text !== "" && !HEX_TEXT.test(text)) return;
        const hex = color ? toHex(color) : null;
        setLast(color);
        setOwn(hex);
        onChange?.(hex);
      }}
      data-slot="color-field"
      className={FIELD_STACK}
    >
      {({ isInvalid: invalid, isDisabled }) => (
        <>
          {label != null && <FieldLabel isRequired={rest.isRequired}>{label}</FieldLabel>}
          <InputGroup isDisabled={isDisabled} isInvalid={invalid}>
            {hexAddon && <InputAddon position="start">HEX</InputAddon>}
            {!channel && !hexAddon && (
              <AriaColorSwatch
                data-slot="color-field-swatch"
                color={shown ?? "#0000"}
                className="size-6 shrink-0 rounded-ds-small inset-ring-1 inset-ring-ds-border"
                style={shown ? undefined : CHECKERBOARD}
              />
            )}
            <Input
              ref={input}
              data-slot="color-field-input"
              className={cn(INPUT, "font-ds-mono text-code uppercase")}
              onChange={() => setTyped(null)}
              onBlur={(event) => judge(event.currentTarget.value.trim())}
              // Capture: React Aria's Enter commits (and resets the text) before a bubbling handler would read it.
              onKeyDownCapture={(event) => {
                if (event.key === "Enter") judge(event.currentTarget.value.trim());
              }}
            />
          </InputGroup>
          {!channel && <KeepTyped typed={typed} />}
          {description && <FieldDescription>{description}</FieldDescription>}
          <FieldError>{malformed ? hexExpectedLabel(locale, "#1E63D0") : errorMessage}</FieldError>
        </>
      )}
    </AriaColorField>
  );
}

export type ColorPickerProps = {
  /** "Brand color"; names the area, the sliders and the hex field for screen readers. */
  label: React.ReactNode;
  /** The hex ("#1E63D0"); "#1E63D0CC" with an alpha channel. */
  value?: string;
  defaultValue?: string;
  /** While dragging and typing: the preview and its contrast check follow every move. */
  onChange?: (value: string) => void;
  /** On release (and when the hex field commits): save here, not on every move. */
  onChangeEnd?: (value: string) => void;
  /** The sliders under the area: hue always, alpha when the color may be translucent. */
  channels?: readonly ("hue" | "alpha")[];
};

/**
 * Picks a color: a saturation–brightness area, a hue slider (and alpha) and a hex field. To check a brand color's
 * contrast as it moves, pair it with `checkBrandColor` (see the example).
 */
export function ColorPicker({
  label, value, defaultValue = DEFAULT_PRIMARY, onChange, onChangeEnd, channels = ["hue"],
}: ColorPickerProps) {
  const { locale } = useLocale();
  const [own, setOwn] = React.useState<Color>(() => parseColor(defaultValue));
  // Our own color is kept as React Aria's HSB object, controlled or not: while the parent's hex is the one
  // we reported, that object is used, so a grey or black (where hex has no hue or saturation) does not snap
  // the thumbs back to 0. A different hex from the parent replaces it.
  const given = value === undefined ? null : tryParse(value);
  const color = value === undefined || !given || toHex(given) === toHex(own) ? own : given;
  const latest = React.useRef(color);
  latest.current = color;
  const hex = toHex(color.withChannelValue("alpha", 1));
  const labelId = React.useId();
  const emit = (next: Color) => {
    latest.current = next;
    setOwn(next);
    onChange?.(toHex(next));
  };
  const end = () => onChangeEnd?.(toHex(latest.current));
  const hsb = color.toFormat("hsb");
  return (
    <AriaColorPicker
      value={color}
      onChange={emit}
    >
      <div data-slot="color-picker" className="flex flex-wrap items-start gap-ds-400">
        <div data-slot="color-picker-controls" className="flex w-60 flex-col gap-ds-150">
          <span id={labelId} data-slot="color-picker-label" className={LABEL}>{label}</span>
          <ColorArea
            data-slot="color-area"
            aria-labelledby={labelId}
            colorSpace="hsb"
            xChannel="saturation"
            yChannel="brightness"
            onChangeEnd={end}
            className="h-40 w-60 rounded-ds-medium inset-ring-1 inset-ring-ds-border"
          >
            <ColorThumb data-slot="color-thumb" className={THUMB} />
          </ColorArea>
          {channels.map((channel) => (
            <ColorSlider
              key={channel}
              data-slot={`color-slider-${channel}`}
              colorSpace="hsb"
              channel={channel}
              onChangeEnd={end}
              className="flex flex-col gap-ds-050"
            >
              {/* "Brand color, Hue": React Aria's own label slot names the input directly, whatever the label is
                  (a labelledby on the slider would land on its track group, two hops from the input). */}
              <Label data-slot="color-slider-label" className="sr-only">
                {label}, {color.getChannelName(channel, locale)}
              </Label>
              <SliderTrack data-slot="color-slider-track" className="h-3 w-full rounded-ds-full inset-ring-1 inset-ring-ds-border">
                <ColorThumb data-slot="color-thumb" className={cn(THUMB, "top-1/2")} />
              </SliderTrack>
            </ColorSlider>
          ))}
          {/* The picker's own field context would chain its onChange with ours (two changes per commit, and a
              "12AB" the field rejects would still reach the picker); the field reports through ours only. */}
          <div className="flex items-start gap-ds-100">
            <AriaColorSwatch data-slot="color-picker-swatch" color={color} className="size-8 shrink-0 rounded-ds-medium inset-ring-1 inset-ring-ds-border" />
            <div className="min-w-0 flex-1">
              <ColorFieldContext.Provider value={null}>
                <span id={`${labelId}-hex`} hidden>· HEX</span>
                <ColorFieldBase
                  label={null}
                  hexAddon
                  aria-labelledby={`${labelId} ${labelId}-hex`}
                  value={hex}
                  onChange={(next) => {
                    if (!next) return;
                    const parsed = tryParse(next);
                    if (!parsed) return;
                    const merged = parsed.withChannelValue("alpha", color.getChannelValue("alpha"));
                    emit(merged);
                    onChangeEnd?.(toHex(merged));
                  }}
                />
              </ColorFieldContext.Provider>
            </div>
          </div>
          <span className="sr-only" aria-live="polite" data-slot="color-picker-value">
            {`${hex}, ${Math.round(hsb.getChannelValue("hue"))}°`}
          </span>
        </div>
      </div>
    </AriaColorPicker>
  );
}

export type ColorSwatchProps = {
  /** The color shown ("#1E63D0"). */
  color: string;
  /** Its name ("Ocean"): the accessible label. */
  name?: string;
  className?: string;
};

/** One color tile (32px, a faint inset edge so light colors show on light grounds). */
export function ColorSwatch({ color, name, className }: ColorSwatchProps) {
  return (
    <AriaColorSwatch
      data-slot="color-swatch"
      color={color}
      colorName={name}
      className={cn("size-8 rounded-ds-medium inset-ring-1 inset-ring-ds-border", className)}
    />
  );
}

export type ColorSwatchItem = { value: string; name: string };

export type ColorSwatchPickerProps = {
  /** "Theme presets". */
  label: React.ReactNode;
  /** The preset colors; check them with checkBrandColor so that only a custom color can fail. */
  items: readonly ColorSwatchItem[];
  /** The chosen color, controlled. `null` or `""`: none chosen, so no swatch shows a check (a theme with no brand color). */
  value?: string | null;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Ends with a button that opens ColorPicker for a custom color. */
  allowsCustom?: boolean;
  /** Under the swatches, after "Ocean · selected". */
  description?: React.ReactNode;
};

/** Paper or ink, whichever reads better on the swatch: the check mark's color. */
function checkColor(value: string): string {
  // Normalized to "#rrggbb" first: the contrast parser takes no alpha or bare digits.
  const hex = tryParse(value)?.toString("hex") ?? value;
  return contrastRatio(hex, "#fcfcfb") >= contrastRatio(hex, "#0c0c0b") ? "#fcfcfb" : "#0c0c0b";
}

const SWATCH_ITEM =
  "grid size-10 cursor-pointer place-items-center rounded-ds-large outline-hidden " +
  "data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused " +
  "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40";

/**
 * Preset colors as swatches (theme presets), ending with a button that opens ColorPicker for
 * a custom color. Each swatch is named; the name is its label and appears in the caption once selected.
 */
export function ColorSwatchPicker({ label, items, value, defaultValue, onChange, allowsCustom, description }: ColorSwatchPickerProps) {
  const { locale } = useLocale();
  const labelId = React.useId();
  const [own, setOwn] = React.useState<string | undefined>(defaultValue);
  // "" and null are "nothing chosen", in both modes: never passed on as a color React Aria cannot read.
  const current = (value !== undefined ? value : own)?.toUpperCase() || undefined;
  const same = (a: string, b: string | undefined) => !!b && tryParse(a)?.toString("hex") === tryParse(b)?.toString("hex");
  const selected = items.find((item) => same(item.value, current));
  const choose = (hex: string) => {
    const normal = tryParse(hex)?.toString("hex").toUpperCase() ?? hex;
    if (value === undefined) setOwn(normal);
    onChange?.(normal);
  };
  const isCustom = !!current && !selected;
  return (
    <div data-slot="color-swatch-picker" className="flex flex-col gap-ds-100">
      <span id={labelId} data-slot="color-swatch-picker-label" className={LABEL}>{label}</span>
      <div className="flex flex-wrap items-center gap-ds-050">
        <AriaColorSwatchPicker
          aria-labelledby={labelId}
          // Always controlled: a custom color (or none) selects no preset, instead of leaving the last one on.
          value={selected?.value ?? current ?? "#0000"}
          onChange={(color) => choose(color.toString("hex"))}
          data-slot="color-swatch-picker-list"
          className="flex flex-wrap gap-ds-050"
        >
          {items.map((item) => (
            <ColorSwatchPickerItem key={item.value} color={item.value} data-slot="color-swatch-picker-item" className={SWATCH_ITEM}>
              {({ isSelected }) => (
                <span className="relative grid place-items-center">
                  <ColorSwatch color={item.value} name={item.name} />
                  {isSelected && (
                    // The selection is a check mark on the swatch, not a ring: the ring is keyboard focus, and in a
                    // neutral theme the selected and focused colors are the same token.
                    <span data-slot="color-swatch-picker-check" className="absolute grid place-items-center" style={{ color: checkColor(item.value) }}>
                      <IconGlyph name="check" size="small" strokeWidth={2.5} />
                    </span>
                  )}
                </span>
              )}
            </ColorSwatchPickerItem>
          ))}
        </AriaColorSwatchPicker>
        {allowsCustom && (
          <DialogTrigger>
            <Button
              iconOnly
              iconBefore="plus"
              aria-label={customColorLabel(locale)}
              data-slot="color-swatch-picker-custom"
              data-selected={isCustom || undefined}
            />
            <Popover data-slot="color-swatch-picker-popover" placement="bottom start" offset={4} className={cn(POPOVER, "min-w-0 overflow-auto p-ds-200")}>
              <Dialog aria-label={customColorLabel(locale)} className="outline-hidden">
                <ColorPicker label={customColorLabel(locale)} defaultValue={current ?? items[0]?.value} onChangeEnd={choose} />
              </Dialog>
            </Popover>
          </DialogTrigger>
        )}
      </div>
      <Text data-slot="color-swatch-picker-caption" className={DESCRIPTION}>
        {[selected ? nameSelectedLabel(locale, selected.name) : isCustom ? nameSelectedLabel(locale, current!) : null, description]
          .filter(Boolean)
          .map((part, index) => (
            // "Ocean · selected. Every preset…": the selection, then the caller's note as its own sentence.
            <React.Fragment key={index}>{index > 0 && ". "}{part}</React.Fragment>
          ))}
      </Text>
    </div>
  );
}


