"use client";

import * as React from "react";
import { useLocale } from "react-aria-components";
import { Text, useChartWidth } from "recharts";

import { TICK_INSET, chartNumber, clipDirection, formattedValues, readsRightToLeft, textWidth, tickText } from "./axis-width";

/**
 * @internal The dy of a label's first line, as Recharts' Text sets it: lines stacked from the anchor (`start`, an
 * x-axis tick under the axis), centered on it (`middle`, a y-axis tick, a bar-end label), or ending at it, plus
 * the cap height (0.71em) that puts the text's middle, top or baseline there. Shared by the value ticks and the
 * bar-end labels, so both sit exactly where Recharts drew them.
 */
export function firstLineDy(lines: number, anchor: "start" | "middle" | "end" = "middle"): string {
  const em = anchor === "start" ? 0.71 : anchor === "middle" ? (1 - lines) / 2 + 0.355 : 1 - lines;
  return `${Math.round(em * 1000) / 1000}em`;
}

/** What Recharts hands a custom tick (CartesianAxis), and what the chart sets on it. */
export type ValueTickProps = {
  x?: number | string;
  y?: number | string;
  /** The room the tick has: the axis's, or the chart's own (axis-width's tickWrapWidth). */
  width?: number | string;
  height?: number | string;
  payload?: { value?: unknown };
  index?: number;
  tickFormatter?: (value: never, index: number) => React.ReactNode;
  textAnchor?: "start" | "middle" | "end" | "inherit";
  verticalAnchor?: "start" | "middle" | "end";
  fill?: string;
  stroke?: string;
  fontSize?: number | string;
  style?: React.CSSProperties;
  /**
   * The values of every tick the axis draws, as the chart predicts them (axis-width's valueAxisTicks, as it sizes
   * the axis): when one of them needs a compact figure, every tick of the axis shows one.
   */
  axisTicks?: readonly number[];
};

/**
 * @internal A value axis's tick, in place of Recharts' own Text, which wrapped a tick at any space
 * once it passed its room: at the 128px clamp "€ 150.000.000.000.000" stood as "€" over "150.000.000.000.000",
 * the figure running past the axis's edge. This one lays the tick out by the bar-end labels' rule (axis-width's
 * textUnits: a currency, a sign and a figure are one unit) and, when a unit does not fit, shows the axis's figures
 * compact and exact in the chart's locale (`tickText`), with the whole tick as the text's accessible name and hover
 * title. Pure: it measures nothing, so the server, the first render and every later one draw the same. Drawn as
 * Recharts draws a tick (a `recharts-cartesian-axis-tick-value` text with a tspan a line), so a tick that fits is
 * where and as it was; only the orientation attribute Recharts' Text passed through is not set.
 *
 * On a vertical axis, a line still wider than the room, by the estimate (a formatter's long word against a figure,
 * which no shortening may cut), is clipped to the room: the room runs from where Recharts anchors the tick, beside the
 * plot, to the axis's outer edge, so a clipped tick never stands over the plot nor past the chart's edge. Each line is
 * drawn from the room's edge where it starts to read ({@link clippedLine}), so its reading start, the currency and
 * figure a formatter writes first, stays in view, and the tick carries the whole tick as its accessible name and
 * hover title, as a shortened one does. Under the plot (a horizontal axis) nothing clips a tick, so it is at most
 * compact (axis-width's tickText): never in scientific notation nor shortened with "…".
 *
 * Every line, clipped or not, is drawn in its own reading direction, isolated ({@link LineSpan}), where Recharts
 * anchors it: "\u200f١٥٠ ترليون €" reads from the right with its "€" at its end, on the left, in the left-to-right plot.
 */
