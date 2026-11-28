"use client";

import * as React from "react";
import { useLocale } from "react-aria-components";
import { ResponsiveContainer, Sankey, type SankeyLinkProps, type SankeyNodeProps } from "recharts";

import { cn } from "../utils";
import { chartFromLabel, chartToLabel, chartValueLabel } from "../i18n";
import type { TableColumn } from "../collection/table";
import { chartColor, useChartDirection, type ChartTableProps, type ChartValueFormatter } from "./chart-parts";
import { Shell, useOnce } from "./more-charts";

export type FlowNode = {
  /** Stable key the links point to ("pricing"). */
  id: string;
  /** What the node is called on the chart and in the table ("Pricing page"). */
  label: string;
};

export type FlowLink = {
  /** The `id` of the node the flow leaves. */
  source: string;
  /** The `id` of the node the flow reaches. */
  target: string;
  /** How many go this way; zero or less is left out. */
  value: number;
};

export type FlowChartProps = ChartTableProps & {
  /** What the chart shows, over it; leave it out when a card or a heading already says so. */
  title?: string;
  /** Names the chart when it has no visible `title`. */
  "aria-label"?: string;
  period?: string;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  /** The plot's height in px; 320 by default. */
  height?: number;
  /** The steps of the journey; a node no link reaches is left out. */
  nodes: readonly FlowNode[];
  /** The flows between steps. They must not loop back (a node never leads to itself through others). */
  links: readonly FlowLink[];
  valueFormatter?: ChartValueFormatter;
};

type Placed = { index: number; x: number; y: number; height: number };

const plain: ChartValueFormatter = (value) => String(value);

/** Whether the links loop back on themselves: a flow chart is drawn left to right, so it cannot show a cycle. */
function hasCycle(count: number, edges: readonly { source: number; target: number }[]) {
  const out = Array.from({ length: count }, () => [] as number[]);
  for (const edge of edges) out[edge.source]!.push(edge.target);
  const state = new Array<0 | 1 | 2>(count).fill(0);
  const visit = (node: number): boolean => {
    if (state[node] === 1) return true;
    if (state[node] === 2) return false;
    state[node] = 1;
    const looped = out[node]!.some(visit);
    state[node] = 2;
    return looped;
  };
  return Array.from({ length: count }, (_, node) => node).some(visit);
}

/**
 * How many move from step to step (pages to signup, plan to plan): nodes in columns, links as bands whose width is
 * their count. Recharts lays it out; the marks are drawn here so every node is reachable: one tab stop, the arrow keys
 * move along a column (up and down) and to the next or previous column (mirrored in RTL), and the focused or hovered
 * node lights its own flows. Each node is named with its count and where it leads; the table lists every flow.
 */
