"use client";

import * as React from "react";
import {
  Label,
  Slider as AriaSlider,
  SliderOutput,
  SliderThumb,
  SliderTrack,
  useLocale,
  type SliderProps as AriaSliderProps,
} from "react-aria-components";

import { cn } from "../utils";
import { FieldDescription } from "../form/field-parts";
import { LABEL } from "../form/styles";
import { rangeMaxLabel, rangeMinLabel } from "../i18n";
import { SLIDER_FILL, SLIDER_RAIL, SLIDER_THUMB, SLIDER_TRACK } from "./styles";

export type SliderValue = number | [number, number];

export type SliderProps<T extends SliderValue> = Omit<
  AriaSliderProps<T>,
  "children" | "className" | "style" | "orientation" | "aria-label"
> & {
  label: React.ReactNode;
  description?: React.ReactNode;
};

/** Page Up / Page Down move by ten steps (design rule); React Aria's default is a tenth of the range. */
const PAGE_STEPS = 10;

/**
 * A value or a range where the position matters more than the exact number:
 * price filters, mileage limits. The value is always shown in text, in
 * tabular figures; pair with NumberField when exact entry matters.
 */
export function Slider<T extends SliderValue>({ label, description, step = 1, ...rest }: SliderProps<T>) {
  const { locale } = useLocale();
  return (
    <AriaSlider<T> {...rest} step={step} data-slot="slider" className="group flex min-w-0 flex-col gap-ds-100">
      <div data-slot="slider-head" className="flex items-baseline justify-between gap-ds-200">
        <Label data-slot="slider-label" className={cn(LABEL, "group-data-[disabled]:text-ds-text-disabled")}>{label}</Label>
        <SliderOutput data-slot="slider-output" className="text-body-strong tabular-nums text-ds-text group-data-[disabled]:text-ds-text-disabled" />
      </div>
      <SliderTrack data-slot="slider-track" className={SLIDER_TRACK}>
        {({ state }) => {
          const range = state.values.length > 1;
          const start = range ? state.getThumbPercent(0) * 100 : 0;
          const end = state.getThumbPercent(range ? 1 : 0) * 100;
          return (
            <div
              className="contents"
              onKeyDownCapture={(event) => {
                if (event.key !== "PageUp" && event.key !== "PageDown") return;
                const thumb = (event.target as HTMLElement).closest("[data-thumb-index]");
                if (!thumb) return;
                event.preventDefault();
                event.stopPropagation();
                const index = Number(thumb.getAttribute("data-thumb-index"));
                // Same bracket as React Aria's own keyboard steps, so onChangeEnd fires.
                state.setThumbDragging(index, true);
                if (event.key === "PageUp") state.incrementThumb(index, step * PAGE_STEPS);
                else state.decrementThumb(index, step * PAGE_STEPS);
                state.setThumbDragging(index, false);
              }}
            >
              <span aria-hidden="true" data-slot="slider-rail" className={SLIDER_RAIL} />
              <span
                aria-hidden="true"
                data-slot="slider-fill"
                className={SLIDER_FILL}
                style={{ insetInlineStart: `${start}%`, insetInlineEnd: `${100 - end}%` }}
              />
              {state.values.map((_, index) => (
                <SliderThumb
                  key={index}
                  index={index}
                  data-thumb-index={index}
                  // A range names each end; one value takes the slider's label alone.
                  aria-label={range ? (index === 0 ? rangeMinLabel(locale) : rangeMaxLabel(locale)) : undefined}
                  data-slot="slider-thumb"
                  className={SLIDER_THUMB}
                />
              ))}
            </div>
          );
        }}
      </SliderTrack>
      {description && <FieldDescription>{description}</FieldDescription>}
    </AriaSlider>
  );
}