export function ValueTick({ x, y, width, height, payload, index = 0, tickFormatter, textAnchor, verticalAnchor = "middle", fill, stroke, fontSize, style, axisTicks }: ValueTickProps) {
  const { locale } = useLocale();
  const chartWidth = useChartWidth();
  const clipId = `ds-value-tick-${React.useId().replace(/[^\w-]/g, "")}`;
  if (x == null || y == null || !payload) return null;
  const format = (value: unknown, at: number) => String(typeof tickFormatter === "function" ? tickFormatter(value as never, at) : value);
  const full = format(payload.value, index);
  const room = width == null || width === "" || !Number.isFinite(Number(width)) ? Number.POSITIVE_INFINITY : Number(width);
  // The values the axis's ticks were formatted from, as the chart sized the axis from them: what proves how the
  // formatter writes its marks (axis-width's markRoles).
  const values = new Map(formattedValues(axisTicks ?? [], (value) => format(value, 0)));
  const own = chartNumber(payload.value);
  if (own !== undefined) values.set(full, own);
  // Only beside the plot (a vertical axis, anchored at its start or end) is a tick clipped: under the plot a tick's room
  // is the whole axis, not a band of its own, and only the chart's edge bounds it (it moves in from the edges, below),
  // so a tick there is at most compact, never scientific, never "…", unless it is wider than the whole chart.
  const beside = textAnchor === "start" || textAnchor === "end";
  // Under the plot the band Recharts gives the axis (its height, 30px by default) holds its lines under the 8px inset:
  // a tick that would take more is laid out wider in no more, never past the svg's bottom nor into an axis name or
  // the legend below (axis-width's linesWithin; bandLines).
  const band = Number(height);
  const maxLines = beside || !(band > 0) ? Number.POSITIVE_INFINITY : bandLines(full, band, Number(fontSize) > 0 ? Number(fontSize) : TICK_FONT);
  const edge = beside || chartWidth === undefined || !(chartWidth > 0) ? undefined : chartWidth;
  const { lines, shortened } = tickText(full, room, locale, axisTicks?.map((value) => format(value, 0)), values, beside, maxLines, edge);
  const clipped = beside && Number.isFinite(room) && Number.isFinite(Number(x)) && lines.some((line) => textWidth(line, "tabular") > room);
  // The room along the line: Recharts anchors a tick at the plot's side of it (its end on a left-hand axis, its start
  // on a right-hand one).
  const anchorX = Number(x);
  const roomStart = textAnchor === "end" ? anchorX - room : anchorX;
  const anchor = clipped ? "start" : textAnchor;
  // Under the plot, centered on its value, a tick moves in from the chart's edges just far enough to stand inside them
  // (a tick wider than its room passed the chart's edge, which Recharts' spacing, measured on other text,
  // did not prevent), by its drawn width, not the estimate (moved by the estimate, an upper bound, a
  // tick that fit stood 2–14px off its gridline): see edgeShift.
  const shift = textAnchor === "middle" && edge !== undefined && Number.isFinite(anchorX) ? edgeShift(lines, anchorX, edge, Number(fontSize) > 0 ? Number(fontSize) : TICK_FONT) : undefined;
  const lineAt = (line: string): PlacedLine => (clipped ? clippedLine(line, roomStart, room, "tabular") : placedLine(line, x, textAnchor));
  const drawX = lineAt(lines[0] ?? "").x;
  const named = shortened || clipped;
  const lineBox = (lines.length + 1) * TICK_FONT;
  return (
    <>
      {clipped && (
        <clipPath id={clipId}>
          <rect x={roomStart} y={Number(y) - lineBox} width={room} height={lineBox * 2} />
        </clipPath>
      )}
      <text
        x={drawX}
        y={y}
        width={width}
        height={height}
        stroke={stroke}
        fill={fill}
        fontSize={fontSize}
        style={shift ? { ...style, ...shift } : style}
        textAnchor={anchor}
        // Recharts' own tick's classes (its Text takes no axis classes), so a tick looks and is found as before.
        className="recharts-text recharts-cartesian-axis-tick-value"
        data-slot="chart-value-tick"
        data-shortened={shortened || undefined}
        data-clipped={clipped || undefined}
        clipPath={clipped ? `url(#${clipId})` : undefined}
        aria-label={named ? full : undefined}
      >
        {named && <title>{full}</title>}
        {lines.map((line, at) => (
          <LineSpan key={at} {...lineAt(line)} inherited={anchor} dy={at === 0 ? firstLineDy(lines.length, verticalAnchor) : "1em"}>
            {line}
          </LineSpan>
        ))}
      </text>
    </>
  );
}

type Direction = "ltr" | "rtl";
type Anchor = "start" | "middle" | "end";

/**
 * @internal A line as it is drawn: at `x`, in its own `direction`, with the `text-anchor` that, in that direction, puts
 * it where the chart anchors it. `x` as Recharts gives it (a number, or a string it passes through).
 */
export type PlacedLine = { x: number | string | undefined; direction: Direction; anchor: Anchor };

