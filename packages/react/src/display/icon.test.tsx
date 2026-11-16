import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { iconNames, type IconName } from "lucide-react/dynamic";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createTheme, toCSS } from "@senvenli/tokens";
import { Icon } from "./index";
import { resolveIcon } from "./icon";

afterEach(cleanup);

const here = (file: string) => new URL(file, import.meta.url);
const theme = toCSS(createTheme(), { tailwind: true });
const classesOf = (element: Element | null) => element?.getAttribute("class") ?? "";

describe("Icon", () => {
  it("draws any Lucide icon on the first render, with no loading state", () => {
    render(
      <>
        <Icon name="chevron-down" />
        <Icon name="car-front" size="large" />
      </>,
    );
    for (const name of ["chevron-down", "car-front"]) {
      const icon = document.querySelector(`[data-icon="${name}"]`);
      expect(icon?.tagName.toLowerCase(), name).toBe("svg");
    }
    expect(classesOf(document.querySelector('[data-icon="car-front"]'))).toContain("size-ds-icon-large");
  });

  it("resolves every Lucide name to a shipped icon", () => {
    const missing = iconNames.filter((name) => !resolveIcon(name));
    expect(missing).toEqual([]);
    expect(iconNames.length).toBeGreaterThan(1500);
  });

  it("is decorative without a label and an image with one", () => {
    render(
      <>
        <Icon name="check" />
        <Icon name="shield-check" label="Full coverage included" />
      </>,
    );
    expect(document.querySelector('[data-icon="check"]')?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByRole("img", { name: "Full coverage included" }).tagName.toLowerCase()).toBe("svg");
  });

  it("has an alias table that matches the installed lucide-react", () => {
    const fresh = execFileSync(process.execPath, [here("../../scripts/build-icon-aliases.mjs").pathname, "--stdout"], { encoding: "utf8" });
    expect(fresh).toBe(fs.readFileSync(here("./icon-aliases.ts"), "utf8"));
  });

  it("keeps the lucide-react peer range on the major the name table was built from", () => {
    const manifest = JSON.parse(fs.readFileSync(here("../../package.json"), "utf8")) as { peerDependencies: Record<string, string> };
    const built = /lucide-react (\d+)\./.exec(fs.readFileSync(here("./icon-aliases.ts"), "utf8"))?.[1];
    expect(manifest.peerDependencies["lucide-react"]).toBe("^1.34.0");
    expect(manifest.peerDependencies["lucide-react"].startsWith(`^${built}.`)).toBe(true);
  });

  it("never resolves a name to a non-icon export of lucide-react", () => {
    for (const name of ["icon", "create-lucide-icon", "lucide-provider", "icons", "constructor", "__proto__", "to-string", "has-own-property", "value-of", "prototype"]) {
      expect(resolveIcon(name as IconName), name).toBeUndefined();
    }
  });

  it("keeps the box for a name Lucide does not have, and says so once", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <>
        <Icon name={"not-an-icon" as IconName} size="large" />
        <Icon name={"not-an-icon" as IconName} />
      </>,
    );
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
    const box = document.querySelector('[data-icon="not-an-icon"][class*="size-ds-icon-large"]');
    expect(box?.hasAttribute("data-missing")).toBe(true);
    expect(classesOf(box)).toContain("size-ds-icon-large");
  });

  it("maps sizes and colours to tokens that exist", () => {
    render(
      <>
        {(["small", "default", "large"] as const).map((size) => <Icon key={size} name="x" size={size} />)}
        {(["default", "subtle", "brand", "danger", "warning", "success", "information"] as const).map((color) => (
          <Icon key={color} name="check" color={color} />
        ))}
      </>,
    );
    const utilities = Array.from(document.querySelectorAll("[data-icon]")).flatMap((element) => classesOf(element).split(/\s+/));
    for (const utility of utilities) {
      const size = /^size-(ds-[a-z-]+)$/.exec(utility);
      if (size) expect(theme, utility).toContain(`--spacing-${size[1]}:`);
      const color = /^text-(ds-[a-z-]+)$/.exec(utility);
      if (color) expect(theme, utility).toContain(`--color-${color[1]}:`);
    }
  });


});

describe("server components", () => {
  it("keeps the icon types in a module without \"use client\"", () => {
    const source = fs.readFileSync(here("./icon-names.ts"), "utf8");
    expect(source).not.toMatch(/^\s*["']use client["']/m);
  });

  it("uses Lucide's own names, not aliases, for the design system's marks", () => {
    const aliases = fs.readFileSync(here("./icon-aliases.ts"), "utf8");
    const used = new Set<string>();
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(file);
        else if (/\.tsx$/.test(entry.name) && !/\.test\.tsx$/.test(entry.name)) {
          for (const match of fs.readFileSync(file, "utf8").matchAll(/name=(?:\{[^}]*?)?"([a-z0-9-]+)"/g)) used.add(match[1]);
        }
      }
    };
    walk(here("..").pathname);
    expect([...used].filter((name) => aliases.includes(`"${name}":`))).toEqual([]);
  });
});

describe("one way in to Lucide", () => {
  it("imports lucide-react only inside display/icon.tsx (types from lucide-react/dynamic only)", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(file);
        else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) && /["']lucide-react(\/[^"']*)?["']/.test(fs.readFileSync(file, "utf8")))
          offenders.push(file);
      }
    };
    walk(here("..").pathname);
    // icon-names.ts only imports the IconName type from lucide-react/dynamic.
    expect(offenders.map((file) => path.basename(file)).sort()).toEqual(["icon-names.ts", "icon.tsx"]);
  });
});
