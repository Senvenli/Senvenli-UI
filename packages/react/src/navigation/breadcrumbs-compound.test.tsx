import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Breadcrumb, Breadcrumbs } from "./index";

// Breadcrumbs composed from Breadcrumb children: the same trail as `items`, icons, and the fold past four levels.

afterEach(cleanup);

const wrap = (ui: React.ReactElement) => <DesignSystemProvider navigate={() => {}}>{ui}</DesignSystemProvider>;

describe("Breadcrumbs composed from parts", () => {
  it("renders the same markup as items", () => {
    const data = (
      <Breadcrumbs
        items={[
          { label: "Projects", href: "/projects", icon: "folder" },
          { label: "Redesign", href: "/projects/redesign" },
          { label: "Launch plan" },
        ]}
      />
    );
    const composed = (
      <Breadcrumbs>
        <Breadcrumb href="/projects" icon="folder">
          Projects
        </Breadcrumb>
        <Breadcrumb href="/projects/redesign">Redesign</Breadcrumb>
        <Breadcrumb>Launch plan</Breadcrumb>
      </Breadcrumbs>
    );
    expect(renderToStaticMarkup(wrap(composed))).toBe(renderToStaticMarkup(wrap(data)));
  });

  it("marks the last level as the page and folds the middle ones past four", () => {
    render(
      wrap(
        <Breadcrumbs>
          <Breadcrumb href="/a">A</Breadcrumb>
          <Breadcrumb href="/b">B</Breadcrumb>
          <Breadcrumb href="/c" textValue="C level">
            <em>C</em>
          </Breadcrumb>
          <Breadcrumb href="/d">D</Breadcrumb>
          <Breadcrumb>E</Breadcrumb>
        </Breadcrumbs>,
      ),
    );
    expect(screen.getByText("E").getAttribute("aria-current")).toBe("page");
    expect(screen.queryByText("B")).toBeNull();
    expect(document.querySelector('[data-slot="breadcrumbs-fold"]')).not.toBeNull();
  });
});
