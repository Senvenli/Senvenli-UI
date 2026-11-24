import { Icon, Kbd } from "@senvenli/react/display";
import type { ReactNode } from "react";
import { Backdrop, Btn, FieldBox, Float, IconBtn, Line, Photo, Row, Word } from "./kit";

/** A checkbox, drawn, for the rows of a table. */
function Check({ on }: { on?: boolean }) {
  return (
    <span className={`flex size-3 shrink-0 items-center justify-center rounded-ds-xsmall border ${on ? "border-ds-background-brand-bold bg-ds-background-brand-bold" : "border-ds-border-bold"}`}>
      {on && <span className="size-1 rounded-ds-full bg-ds-text-on-brand" />}
    </span>
  );
}

/**
 * Overlay, navigation and collection: all drawn. An overlay renders nothing until it opens, and the composed ones are
 * far larger than a card, so each is a small picture of itself open, in the theme's own surfaces.
 */
export const SURFACES: Record<string, ReactNode> = {
  // Overlay
  "alert-dialog": (
    <Backdrop className="items-center justify-center">
      <Float className="flex w-32 flex-col gap-ds-100 p-ds-100">
        <div className="flex items-center gap-ds-075">
          <Icon name="triangle-alert" size="small" color="danger" />
          <Line w="w-14" strong />
        </div>
        <Line />
        <div className="flex justify-end gap-ds-050">
          <Btn small>Cancel</Btn>
          <Btn danger small>
            Delete
          </Btn>
        </div>
      </Float>
    </Backdrop>
  ),
  command: (
    <Float className="flex w-40 flex-col">
      <div className="flex items-center gap-ds-075 border-b border-ds-border px-ds-100 py-ds-075">
        <Icon name="search" size="small" color="subtle" />
        <Word tone="subtlest" className="flex-1">
          Search
        </Word>
        <Kbd isModifier />
        <Kbd>K</Kbd>
      </div>
      <div className="flex flex-col p-ds-050">
        <Row selected>
          <Icon name="file-text" size="small" color="subtle" />
          <Line w="w-16" strong />
        </Row>
        <Row>
          <Icon name="settings" size="small" color="subtle" />
          <Line w="w-12" strong />
        </Row>
      </div>
    </Float>
  ),
  "context-menu": (
    <div className="relative h-24 w-36 rounded-ds-medium bg-ds-surface-sunken">
      <svg viewBox="0 0 12 12" className="absolute left-4 top-3 size-3 fill-ds-text">
        <path d="M1 1v9l2.6-2.4L5.4 11l1.6-.8-1.7-3.3H9Z" />
      </svg>
      <Float className="absolute left-7 top-6 flex w-24 flex-col p-ds-050">
        <Row selected>
          <Line w="w-10" strong />
        </Row>
        <Row>
          <Line w="w-14" strong />
        </Row>
        <Row>
          <Line w="w-8" strong />
        </Row>
      </Float>
    </div>
  ),
  dialog: (
    <Backdrop className="items-center justify-center">
      <Float className="flex w-32 flex-col gap-ds-100 p-ds-100">
        <div className="flex items-center justify-between">
          <Line w="w-14" strong />
          <Icon name="x" size="small" color="subtle" />
        </div>
        <Line />
        <Line w="w-2/3" />
        <div className="flex justify-end">
          <Btn primary small>
            Done
          </Btn>
        </div>
      </Float>
    </Backdrop>
  ),
  drawer: (
    <Backdrop className="justify-end">
      <div className="flex w-20 flex-col gap-ds-100 bg-ds-surface-overlay p-ds-100 shadow-ds-overlay">
        <div className="flex items-center justify-between">
          <Line w="w-8" strong />
          <Icon name="x" size="small" color="subtle" />
        </div>
        <Line />
        <Line w="w-3/4" />
        <span className="flex-1" />
        <Btn primary small>
          Save
        </Btn>
      </div>
    </Backdrop>
  ),
  "hover-card": (
    <div className="flex flex-col items-center gap-ds-075">
      <Word className="underline decoration-ds-border-bold underline-offset-2">@ada</Word>
      <Float className="flex w-36 items-center gap-ds-100 p-ds-100">
        <span className="size-7 shrink-0 rounded-ds-full bg-ds-background-neutral-pressed" />
        <span className="flex min-w-0 flex-1 flex-col gap-ds-075">
          <Line w="w-14" strong />
          <Line w="w-20" />
        </span>
      </Float>
    </div>
  ),
  menu: (
    <div className="flex flex-col items-end gap-ds-050">
      <IconBtn name="ellipsis" />
      <Float className="flex w-28 flex-col p-ds-050">
        <Row selected>
          <Icon name="pencil" size="small" color="subtle" />
          <Line w="w-8" strong />
        </Row>
        <Row>
          <Icon name="copy" size="small" color="subtle" />
          <Line w="w-12" strong />
        </Row>
        <span className="my-ds-025 h-px bg-ds-border" />
        <Row>
          <Icon name="trash-2" size="small" color="danger" />
          <Line w="w-10" strong />
        </Row>
      </Float>
    </div>
  ),
  popover: (
    <div className="flex flex-col items-center gap-ds-075">
      <Btn>
        Filter
        <Icon name="chevron-down" size="small" color="subtle" />
      </Btn>
      <Float className="flex w-36 flex-col gap-ds-100 p-ds-100">
        <Line w="w-10" strong />
        <FieldBox small />
        <div className="flex justify-end">
          <Btn primary small>
            Apply
          </Btn>
        </div>
      </Float>
    </div>
  ),
  toast: (
    <div className="flex h-24 w-44 items-end justify-end rounded-ds-medium bg-ds-surface-sunken p-ds-100">
      <Float className="flex items-center gap-ds-075 px-ds-100 py-ds-075">
        <Icon name="circle-check" size="small" color="success" />
        <Word>Changes saved</Word>
        <Icon name="x" size="small" color="subtle" />
      </Float>
    </div>
  ),
  tooltip: (
    <div className="flex flex-col items-center gap-ds-075">
      <span className="rounded-ds-small bg-ds-background-neutral-bold px-ds-100 py-ds-075 text-body-small leading-none text-ds-text-inverse">Copy link</span>
      <IconBtn name="link" />
    </div>
  ),

  // Navigation
  accordion: (
    <div className="flex w-40 flex-col">
      <div className="flex flex-col gap-ds-100 border-b border-ds-border py-ds-100">
        <div className="flex items-center justify-between">
          <Line w="w-16" strong />
          <Icon name="chevron-up" size="small" color="subtle" />
        </div>
        <Line />
        <Line w="w-2/3" />
      </div>
      <div className="flex items-center justify-between border-b border-ds-border py-ds-100">
        <Line w="w-20" strong />
        <Icon name="chevron-down" size="small" color="subtle" />
      </div>
      <div className="flex items-center justify-between py-ds-100">
        <Line w="w-12" strong />
        <Icon name="chevron-down" size="small" color="subtle" />
      </div>
    </div>
  ),
  "bottom-nav": (
    <div className="flex h-24 w-32 flex-col rounded-ds-medium bg-ds-surface-sunken">
      <div className="flex flex-1 flex-col gap-ds-100 p-ds-150">
        <Line w="w-10" strong />
        <Line w="w-20" />
      </div>
      <div className="flex items-center justify-around rounded-b-ds-medium bg-ds-surface-overlay py-ds-075 shadow-ds-raised">
        <Icon name="house" size="small" />
        <Icon name="search" size="small" color="subtle" />
        <Icon name="bell" size="small" color="subtle" />
        <Icon name="user" size="small" color="subtle" />
      </div>
    </div>
  ),
  breadcrumbs: (
    <div className="flex items-center gap-ds-050">
      <Word tone="subtle">Home</Word>
      <Icon name="chevron-right" size="small" color="subtle" />
      <Word tone="subtle">Projects</Word>
      <Icon name="chevron-right" size="small" color="subtle" />
      <Word>Plan</Word>
    </div>
  ),
  navbar: (
    <div className="flex h-24 w-44 flex-col rounded-ds-medium bg-ds-surface-sunken">
      <div className="flex items-center gap-ds-100 rounded-t-ds-medium bg-ds-surface-overlay px-ds-100 py-ds-075 shadow-ds-raised">
        <span className="size-3 rounded-ds-xsmall bg-ds-background-brand-bold" />
        <Line w="w-6" strong />
        <Line w="w-6" />
        <Line w="w-6" />
        <span className="flex-1" />
        <span className="size-4 rounded-ds-full bg-ds-background-neutral-pressed" />
      </div>
      <div className="flex flex-col gap-ds-100 p-ds-150">
        <Line w="w-14" strong />
        <Line w="w-28" />
      </div>
    </div>
  ),
  "page-header": (
    <div className="flex w-44 flex-col gap-ds-100">
      <div className="flex items-center gap-ds-050">
        <Icon name="chevron-left" size="small" color="subtle" />
        <Line w="w-10" />
      </div>
      <div className="flex items-center justify-between gap-ds-100">
        <span className="text-body-large font-medium leading-none text-ds-text">Orders</span>
        <Btn primary>New</Btn>
      </div>
      <Line w="w-24" />
    </div>
  ),
  pagination: (
    <div className="flex items-center gap-ds-050">
      <Icon name="chevron-left" size="small" color="subtle" />
      {["1", "2", "3"].map((page) => (
        <span
          key={page}
          className={`flex size-6 items-center justify-center rounded-ds-control-small text-body-small leading-none ${page === "2" ? "bg-ds-background-neutral text-ds-text" : "text-ds-text-subtle"}`}
        >
          {page}
        </span>
      ))}
      <Icon name="ellipsis" size="small" color="subtle" />
      <Icon name="chevron-right" size="small" />
    </div>
  ),
  sidebar: (
    <div className="flex h-24 w-40 gap-ds-050 rounded-ds-medium bg-ds-surface-sunken p-ds-050">
      <div className="flex w-16 flex-col gap-ds-025 rounded-ds-small bg-ds-surface-overlay p-ds-050">
        <Row small>
          <Line w="w-8" strong />
        </Row>
        <Row selected small>
          <Line w="w-10" strong />
        </Row>
        <Row small>
          <Line w="w-6" strong />
        </Row>
        <Row small>
          <Line w="w-9" strong />
        </Row>
      </div>
      <div className="flex flex-1 flex-col gap-ds-100 p-ds-100">
        <Line w="w-10" strong />
        <Line />
        <Line w="w-2/3" />
      </div>
    </div>
  ),
  "skip-link": (
    <div className="flex h-24 w-40 flex-col gap-ds-150 rounded-ds-medium bg-ds-surface-sunken p-ds-100">
      <span className="self-start rounded-ds-control-small border border-ds-border-focused bg-ds-surface-overlay px-ds-100 py-ds-075 text-body-small leading-none text-ds-text">
        Skip to content
      </span>
      <Line w="w-16" strong />
      <Line w="w-28" />
    </div>
  ),
  stepper: (
    <div className="flex items-center gap-ds-075">
      <span className="flex size-5 items-center justify-center rounded-ds-full bg-ds-background-brand-bold text-ds-text-on-brand">
        <Icon name="check" size="small" />
      </span>
      <span className="h-px w-6 bg-ds-background-brand-bold" />
      <span className="flex size-5 items-center justify-center rounded-ds-full border border-ds-background-brand-bold text-body-small leading-none text-ds-text">2</span>
      <span className="h-px w-6 bg-ds-border-bold" />
      <span className="flex size-5 items-center justify-center rounded-ds-full bg-ds-background-neutral text-body-small leading-none text-ds-text-subtle">3</span>
    </div>
  ),
  tabs: (
    <div className="flex w-40 flex-col gap-ds-150">
      <div className="flex gap-ds-200 border-b border-ds-border">
        <span className="-mb-px border-b-2 border-ds-text pb-ds-075">
          <Word>Overview</Word>
        </span>
        <span className="pb-ds-075">
          <Word tone="subtle">Activity</Word>
        </span>
        <span className="pb-ds-075">
          <Word tone="subtle">Files</Word>
        </span>
      </div>
      <Line />
      <Line w="w-2/3" />
    </div>
  ),

  // Collection
  "data-table": (
    <div className="flex w-44 flex-col gap-ds-075">
      <div className="flex items-center gap-ds-050">
        <FieldBox small className="flex-1">
          <Icon name="search" size="small" color="subtle" />
        </FieldBox>
        <Btn small>
          <Icon name="list-filter" size="small" />
        </Btn>
      </div>
      <div className="flex flex-col">
        <div className="flex items-center gap-ds-100 rounded-ds-small bg-ds-background-neutral px-ds-075 py-ds-075">
          <Check />
          <Line w="w-10" strong />
          <span className="flex-1" />
          <Icon name="arrow-up" size="small" color="subtle" />
          <Line w="w-6" strong />
        </div>
        {[true, false].map((on, index) => (
          <div key={index} className="flex items-center gap-ds-100 border-b border-ds-border px-ds-075 py-ds-075 last:border-b-0">
            <Check on={on} />
            <Line w={["w-14", "w-10"][index]} />
            <span className="flex-1" />
            <Line w="w-6" />
          </div>
        ))}
      </div>
    </div>
  ),
  "grid-list": (
    <div className="grid grid-cols-3 gap-ds-075">
      {[0, 1, 2].map((tile) => (
        <div key={tile} className={`flex w-12 flex-col gap-ds-075 rounded-ds-medium p-ds-050 ${tile === 1 ? "bg-ds-background-selected" : "bg-ds-surface-sunken"}`}>
          <Photo className="h-8 w-full rounded-ds-small" />
          <Line w="w-8" strong />
        </div>
      ))}
    </div>
  ),
  table: (
    <div className="flex w-44 flex-col">
      <div className="grid grid-cols-3 gap-ds-150 rounded-ds-small bg-ds-background-neutral px-ds-100 py-ds-075">
        <Line w="w-8" strong />
        <Line w="w-10" strong />
        <Line w="w-6" strong />
      </div>
      {[["w-10", "w-12", "w-8"], ["w-12", "w-8", "w-6"], ["w-8", "w-10", "w-8"]].map((row, index) => (
        <div key={index} className="grid grid-cols-3 gap-ds-150 border-b border-ds-border px-ds-100 py-ds-100 last:border-b-0">
          {row.map((width, cell) => (
            <Line key={cell} w={width} />
          ))}
        </div>
      ))}
    </div>
  ),
  tree: (
    <div className="flex w-36 flex-col gap-ds-050">
      <Row>
        <Icon name="chevron-down" size="small" color="subtle" />
        <Icon name="folder-open" size="small" color="subtle" />
        <Line w="w-10" strong />
      </Row>
      <Row selected className="ml-ds-250">
        <Icon name="file-text" size="small" color="subtle" />
        <Line w="w-12" strong />
      </Row>
      <Row className="ml-ds-250">
        <Icon name="file-text" size="small" color="subtle" />
        <Line w="w-8" strong />
      </Row>
      <Row>
        <Icon name="chevron-right" size="small" color="subtle" />
        <Icon name="folder" size="small" color="subtle" />
        <Line w="w-14" strong />
      </Row>
    </div>
  ),
};

