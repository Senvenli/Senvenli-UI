import * as React from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { ScrollArea } from "./index";

/**
 *: a ScrollArea that fills a pane its parent sizes (a conversation's messages between the
 * header and the reply box) takes the parent's height on its root and viewport and scrolls inside it. By
 * default it still sizes to its content, up to `maxHeight`.
 */
afterEach(cleanup);

function Pane(props: Partial<React.ComponentProps<typeof ScrollArea>>) {
  return (
    <DesignSystemProvider locale="en-US" navigate={vi.fn()}>
      <div style={{ display: "grid", gridTemplateRows: "auto minmax(0, 1fr) auto", height: 400 }}>
        <header>Ana Petrović</header>
        <div style={{ minHeight: 0 }}>
          <ScrollArea aria-label="Messages" {...props}>
            <p>Hello</p>
          </ScrollArea>
        </div>
        <footer>Reply</footer>
      </div>
    </DesignSystemProvider>
  );
}

const root = () => document.querySelector<HTMLElement>('[data-slot="scroll-area"]')!;
const viewport = () => document.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]')!;

describe("ScrollArea fill", () => {
  it("sizes to its content by default", () => {
    render(<Pane maxHeight={320} />);
    expect(root().className.split(/\s+/)).not.toContain("h-full");
    expect(viewport().className.split(/\s+/)).not.toContain("h-full");
    expect(viewport().style.maxHeight).toBe("320px");
    expect(root().hasAttribute("data-fill")).toBe(false);
  });

  it("fill takes the parent's height on the root and the viewport, which keeps scrolling", () => {
    render(<Pane fill />);
    expect(root().className.split(/\s+/)).toContain("h-full");
    expect(root().className.split(/\s+/)).toContain("min-h-0");
    expect(viewport().className.split(/\s+/)).toContain("h-full");
    expect(viewport().className.split(/\s+/)).toContain("overflow-y-auto");
    expect(root().getAttribute("data-fill")).toBe("true");
  });
});
