import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Accordion, Disclosure } from "./index";

// Accordion composed from Disclosures: the same markup as `items`, the Accordion's heading level and one open at a time.

afterEach(cleanup);

const wrap = (ui: React.ReactElement) => <DesignSystemProvider>{ui}</DesignSystemProvider>;

describe("Accordion composed from Disclosures", () => {
  it("renders the same markup as items", () => {
    const strip = (html: string) => html.replace(/(id|aria-labelledby|aria-controls)="[^"]*"/g, "");
    const data = (
      <Accordion
        headingLevel={2}
        defaultExpandedKeys={["a"]}
        items={[
          { id: "a", title: "First", content: "One" },
          { id: "b", title: "Second", content: "Two" },
        ]}
      />
    );
    const composed = (
      <Accordion headingLevel={2} defaultExpandedKeys={["a"]}>
        <Disclosure id="a" title="First">
          One
        </Disclosure>
        <Disclosure id="b" title="Second">
          Two
        </Disclosure>
      </Accordion>
    );
    expect(strip(renderToStaticMarkup(wrap(composed)))).toBe(strip(renderToStaticMarkup(wrap(data))));
  });

  it("gives its heading level to the Disclosures and opens one at a time", () => {
    render(
      wrap(
        <Accordion headingLevel={4}>
          <Disclosure id="a" title="First">
            One
          </Disclosure>
          <Disclosure id="b" title="Second" headingLevel={5}>
            Two
          </Disclosure>
        </Accordion>,
      ),
    );
    expect(screen.getByRole("heading", { name: "First" }).tagName).toBe("H4");
    expect(screen.getByRole("heading", { name: "Second" }).tagName).toBe("H5");
    const first = screen.getByRole("button", { name: "First" });
    const second = screen.getByRole("button", { name: "Second" });
    fireEvent.click(first);
    expect(first.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(second);
    expect(second.getAttribute("aria-expanded")).toBe("true");
    expect(first.getAttribute("aria-expanded")).toBe("false");
  });

  it("lets a Disclosure take its own motion setting", () => {
    render(
      wrap(
        <Disclosure title="Alone" motion="none">
          Body
        </Disclosure>,
      ),
    );
    expect(screen.getByRole("button", { name: "Alone" }).closest("[data-ds-motion]")?.getAttribute("data-ds-motion")).toBe("none");
  });
});