export function FlowChart({
  title,
  "aria-label": ariaLabel,
  period,
  isLoading,
  emptyState,
  height = 320,
  nodes,
  links,
  valueFormatter = plain,
  ...table
}: FlowChartProps) {
  const { locale } = useLocale();
  const { isRtl } = useChartDirection();
  const indexOf = React.useMemo(() => new Map(nodes.map((node, index) => [node.id, index])), [nodes]);
  const usable = links.filter((link) => indexOf.has(link.source) && indexOf.has(link.target) && link.source !== link.target && Number.isFinite(link.value) && link.value > 0);
  const edges = usable.map((link) => ({ source: indexOf.get(link.source)!, target: indexOf.get(link.target)!, value: link.value }));
  const cyclic = hasCycle(nodes.length, edges);
  useOnce(usable.length < links.length, "FlowChart: links to unknown nodes, to themselves or without a positive value are left out.");
  useOnce(cyclic, "FlowChart: the links loop back; a flow chart cannot draw a cycle, so nothing is drawn (the table still lists them).");
  // Only nodes some link touches take part; Recharts would draw the rest as empty columns.
  const touched = new Set(edges.flatMap((edge) => [edge.source, edge.target]));
  const kept = nodes.map((_, index) => index).filter((index) => touched.has(index));
  const remap = new Map(kept.map((index, position) => [index, position]));
  const data = {
    nodes: kept.map((index) => ({ name: nodes[index]!.label })),
    links: edges.map((edge) => ({ source: remap.get(edge.source)!, target: remap.get(edge.target)!, value: edge.value })),
  };
  const outOf = (position: number) => data.links.filter((link) => link.source === position);
  const inTo = (position: number) => data.links.filter((link) => link.target === position);
  const totalOf = (position: number) => Math.max(outOf(position).reduce((sum, link) => sum + link.value, 0), inTo(position).reduce((sum, link) => sum + link.value, 0));
  const nameOf = (position: number) => {
    const node = data.nodes[position]!;
    const leads = outOf(position).map((link) => `${data.nodes[link.target]!.name} ${valueFormatter(link.value)}`);
    return [`${node.name}: ${valueFormatter(totalOf(position))}`, leads.length ? `${chartToLabel(locale)} ${leads.join(", ")}` : ""].filter(Boolean).join(". ");
  };

  // Where Recharts placed each node, read while it draws: the arrow keys move by these positions.
  const placed = React.useRef<Placed[]>([]);
  const [focused, setFocused] = React.useState(0);
  const [active, setActive] = React.useState<number | null>(null);
  const marks = React.useRef<(SVGGElement | null)[]>([]);
  const current = Math.min(focused, Math.max(0, data.nodes.length - 1));
  const lit = active;

  const move = (from: number, key: string): number | undefined => {
    const all = placed.current.filter(Boolean);
    const here = all.find((node) => node.index === from);
    if (!here) return undefined;
    const column = all.filter((node) => Math.abs(node.x - here.x) < 1).sort((a, b) => a.y - b.y);
    const at = column.findIndex((node) => node.index === from);
    const forward = isRtl ? "ArrowLeft" : "ArrowRight";
    const back = isRtl ? "ArrowRight" : "ArrowLeft";
    if (key === "ArrowDown") return column[at + 1]?.index;
    if (key === "ArrowUp") return column[at - 1]?.index;
    if (key === forward || key === back) {
      // The nearest node in the next column over, by height.
      const xs = [...new Set(all.map((node) => Math.round(node.x)))].sort((a, b) => a - b);
      const next = xs[xs.indexOf(Math.round(here.x)) + (key === forward ? 1 : -1)];
      if (next === undefined) return undefined;
      return all.filter((node) => Math.round(node.x) === next).sort((a, b) => Math.abs(a.y - here.y) - Math.abs(b.y - here.y))[0]?.index;
    }
    if (key === "Home") return column[0]?.index;
    if (key === "End") return column[column.length - 1]?.index;
    return undefined;
  };

  // Each node keeps one palette color (the brand first); its outgoing flows take it, so a source's flows read together.
  const colorOf = (position: number) => chartColor(position);
  const related = (position: number) =>
    lit === null || position === lit || data.links.some((link) => (link.source === lit && link.target === position) || (link.target === lit && link.source === position));

  const renderNode = (props: SankeyNodeProps) => {
    const { x, y, width, height: h, index } = props;
    placed.current[index] = { index, x, y, height: h };
    // Labels outside the bar: after it, or before it for the last column (from our own links: a node with nothing
    // going out ends a path; Recharts' own link lists are named the other way round).
    const last = outOf(index).length === 0;
    const tx = last ? x - 8 : x + width + 8;
    const twoLines = h >= 30;
    const mirror = isRtl ? `translate(${2 * tx},0) scale(-1,1)` : undefined;
    const halo = { stroke: "var(--ds-surface-raised)", strokeWidth: 2, strokeOpacity: 0.7, strokeLinejoin: "round" as const, paintOrder: "stroke" as const };
    return (
      <g
        key={`node-${index}`}
        ref={(element) => {
          marks.current[index] = element;
        }}
        role="img"
        aria-label={nameOf(index)}
        tabIndex={index === current ? 0 : -1}
        data-slot="flow-node"
        data-active={lit === index || undefined}
        className="group/node outline-hidden"
        onFocus={() => {
          setFocused(index);
          setActive(index);
        }}
        onBlur={() => setActive(null)}
        onMouseEnter={() => setActive(index)}
        onMouseLeave={() => setActive(null)}
      >
        {/* The focus ring stands 2px off the thin bar, so it reads on a 6px pill. */}
        <rect
          aria-hidden
          x={x - 3}
          y={y - 3}
          width={width + 6}
          height={Math.max(1, h) + 6}
          rx={6}
          fill="none"
          className="stroke-transparent [stroke-width:2] group-focus-visible/node:stroke-ds-border-focused"
        />
        <rect
          x={x}
          y={y}
          width={width}
          height={Math.max(1, h)}
          rx={Math.min(3, width / 2)}
          fill={colorOf(index)}
          opacity={related(index) ? 1 : 0.4}
          className="transition-opacity duration-(--ds-duration-fast) motion-reduce:transition-none"
        />
        {/* The label is never dimmed: it stays readable while another step is lit. */}
        <text x={tx} y={y + h / 2} textAnchor={last ? "end" : "start"} transform={mirror} style={{ fontVariantNumeric: "tabular-nums" }}>
          <tspan x={tx} dy={twoLines ? "-0.25em" : "0.35em"} fontSize={12} fontWeight={500} fill="var(--ds-text)" {...halo}>
            {data.nodes[index]!.name}
          </tspan>
          <tspan x={twoLines ? tx : undefined} dx={twoLines ? undefined : 6} dy={twoLines ? "1.25em" : undefined} fontSize={11} fill="var(--ds-text-subtle)" {...halo}>
            {valueFormatter(totalOf(index))}
          </tspan>
        </text>
      </g>
    );
  };

  const renderLink = (props: SankeyLinkProps) => {
    const { sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, index } = props;
    // The link's own entry gives its two ends by position (Recharts' node objects carry no index).
    const ends = data.links[index];
    const touchesLit = lit !== null && ends !== undefined && (ends.source === lit || ends.target === lit);
    const state = lit === null ? "rest" : touchesLit ? "lit" : "dim";
    // A filled ribbon (top edge out, bottom edge back) 2px off each node, so bands never butt into the bars.
    const half = Math.max(0.5, linkWidth / 2);
    const x0 = sourceX + 2;
    const x1 = targetX - 2;
    const d =
      `M${x0},${sourceY - half} C${sourceControlX},${sourceY - half} ${targetControlX},${targetY - half} ${x1},${targetY - half}` +
      ` L${x1},${targetY + half} C${targetControlX},${targetY + half} ${sourceControlX},${sourceY + half} ${x0},${sourceY + half} Z`;
    return (
      <path
        key={`link-${index}`}
        data-slot="flow-link"
        data-lit={touchesLit || undefined}
        data-state={state}
        d={d}
        fill={ends ? colorOf(ends.source) : "var(--ds-chart-1)"}
        stroke="none"
        className={cn(
          "transition-[fill-opacity] duration-(--ds-duration-fast) motion-reduce:transition-none",
          "[fill-opacity:0.16] dark:[fill-opacity:0.22]",
          "data-[state=lit]:[fill-opacity:0.4] dark:data-[state=lit]:[fill-opacity:0.45]",
          "data-[state=dim]:[fill-opacity:0.06] dark:data-[state=dim]:[fill-opacity:0.06]",
        )}
      />
    );
  };

  const rows = usable.map((link, position) => ({ id: position, from: nodes[indexOf.get(link.source)!]!.label, to: nodes[indexOf.get(link.target)!]!.label, value: link.value }));
  const columns: TableColumn<(typeof rows)[number]>[] = [
    { key: "from", header: chartFromLabel(locale), isRowHeader: true },
    { key: "to", header: chartToLabel(locale) },
    { key: "value", header: chartValueLabel(locale), align: "end", render: (row) => valueFormatter(row.value) },
  ];

  return (
    <Shell table={table} title={title} aria-label={ariaLabel} period={period} isLoading={isLoading} emptyState={emptyState} isEmpty={data.links.length === 0 || cyclic} height={height} columns={columns} rows={rows}>
      <div
        role="group"
        aria-label={title ?? ariaLabel}
        data-slot="flow-chart"
        className={cn("h-full w-full", isRtl && "-scale-x-100")}
        onKeyDown={(event) => {
          const next = move(current, event.key);
          if (next === undefined) return;
          event.preventDefault();
          setFocused(next);
          marks.current[next]?.focus();
        }}
      >
        <ResponsiveContainer width="100%" height={height}>
          <Sankey
            data={data}
            nodeWidth={6}
            nodePadding={24}
            linkCurvature={0.5}
            iterations={32}
            // Labels stand inside the plot (after a bar, or before the last column's), so the edges need no room.
            margin={{ top: 12, bottom: 12, left: 8, right: 8 }}
            node={renderNode}
            link={renderLink}
          />
        </ResponsiveContainer>
      </div>
    </Shell>
  );
}
