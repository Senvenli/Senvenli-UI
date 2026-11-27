import fs from "node:fs";
import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Grid } from "./index";

afterEach(cleanup);
const here = (file: string) => new URL(file, import.meta.url);

describe("Grid responsive columns", () => {
  it("a count per viewport breakpoint, mobile-first", () => {
    render(<Grid data-testid="g" columns={{ base: 1, md: 2, xl: 4 }} space="space-200" />);
    const classes = screen.getByTestId("g").className.split(/\s+/);
    expect(classes).toEqual(expect.arrayContaining(["grid", "grid-cols-1", "md:grid-cols-2", "xl:grid-cols-4", "gap-ds-200"]));
    expect(classes.some((name) => name.startsWith("sm:") || name.startsWith("lg:"))).toBe(false);
  });

  it("base defaults to one column; a plain number is as before", () => {
    render(<Grid data-testid="a" columns={{ lg: 3 }} />);
    expect(screen.getByTestId("a").className.split(/\s+/)).toEqual(expect.arrayContaining(["grid-cols-1", "lg:grid-cols-3"]));
    cleanup();
    render(<Grid data-testid="b" columns={3} />);
    expect(screen.getByTestId("b").className).toBe("grid grid-cols-3");
  });

  it("every class is written out in the source, so Tailwind generates it", () => {
    const source = fs.readFileSync(here("./grid.tsx"), "utf8");
    for (const breakpoint of ["sm", "md", "lg", "xl"]) for (let count = 1; count <= 6; count += 1) expect(source).toContain(`"${breakpoint}:grid-cols-${count}"`);
  });
});