/**
 * @internal The direction a tick's or label's line reads in, from its own text (axis-width's readsRightToLeft: its
 * first letter, figure or direction mark): "rtl" for "\u200f١٥٠ ترليون €", "‏1.5E14 €", "١٥٠ ترليون"; "ltr" for
 * "€ 1.450.000", "€ 1,5 ترليون", "12 млн km / h".
 */
export function lineDirection(line: string): Direction {
  return readsRightToLeft(line) ? "rtl" : "ltr";
}

/**
 * @internal The `text-anchor` that keeps a line of this direction where `anchor` puts a line in the plot, which is laid
 * out left to right (chart-parts): a line's `start` is its left in "ltr" and its right in "rtl" (SVG 2's text-anchor:
 * the start of a text chunk is the side its direction starts from; Chromium anchors a tspan by its own direction and
 * text-anchor, checked in Chromium). So "end" (a left-hand axis's ticks, their
 * right edge at the plot) is "start" for a line read from the right, and "start" (a right-hand axis's, a bar-end label
 * running forward) is "end"; "middle" is "middle" either way.
 */
export function anchorFor(anchor: Anchor | "inherit" | undefined, direction: Direction): Anchor {
  const ltr = anchor === "end" || anchor === "middle" ? anchor : "start";
  if (direction === "ltr" || ltr === "middle") return ltr;
  return ltr === "start" ? "end" : "start";
}

/** @internal A line that is not clipped: in its own direction, where Recharts anchors it (`anchor` as the plot's left-to-right text has it). */
export function placedLine(line: string, x: number | string | undefined, anchor: Anchor | "inherit" | undefined): PlacedLine {
  const direction = lineDirection(line);
  return { x, direction, anchor: anchorFor(anchor, direction) };
}

/**
 * @internal Where a clipped line is drawn, for a value tick and a bar-end label alike: from one edge
 * of its clip, in that edge's direction, as its own isolated paragraph (`direction`, `unicode-bidi: isolate`, drawn
 * from the text's `start` anchor). The plot is laid out left to right (chart-parts), so a line that starts to read
 * from the right ("\u200f١٥٠ ترليون €xxxx") was drawn with its right-to-left run on the left and its Latin tail on the
 * right: anchored at the clip's right edge, the tail stayed in view and the figure was clipped. The direction is the
 * one in which the line's first character is drawn inside the clip (axis-width's clipDirection): "rtl" from the
 * clip's right edge for that line, "ltr" from its left edge for one that reads from the left, a right-to-left run
 * within it ("€ 1,5 ترليون xxxx") or not, and for a right-to-left mark before a left-to-right figure
 * ("\u200f1.45M €xxxx"). `start` is the clip's left edge, `width` its width.
 */
export function clippedLine(line: string, start: number, width: number, figures: "proportional" | "tabular"): PlacedLine {
  return clipDirection(line, width, figures) === "rtl" ? { x: start + width, direction: "rtl", anchor: "start" } : { x: start, direction: "ltr", anchor: "start" };
}

/**
 * @internal A tick's or label's line: every line, clipped or not, its own isolated paragraph in its own
 * direction (`direction`, `unicode-bidi: isolate`), so it reads as its text does whatever the lines around it hold:
 * "\u200f١٥٠ ترليون €" from the right, its "€" at its end on the left, where the plot's left-to-right paragraph drew
 * its "€" on the right, after "١٥٠", a figure-first reading. Its `text-anchor` is set where its direction needs another
 * than the text's (`inherited`) to stand where the text is anchored ({@link anchorFor}); a line read from the left
 * needs none, so it is drawn exactly as before.
 */
export function LineSpan({ x, direction, anchor, inherited, dy, children }: PlacedLine & { inherited: Anchor | "inherit" | undefined; dy: string; children: string }) {
  return (
    <tspan x={x} dy={dy} direction={direction} unicodeBidi="isolate" textAnchor={anchor === anchorFor(inherited, "ltr") ? undefined : anchor}>
      {children}
    </tspan>
  );
}

/** A value tick's font size in px: a line's height, as its lines stand 1em apart. */
const TICK_FONT = 11;

