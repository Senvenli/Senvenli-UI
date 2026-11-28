"use client";

import * as React from "react";
import { useLocale } from "react-aria-components";
import { ResponsiveContainer, Sankey, type SankeyLinkProps, type SankeyNodeProps } from "recharts";

import { cn } from "../utils";
import { chartFromLabel, chartToLabel, chartValueLabel } from "../i18n";
import type { TableColumn } from "../collection/table";
import { useChartDirection, type ChartTableProps, type ChartValueFormatter } from "./chart-parts";
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

  const renderNode = (props: SankeyNodeProps) => {
    const { x, y, width, height: h, index } = props;
    placed.current[index] = { index, x, y, height: h };
    // Labels outside the bar: after it, or before it for the last column (it has no room after).
    // From our own links: a node with nothing going out ends a path (Recharts' own link lists are named the other way round).
    const last = outOf(index).length === 0;
    const tx = last ? x - 6 : x + width + 6;
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
        className="outline-hidden [&:focus-visible>rect]:stroke-ds-border-focused [&:focus-visible>rect]:[stroke-width:2]"
        onFocus={() => {
          setFocused(index);
          setActive(index);
        }}
        onBlur={() => setActive(null)}
        onMouseEnter={() => setActive(index)}
        onMouseLeave={() => setActive(null)}
      >
        <rect x={x} y={y} width={width} height={Math.max(1, h)} rx={2} fill="var(--ds-chart-1)" />
        <text
          x={tx}
          y={y + h / 2}
          dy="0.35em"
          textAnchor={last ? "end" : "start"}
          fontSize={11}
          fill="var(--ds-text-subtle)"
          // A halo in the card's color keeps the label readable over any band, lit or not.
          stroke="var(--ds-surface-raised)"
          strokeWidth={3}
          strokeLinejoin="round"
          paintOrder="stroke"
          // Mirrored with the plot in RTL, then turned back so it reads the right way round.
          transform={isRtl ? `translate(${2 * tx},0) scale(-1,1)` : undefined}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          <tspan fill="var(--ds-text)">{data.nodes[index]!.name}</tspan>
          <tspan dx={4}>{valueFormatter(totalOf(index))}</tspan>
        </text>
      </g>
    );
  };

  const renderLink = (props: SankeyLinkProps) => {
    const { sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, index } = props;
    // The link's own entry gives its two ends by position (Recharts' node objects carry no index).
    const ends = data.links[index];
    const touchesLit = lit !== null && ends !== undefined && (ends.source === lit || ends.target === lit);
    return (
      <path
        key={`link-${index}`}
        data-slot="flow-link"
        data-lit={touchesLit || undefined}
        d={`M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
        fill="none"
        stroke="var(--ds-chart-1)"
        strokeWidth={Math.max(1, linkWidth)}
        strokeOpacity={lit === null ? 0.22 : touchesLit ? 0.5 : 0.08}
        className="transition-[stroke-opacity] duration-(--ds-duration-fast) motion-reduce:transition-none"
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
            nodeWidth={10}
            nodePadding={18}
            linkCurvature={0.5}
            iterations={32}
            // Labels stand inside the plot (after a bar, or before the last column's), so the edges need no room.
            margin={{ top: 8, bottom: 8, left: 8, right: 8 }}
            node={renderNode}
            link={renderLink}
          />
        </ResponsiveContainer>
      </div>
    </Shell>
  );
}
