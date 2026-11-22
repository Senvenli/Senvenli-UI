import fs from "node:fs";
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";

import { Form } from "../form/index";
import { DesignSystemProvider } from "../provider";
import { AuthFormLayout, AuthLayout } from "./index";

afterEach(cleanup);

// A helper, not an inline `new URL("…", import.meta.url)`: Vite rewrites that literal form into an asset URL.
const here = (file: string) => new URL(file, import.meta.url);

/**
 * Comments describe the contract; only code can break it. A guard that reads
 * its own prose passes for the wrong reason, so every source assertion below
 * runs against a stripped copy — and one test proves the stripper left the code
 * behind, because an empty haystack satisfies every "must not contain".
 */
function codeOf(file: string) {
  const source = fs.readFileSync(here(`./${file}`), "utf8");
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

describe("AuthLayout", () => {
  it("splits on its own width (a container query), and renders a div instead of main when asked", () => {
    const { container, rerender } = render(<AuthLayout>Form</AuthLayout>);
    expect(container.querySelector('[data-slot="auth-layout"]')!.className.split(/\s+/)).toContain("@container");
    const grid = container.querySelector('[data-slot="auth-layout-grid"]')!.className;
    expect(grid).toContain("@5xl:grid-cols-");
    expect(grid).not.toMatch(/(^|\s)lg:/);
    expect(container.querySelector("main[data-slot='auth-credentials']")).not.toBeNull();
    rerender(<AuthLayout credentialsElement="div">Form</AuthLayout>);
    expect(container.querySelector("main")).toBeNull();
    expect(container.querySelector("div[data-slot='auth-credentials']")).not.toBeNull();
  });

  it("brings no identity of its own — no ground, no backdrop, no motif", () => {
    const { container } = render(
      <AuthLayout brandContent={<p>Narrative</p>}>
        <p>Credentials</p>
      </AuthLayout>,
    );

    const aside = container.querySelector("aside");
    expect(aside).not.toBeNull();
    // The pane paints nothing until an app says what it should look like: no
    // background, and no motif in the footer row.
    expect(aside!.className).not.toMatch(/\bbg-/);
    expect(container.querySelector('[data-slot="auth-brand-footer"]')!.children).toHaveLength(0);
  });

  it("takes the ground and the motif from the app when they are given", () => {
    const { container } = render(
      <AuthLayout
        brandClassName="bg-primary text-primary-foreground"
        // Any motif the app brings.
        brandFooterLead={<span data-slot="brand-motif" className="w-16" />}
        brandFooter={<p>A footer line.</p>}
      >
        <p>Credentials</p>
      </AuthLayout>,
    );

    const aside = container.querySelector("aside");
    expect(aside!.className).toContain("bg-primary");
    expect(container.querySelector('[data-slot="brand-motif"]')).not.toBeNull();
  });

  it("keeps the footer row as a spacer even when it holds nothing", () => {
    const { container } = render(
      <AuthLayout brandLogo={<p>Logo</p>} brandContent={<p>Narrative</p>}>
        <p>Credentials</p>
      </AuthLayout>,
    );

    // Three children, not two: the pane is a `justify-between` column, and
    // dropping the empty row slams the narrative against the bottom edge.
    expect(container.querySelector("aside")!.children).toHaveLength(3);
  });

  it("names no product in its code", () => {
    const code = codeOf("auth-layout.tsx");
    // Non-vacuity: the stripper must leave the component behind. Without this,
    // a stripper that ate the file would make every assertion below pass.
    expect(code).toContain("export function AuthLayout");

    for (const name of ["Operations", "Admin", "storefront", "instrument"]) {
      expect(code.toLowerCase()).not.toContain(name.toLowerCase());
    }
  });
});

describe("AuthFormLayout", () => {
  it("merges the body rhythm onto the app's own form, which keeps everything else", () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());

    const { container } = render(
      <AuthFormLayout title="Welcome back">
        <form onSubmit={onSubmit} noValidate aria-busy>
          <p>Fields</p>
        </form>
      </AuthFormLayout>,
    );

    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    // The layout owns where the body sits and how the stack breathes: the gap
    // above is on the region wrapper, the stack rhythm on the form itself…
    const region = container.querySelector('[data-slot="auth-form-region"]')!;
    expect(region.className.split(/\s+/)).toEqual(["mt-ds-400"]);
    expect(form!.parentElement).toBe(region);
    expect(form!.getAttribute("data-slot")).toBe("auth-form-body");
    expect(form!.className.split(/\s+/)).toEqual(["space-y-4"]);
    // …and nothing else. The form is still a real element with its own
    // behaviour and attributes, which is the whole reason the body is rendered
    // through it rather than wrapped around it.
    expect(form!.noValidate).toBe(true);
    expect(form!.getAttribute("aria-busy")).toBe("true");
    fireEvent.submit(form!);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("merges `bodyClassName` and the form's own classes onto the form; a data-slot the form sets wins", () => {
    const { container } = render(
      <AuthFormLayout title="Welcome back" bodyClassName="space-y-6">
        <form data-slot="sign-in-form" className="grid" />
      </AuthFormLayout>,
    );

    const form = container.querySelector("form")!;
    // `bodyClassName` replaces the default rhythm; the form's own classes follow it.
    expect(form.className.split(/\s+/)).toEqual(["space-y-6", "grid"]);
    expect(form.getAttribute("data-slot")).toBe("sign-in-form");
    // The gap above is not the form's: it stays on the region wrapper.
    expect(container.querySelector('[data-slot="auth-form-region"]')!.className).toBe("mt-ds-400");
  });

  it("with a DS Form as the child, the region carries the top gap and the form is still what submits", () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());

    const { container } = render(
      <DesignSystemProvider locale="en" navigate={vi.fn()}>
        <AuthFormLayout
          title="Welcome back"
          headerSlot={<button type="button" data-testid="header">EN</button>}
          footerSlot={<a href="/forgot" data-testid="footer">Forgot your password?</a>}
        >
          <Form onSubmit={onSubmit}>
            <button type="submit">Sign in</button>
          </Form>
        </AuthFormLayout>
      </DesignSystemProvider>,
    );

    // The DS Form takes no className, so a margin merged onto it would be
    // lost: the wrapper carries the gap, whatever the child does with classes.
    const region = container.querySelector('[data-slot="auth-form-region"]')!;
    expect(region.className.split(/\s+/)).toEqual(["mt-ds-400"]);

    const form = container.querySelector("form")!;
    expect(form.parentElement).toBe(region);
    expect(container.querySelectorAll("form")).toHaveLength(1);
    // The Form keeps its own rhythm and takes no margin from the layout.
    expect(form.className).toContain("gap-ds-300");
    expect(form.className.split(/\s+/).filter((utility) => /^-?m[tby]?-/.test(utility))).toEqual([]);

    // It is still the element that submits, through its own control.
    fireEvent.click(container.querySelector('button[type="submit"]')!);
    expect(onSubmit).toHaveBeenCalledTimes(1);

    // The header and footer rows stay outside it, and outside the region.
    for (const id of ["header", "footer"]) {
      const slot = container.querySelector(`[data-testid="${id}"]`);
      expect(slot).not.toBeNull();
      expect(form.contains(slot)).toBe(false);
      expect(region.contains(slot)).toBe(false);
    }
    fireEvent.click(container.querySelector('[data-testid="header"]')!);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("defaults the heading to text-heading-large and lets a screen set its own", () => {
    const { container, rerender } = render(
      <AuthFormLayout title="Welcome back">
        <form />
      </AuthFormLayout>,
    );

    // The DS heading type style carries the size, weight and tracking: no
    // utility restates any of them.
    const byDefault = container.querySelector("h1")!.className.split(/\s+/);
    expect(byDefault).toContain("text-heading-large");
    expect(byDefault).toContain("text-ds-text");
    expect(byDefault.filter((utility) => /^(?:font-|tracking-|text-(?:xs|sm|base|lg|\d?xl)$)/.test(utility))).toEqual([]);

    rerender(
      <AuthFormLayout title="Choose a new password" titleClassName="text-heading-medium">
        <form />
      </AuthFormLayout>,
    );

    // Exactly one type style survives the merge, and it does not take the
    // color with it: a type style is a font size to the merge, not a color.
    const heading = container.querySelector("h1")!.className.split(/\s+/);
    expect(heading).toContain("text-heading-medium");
    expect(heading).not.toContain("text-heading-large");
    expect(heading).toContain("text-ds-text");
    expect(heading.filter((utility) => /^(?:font-|tracking-)/.test(utility))).toEqual([]);
  });

  it("raises the panel on `card` and lays it flat on `plain`", () => {
    const { container, rerender } = render(
      <AuthFormLayout title="Welcome back">
        <form />
      </AuthFormLayout>,
    );

    const card = container.querySelector('[data-slot="auth-card"]')!;
    expect(card.getAttribute("data-surface")).toBe("card");
    expect(card.className).toContain("rounded-2xl");

    rerender(
      <AuthFormLayout surface="plain" title="Welcome back">
        <form />
      </AuthFormLayout>,
    );

    const plain = container.querySelector('[data-slot="auth-card"]')!;
    expect(plain.getAttribute("data-surface")).toBe("plain");
    expect(plain.className).not.toContain("rounded-2xl");
    expect(plain.className).toContain("max-w-sm");
  });

  it("keeps the rows outside the body, where a control is not the form's to submit", () => {
    const { container } = render(
      <AuthFormLayout
        title="Welcome back"
        headerSlot={<span data-testid="header">EN</span>}
        logoSlot={<span data-testid="logo">Logo</span>}
        footerSlot={<span data-testid="footer">Forgot?</span>}
        noticeSlot={<span data-testid="notice">Legal</span>}
      >
        <form>
          <p>Fields</p>
        </form>
      </AuthFormLayout>,
    );

    const form = container.querySelector("form")!;
    for (const id of ["header", "logo", "footer", "notice"]) {
      const slot = container.querySelector(`[data-testid="${id}"]`);
      expect(slot).not.toBeNull();
      expect(form.contains(slot)).toBe(false);
    }
  });

  it("carries no form behaviour in either layout's code", () => {
    for (const file of ["auth-layout.tsx", "auth-form-layout.tsx"]) {
      const code = codeOf(file);
      // Non-vacuity, per file: a stripper that ate the source would make the
      // loop below pass for both of them.
      expect(code).toContain("export function Auth");

      // `useState`/`useEffect` stand in for form state; `valid` and `lock` are
      // the literals a validator or a lockout counter cannot be written
      // without, and are matched case-insensitively so `isLocked` and
      // `validate` are both caught.
      for (const banned of ["<form", "onSubmit", "useState", "useEffect", 'type="submit"']) {
        expect(code, `${file} must not carry ${banned}`).not.toContain(banned);
      }
      // Bounded at both ends of a name, not by \b. A plain \b misses
      // `lockoutSeconds` and `isLocked`, because the character after "lock" is
      // a word character in one and the character before it is a word character
      // in the other — camelCase has no word boundary in it. Matching "not
      // preceded by a letter, or capitalised" catches both spellings while
      // leaving Tailwind's `block` and `inline-block` alone, which is the one
      // false positive that would make this rule fail for the wrong reason.
      for (const banned of [/(?<![A-Za-z])validat|Validat/, /(?<![A-Za-z])lock|Lock/]) {
        expect(code, `${file} must not carry ${banned}`).not.toMatch(banned);
      }
    }
  });
});
