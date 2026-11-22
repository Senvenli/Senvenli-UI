import * as React from "react";

import { BarChart as Bars, type BarChartProps as BarsProps } from "./core-charts";
import { WaterfallChart, type WaterfallChartProps } from "./report-charts";

type Row = Record<string, unknown>;

export type BarChartWaterfallProps = WaterfallChartProps & {
  /** `waterfall`: a start, the steps up and down, and the end, each bar starting where the last one ended. */
  type: "waterfall";
};

/** `type`: `grouped` (default), `stacked`, `percent`, or `waterfall` (its own data shape: start, steps, end). */
export type BarChartProps<T extends Row> = BarsProps<T> | BarChartWaterfallProps;

/**
 * Values across categories or periods as bars: grouped, stacked or percent, in columns or rows; or a waterfall
 * from a start through its steps to the end (as Mantine's BarChart `type`).
 */
export function BarChart<T extends Row>(props: BarChartProps<T>) {
  if (props.type === "waterfall") {
    const { type: _type, ...rest } = props;
    return <WaterfallChart {...rest} />;
  }
  return <Bars {...props} />;
}
