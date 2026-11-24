import type { ReactNode } from "react";
import { Line, Word } from "./kit";

/** One drawing area for every chart: 176 × 96, so the sixteen sit on the same baseline. */
function Plot({ children, axis = true }: { children: ReactNode; axis?: boolean }) {
  return (
    <svg viewBox="0 0 176 96" className="h-24 w-44" fill="none" strokeLinecap="round" strokeLinejoin="round">
      {axis && <path d="M4 20h168M4 46h168M4 72h168" className="stroke-ds-border" strokeWidth="1" strokeDasharray="2 4" />}
      {axis && <path d="M4 92h168" className="stroke-ds-border-bold" strokeWidth="1" />}
      {children}
    </svg>
  );
}

const LEVELS = ["opacity-20", "opacity-40", "opacity-70", "opacity-100"];
/** A fixed pattern of levels, so a heatmap looks uneven without a random value. */
const level = (index: number) => LEVELS[(index * 7 + (index % 5) * 3) % 4];

/**
 * Charts: all drawn as a few SVG shapes in the theme's chart colors. The real charts measure themselves and bring
 * their own code, so sixteen of them live on one page would cost far more than the page is worth.
 */
export const CHARTS: Record<string, ReactNode> = {
  "area-chart": (
    <Plot>
      <path d="M4 70 32 52l28 10 28-28 28 12 28-22 28 6v62H4Z" className="fill-ds-chart-1 opacity-20" />
      <path d="M4 70 32 52l28 10 28-28 28 12 28-22 28 6" className="stroke-ds-chart-1" strokeWidth="2" />
    </Plot>
  ),
  "bar-chart": (
    <Plot>
      {[40, 58, 34, 70, 50, 62].map((height, index) => (
        <rect key={index} x={12 + index * 27} y={92 - height} width="16" height={height} rx="3" className="fill-ds-chart-1" />
      ))}
    </Plot>
  ),
  "bar-list": (
    <div className="flex w-40 flex-col gap-ds-100">
      {["w-full", "w-3/4", "w-1/2", "w-1/3"].map((width) => (
        <div key={width} className="flex items-center gap-ds-100">
          <span className="flex-1">
            <span className={`flex h-4 items-center rounded-ds-small bg-ds-chart-1 px-ds-075 ${width}`} />
          </span>
          <Line w="w-4" strong />
        </div>
      ))}
    </div>
  ),
  "calendar-heatmap": (
    <div className="grid grid-flow-col grid-rows-5 gap-ds-025">
      {Array.from({ length: 70 }, (_, index) => (
        <span key={index} className={`size-2 rounded-ds-xsmall bg-ds-chart-1 ${level(index)}`} />
      ))}
    </div>
  ),
  "chart-parts": (
    <div className="flex flex-col items-center gap-ds-100">
      <div className="flex items-center gap-ds-150">
        <span className="flex items-center gap-ds-050">
          <span className="size-2 rounded-ds-full bg-ds-chart-1" />
          <Word tone="subtle">Sales</Word>
        </span>
        <span className="flex items-center gap-ds-050">
          <span className="size-2 rounded-ds-full bg-ds-chart-2" />
          <Word tone="subtle">Costs</Word>
        </span>
      </div>
      <div className="flex flex-col gap-ds-075 rounded-ds-medium bg-ds-surface-overlay p-ds-100 shadow-ds-overlay">
        <Line w="w-10" strong />
        <span className="flex items-center gap-ds-075">
          <span className="size-2 rounded-ds-full bg-ds-chart-1" />
          <Line w="w-12" />
          <Line w="w-5" strong />
        </span>
        <span className="flex items-center gap-ds-075">
          <span className="size-2 rounded-ds-full bg-ds-chart-2" />
          <Line w="w-12" />
          <Line w="w-5" strong />
        </span>
      </div>
    </div>
  ),
  "composed-chart": (
    <Plot>
      {[36, 52, 30, 60, 44, 56].map((height, index) => (
        <rect key={index} x={12 + index * 27} y={92 - height} width="16" height={height} rx="3" className="fill-ds-chart-1 opacity-40" />
      ))}
      <path d="M20 40 47 30l27 20 27-30 27 14 27-18" className="stroke-ds-chart-2" strokeWidth="2" />
    </Plot>
  ),
  "donut-chart": (
    <Plot axis={false}>
      <g strokeWidth="12" strokeLinecap="butt" transform="rotate(-90 88 48)">
        <circle cx="88" cy="48" r="32" pathLength="100" strokeDasharray="44 56" className="stroke-ds-chart-1" />
        <circle cx="88" cy="48" r="32" pathLength="100" strokeDasharray="27 73" strokeDashoffset="-46" className="stroke-ds-chart-2" />
        <circle cx="88" cy="48" r="32" pathLength="100" strokeDasharray="15 85" strokeDashoffset="-75" className="stroke-ds-chart-3" />
        <circle cx="88" cy="48" r="32" pathLength="100" strokeDasharray="8 92" strokeDashoffset="-92" className="stroke-ds-chart-neutral" />
      </g>
    </Plot>
  ),
  "funnel-chart": (
    <div className="flex w-40 flex-col items-center gap-ds-050">
      {["w-full", "w-4/5", "w-3/5", "w-2/5"].map((width, index) => (
        <span key={width} className={`h-4 rounded-ds-small bg-ds-chart-1 ${width} ${LEVELS[3 - index]}`} />
      ))}
    </div>
  ),
  "gauge-chart": (
    <Plot axis={false}>
      <path d="M36 76a52 52 0 0 1 104 0" pathLength="100" className="stroke-ds-background-neutral-pressed" strokeWidth="10" />
      <path d="M36 76a52 52 0 0 1 104 0" pathLength="100" strokeDasharray="68 100" className="stroke-ds-chart-1" strokeWidth="10" />
      <rect x="72" y="62" width="32" height="6" rx="3" className="fill-ds-text-subtlest" />
    </Plot>
  ),
  heatmap: (
    <div className="grid grid-cols-7 gap-ds-050">
      {Array.from({ length: 28 }, (_, index) => (
        <span key={index} className={`h-4 w-5 rounded-ds-xsmall bg-ds-chart-1 ${level(index + 3)}`} />
      ))}
    </div>
  ),
  "line-chart": (
    <Plot>
      <path d="M4 66 32 50l28 8 28-26 28 10 28-20 28 8" className="stroke-ds-chart-1" strokeWidth="2" />
      <path d="M4 80 32 72l28 4 28-16 28 6 28-4 28-10" className="stroke-ds-chart-2" strokeWidth="2" />
    </Plot>
  ),
  "radar-chart": (
    <Plot axis={false}>
      <path d="M88 6 128 35 113 82H63L48 35Z M88 27 108 41.500 100.500 65H75.500L68 41.500Z" className="stroke-ds-border-bold" strokeWidth="1" />
      <path d="M88 48V6M88 48l40-13M88 48l25 34M88 48 63 82M88 48 48 35" className="stroke-ds-border" strokeWidth="1" />
      <path d="M88 16 118 38 103 68 70 73 60 39Z" className="fill-ds-chart-1 opacity-20" />
      <path d="M88 16 118 38 103 68 70 73 60 39Z" className="stroke-ds-chart-1" strokeWidth="2" />
    </Plot>
  ),
  "radial-chart": (
    <Plot axis={false}>
      <g strokeWidth="7" transform="rotate(-90 88 48)">
        <circle cx="88" cy="48" r="38" className="stroke-ds-background-neutral" />
        <circle cx="88" cy="48" r="38" pathLength="100" strokeDasharray="78 100" className="stroke-ds-chart-1" />
        <circle cx="88" cy="48" r="27" className="stroke-ds-background-neutral" />
        <circle cx="88" cy="48" r="27" pathLength="100" strokeDasharray="56 100" className="stroke-ds-chart-2" />
        <circle cx="88" cy="48" r="16" className="stroke-ds-background-neutral" />
        <circle cx="88" cy="48" r="16" pathLength="100" strokeDasharray="34 100" className="stroke-ds-chart-3" />
      </g>
    </Plot>
  ),
  "scatter-chart": (
    <Plot>
      {[[20, 74], [36, 60], [50, 66], [64, 48], [80, 54], [96, 36], [112, 44], [128, 26], [148, 30], [160, 16]].map(([cx, cy]) => (
        <circle key={cx} cx={cx} cy={cy} r="3.5" className="fill-ds-chart-1" />
      ))}
      {[[30, 82], [58, 78], [90, 68], [120, 64], [150, 52]].map(([cx, cy]) => (
        <circle key={cx} cx={cx} cy={cy} r="3.5" className="fill-ds-chart-2" />
      ))}
    </Plot>
  ),
  sparkline: (
    <div className="flex items-center gap-ds-150">
      <span className="text-body-large font-medium leading-none text-ds-text tabular-nums">128</span>
      <svg viewBox="0 0 80 24" className="h-6 w-20" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 18 13 14l11 4 11-9 11 3 11-7 11 2 8-3" className="stroke-ds-chart-1" strokeWidth="2" />
      </svg>
    </div>
  ),
  tracker: (
    <div className="flex items-center gap-ds-025">
      {Array.from({ length: 24 }, (_, index) => (
        <span
          key={index}
          className={`h-7 w-1 rounded-ds-full ${index === 9 ? "bg-ds-background-danger-bold" : index === 16 || index === 17 ? "bg-ds-background-warning-bold" : "bg-ds-background-success-bold"}`}
        />
      ))}
    </div>
  ),
};
