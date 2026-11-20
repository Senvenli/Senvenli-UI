import * as React from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Button, LinkButton } from "../action/index";
import { Breadcrumbs } from "../navigation/index";
import { DIRECTIONAL_ICONS, Icon, MIRROR_IN_RTL } from "./icon";

/**
 * Icons that point along the reading direction mirror on an RTL page wherever they are drawn,
 * a Button's or LinkButton's icon included, and the components that used to flip their own chevrons now get it
 * from IconGlyph, once. Symmetric icons keep their drawing; `isDirectional` overrides either way.
 */
afterEach(cleanup);

const MIRROR = MIRROR_IN_RTL.split(" ");
const classes = (element: Element | null) => (element?.getAttribute("class") ?? "").split(/\s+/);
const mirrored = (element: Element | null) => MIRROR.every((name) => classes(element).includes(name));

function inLocale(ui: React.ReactElement) {
  return render(
    <div dir="rtl">
      <DesignSystemProvider locale="ar" navigate={vi.fn()}>{ui}</DesignSystemProvider>
    </div>,
  );
}

describe("directional icons mirror in RTL", () => {
  it("mirrors arrows and chevrons, and keeps symmetric icons as drawn", () => {
    inLocale(
      <>
        <Icon name="arrow-left" />
        <Icon name="chevron-right" />
        <Icon name="check" />
        <Icon name="package" />
      </>,
    );
    const icons = document.querySelectorAll('[data-slot="icon"]');
    expect(mirrored(icons[0])).toBe(true);
    expect(mirrored(icons[1])).toBe(true);
    expect(mirrored(icons[2])).toBe(false);
    expect(mirrored(icons[3])).toBe(false);
  });

  it("isDirectional overrides the list either way", () => {
    inLocale(
      <>
        <Icon name="arrow-left" isDirectional={false} />
        <Icon name="package" isDirectional />
      </>,
    );
    const icons = document.querySelectorAll('[data-slot="icon"]');
    expect(mirrored(icons[0])).toBe(false);
    expect(mirrored(icons[1])).toBe(true);
  });

  it("a Button's and a LinkButton's directional icon mirror with no help from the app", () => {
    inLocale(
      <>
        <Button iconOnly iconBefore="arrow-left" aria-label="رجوع" />
        <LinkButton href="/" iconBefore="arrow-left">رجوع</LinkButton>
        <Button iconBefore="plus">إضافة</Button>
      </>,
    );
    const icons = document.querySelectorAll('[data-slot="button-icon"], [data-slot="link-button-icon"]');
    expect(icons).toHaveLength(3);
    expect(mirrored(icons[0])).toBe(true);
    expect(mirrored(icons[1])).toBe(true);
    expect(mirrored(icons[2])).toBe(false);
  });

  it("a component's own chevron gets the mirror once, from IconGlyph", () => {
    inLocale(
      <Breadcrumbs items={[{ label: "الطلبات", href: "/a" }, { label: "ORD-0914" }]} />,
    );
    const separator = document.querySelector('[data-slot="breadcrumbs-separator"]');
    expect(mirrored(separator)).toBe(true);
    expect(classes(separator).filter((name) => name === "rtl:-scale-x-100")).toHaveLength(1);
  });

  it("lists the arrows a reader follows, not clocks or brand marks", () => {
    for (const name of ["arrow-left", "arrow-right", "chevron-left", "chevron-right", "undo-2", "send", "log-out"]) {
      expect(DIRECTIONAL_ICONS.has(name)).toBe(true);
    }
    for (const name of ["clock", "check", "plus", "x", "arrow-up", "arrow-down", "chevron-up", "chevron-down"]) {
      expect(DIRECTIONAL_ICONS.has(name)).toBe(false);
    }
  });
});