/**
 * @internal The style that keeps a tick centered under the plot at `x` inside the chart's edges, 0 and `edge`, by its
 * drawn width, or none where it needs none. The tick stays centered on its gridline and a CSS
 * translation, resolved by the browser against the text's own box (`transform-box: fill-box`, so 50% is half its drawn
 * width), moves it in only by what it passes an edge: `clamp(50% + 0.075em − x, 0, edge − x − 0.075em − 50%)`, 0 for a
 * tick that stands inside them. The box is centered on the gridline but for a glyph's overhang past its advance on one
 * side (at most 0.142em, Arial's "ʃʃ"; 1px for a formatted value, measured in Chromium for Geist, Arial, Noto Sans,
 * DejaVu Sans, Nimbus Sans and the system faces), which shifts the box's center by half that at most: hence 0.075em.
 * So a tick never passes an edge, and one whose box stands more than 0.075em (0.83px at 11px) inside both edges stays
 * on its gridline exactly, whatever the face; one nearer an edge moves in by at most that. Nothing is measured in
 * script: the server and the first render write the same markup. Only where its estimated width (axis-width's
 * textWidth, an upper bound) could reach that margin is the style set, so every other tick is drawn exactly as Recharts
 * drew it. A tick wider than the whole chart (none is: axis-width's tickText keeps its lines within `edge`) would stand
 * at the chart's start.
 */
export function edgeShift(lines: readonly string[], x: number, edge: number, fontSize: number = TICK_FONT): React.CSSProperties | undefined {
  const half = Math.max(0, ...lines.map((line) => textWidth(line, "tabular"))) / 2 + EDGE_OVERHANG * fontSize;
  if (x - half >= 0 && x + half <= edge) return undefined;
  const px = (value: number) => `${Math.round(value * 1000) / 1000}px`;
  return { transformBox: "fill-box", transform: `translateX(clamp(calc(50% + ${EDGE_OVERHANG}em - ${px(x)}), 0px, calc(${px(edge - x)} - ${EDGE_OVERHANG}em - 50%)))` };
}

/** Half the most a glyph's box passes its advance on one side, in em (see edgeShift). */
const EDGE_OVERHANG = 0.075;

/**
 * How far a line's box (its glyph cells: what the svg's bottom, an axis name or the legend must clear) reaches below
 * its baseline at most, in em, in any face the charts' text may be drawn in: font-independent, as
 * textWidth is. Measured in Chromium as each face's descent (its line box, wider than its ink): Geist 0.295, Noto Sans
 * 0.293, Nimbus Sans 0.271, Droid Sans Fallback 0.266, DejaVu Sans 0.236, Arial (Liberation Sans) 0.212, and Noto
 * Sans Hebrew, Armenian, Georgian and CJK 0.288–0.292, so 0.3em for those scripts; Noto Sans Arabic 0.738, Noto Naskh
 * Arabic 0.634, Noto Kufi Arabic 0.615, Noto Nastaliq Urdu 0.596, Noto Sans Syriac 0.486 and Thaana 0.424, so 0.74em
 * for a line with an Arabic-family letter; up to 1.03 for any other script (Noto Sans Siddham; Myanmar 0.86, Thai
 * 0.45, Devanagari 0.408), so 1.05em.
 */
function descentEm(text: string): number {
  if (/[\p{Script=Arabic}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}\p{Script=Hanifi_Rohingya}]/u.test(text)) return 0.74;
  if (/[^\p{Script=Latin}\p{Script=Greek}\p{Script=Cyrillic}\p{Script=Armenian}\p{Script=Georgian}\p{Script=Hebrew}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Common}\p{Script=Inherited}]/u.test(text)) return 1.05;
  return 0.3;
}

/**
 * @internal The lines an x band `band` px tall holds for this tick under the plot (the x band): its first
 * line's baseline 0.71em under the 8px inset (firstLineDy "start"), each further line 1em lower, and the last line's
 * box inside the band, so no line passes the svg's bottom, an axis name or the legend below, in any face: its descent
 * the most any face's reaches ({@link descentEm}), rounded up to a whole pixel, as Chromium rounds a face's descent at
 * the scale it draws it (so at any device pixel ratio). At least one. Recharts' default band (30px) holds one line of
 * any script at 11px (two of Latin would need 31px: 8 + 7.81 + 11 + 4).
 */
export function bandLines(text: string, band: number, fontSize: number = TICK_FONT): number {
  const first = TICK_INSET + 0.71 * fontSize;
  const descent = Math.ceil(descentEm(text) * fontSize);
  return Math.max(1, Math.floor((band - first - descent) / fontSize) + 1);
}

