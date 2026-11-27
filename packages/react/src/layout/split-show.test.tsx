import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";

import { Split, SplitPane, SplitShow } from "./index";

afterEach(cleanup);

it("SplitShow follows its Split's own collapse width, on the Split's named container, and adds no box", () => {
  render(
    <Split collapseBelow="64rem" hideOnNarrow="start">
      <SplitPane>Brand</SplitPane>
      <SplitPane>
        <SplitShow when="stacked">Compact brand</SplitShow>
        <SplitShow when="side-by-side">Wide only</SplitShow>
      </SplitPane>
    </Split>,
  );
  const root = document.querySelector('[data-slot="split"]')!;
  expect(root.className).toContain("[container-name:split]");
  const stacked = screen.getByText("Compact brand");
  expect(stacked.getAttribute("data-when")).toBe("stacked");
  expect(stacked.className.split(" ")).toEqual(["contents", "@5xl/split:hidden"]);
  expect(screen.getByText("Wide only").className.split(" ")).toEqual(["hidden", "@5xl/split:contents"]);
});

it("outside a Split it always shows, with no wrapper", () => {
  render(<SplitShow when="stacked"><span>Alone</span></SplitShow>);
  expect(screen.getByText("Alone").parentElement!.getAttribute("data-slot")).not.toBe("split-show");
});