/**
 * @internal A category axis's tick under the plot (periods, steps), drawn as Recharts draws it, kept inside the chart:
 * Recharts centers a tick on its period, so the last one (on the plot's edge, or in a narrow band)
 * could stand past the chart's edge ("Sep" by 0.7px, a waterfall's "Closing" at 320px). It stays at Recharts' x, on
 * its band's center, and takes the value ticks' CSS clamp ({@link edgeShift})
 * where its estimated width could reach an edge: the browser moves it in by its drawn width only as far
 * as it passes the edge, so a tick that fits stays exactly centered (moved by the estimate, an upper bound, it stood
 * off its band's center) and none passes the edge. Line and area charts also give the last period the room for its
 * half (core-charts' edgeMargin), so theirs never moves.
 */
export function CategoryTick({ x, y, width, height, payload, index = 0, tickFormatter, textAnchor = "middle", verticalAnchor = "start", fill, stroke, fontSize, style }: ValueTickProps) {
  const chartWidth = useChartWidth();
  if (x == null || y == null || !payload) return null;
  const text = String(typeof tickFormatter === "function" ? tickFormatter(payload.value as never, index) : payload.value);
  const at = Number(x);
  const shift = textAnchor === "middle" && chartWidth !== undefined && chartWidth > 0 && Number.isFinite(at) ? edgeShift([text], at, chartWidth, Number(fontSize) > 0 ? Number(fontSize) : TICK_FONT) : undefined;
  const line = placedLine(text, x, textAnchor);
  return (
    <text
      x={x}
      y={y}
      width={width}
      height={height}
      stroke={stroke}
      fill={fill}
      fontSize={fontSize}
      style={shift ? { ...style, ...shift } : style}
      textAnchor={textAnchor}
      className="recharts-text recharts-cartesian-axis-tick-value"
    >
      <LineSpan {...line} inherited={textAnchor} dy={firstLineDy(1, verticalAnchor)}>
        {text}
      </LineSpan>
    </text>
  );
}

/**
 * @internal A category name beside the plot (a horizontal BarChart's regions) or around it (a RadarChart's
 * dimensions), drawn by Recharts' own Text as Recharts draws it (its own wrapping, measured), as its own isolated
 * paragraph in the name's reading direction ({@link lineDirection}), anchored where Recharts anchors it
 * ({@link anchorFor}): a name read from the right reads so, its marks and figures where it writes them,
 * in the left-to-right plot. Its lines are the one name's, in the name's direction. `polar` for a RadarChart's, which
 * Recharts classes as its angle axis's.
 */
export function NameTick({ payload, index = 0, tickFormatter, textAnchor = "middle", polar = false, ...props }: ValueTickProps & { className?: string; polar?: boolean; [prop: string]: unknown }) {
  if (!payload) return null;
  const text = String(typeof tickFormatter === "function" ? tickFormatter(payload.value as never, index) : payload.value);
  const direction = lineDirection(text);
  const className = typeof props.className === "string" ? props.className : polar ? "recharts-polar-angle-axis-tick-value" : "recharts-cartesian-axis-tick-value";
  return (
    <Text {...(props as React.ComponentProps<typeof Text>)} className={className} direction={direction} unicodeBidi="isolate" textAnchor={anchorFor(textAnchor, direction)}>
      {text}
    </Text>
  );
}

/** Where Recharts anchors a cartesian label at these positions (its getCartesianPosition, for a box of positive width). */
const LABEL_ANCHOR = { top: "middle", insideBottom: "middle", insideLeft: "start", insideBottomLeft: "start", insideRight: "end", insideBottomRight: "end" } as const;

/**
 * @internal The props that give a Recharts label (a ScatterChart's axis name, a reference line's label) its own isolated
 * direction, as {@link NameTick} gives a name: `direction` from its text ({@link lineDirection}),
 * `unicode-bidi: isolate`, and the `text-anchor` that keeps it where Recharts puts a label at `position` in the
 * left-to-right plot ({@link anchorFor}; Recharts takes a label's own `textAnchor` over the position's). A label read
 * from the left keeps the position's anchor, so it is drawn as before. Spread into the label's props.
 */
export function isolatedLabel(text: string | undefined, position: keyof typeof LABEL_ANCHOR): { direction: Direction; unicodeBidi: "isolate"; textAnchor: Anchor } {
  const direction = lineDirection(text ?? "");
  return { direction, unicodeBidi: "isolate", textAnchor: anchorFor(LABEL_ANCHOR[position], direction) };
}
