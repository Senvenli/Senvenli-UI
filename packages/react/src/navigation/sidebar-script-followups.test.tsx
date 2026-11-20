// @vitest-environment node
// A server context: no window, no document, as when a Server Component layout renders the head script.
import * as React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup, renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import * as navigation from "./index";
import { sidebarScript } from "./sidebar-script";

/** The script's output while it lived in the Sidebar module: it must not change. */
const BEFORE: [Parameters<typeof sidebarScript>, string][] = [
  [
    ["app-sidebar"],
    '<script data-slot="sidebar-script">(function(){var v;try{v=window.localStorage.getItem("app-sidebar")}catch(e){}if(v!=="collapsed"&&v!=="expanded"){v="expanded"}try{document.documentElement.setAttribute("data-ds-sidebar",v)}catch(e){}})();</script>',
  ],
  [
    ["app.sidebar", { defaultCollapsed: true, nonce: "n0nce" }],
    '<script nonce="n0nce" data-slot="sidebar-script">(function(){var v;try{v=window.localStorage.getItem("app.sidebar")}catch(e){}if(v!=="collapsed"&&v!=="expanded"){v="collapsed"}try{document.documentElement.setAttribute("data-ds-sidebar",v)}catch(e){}})();</script>',
  ],
  [
    ['</script><b "x">', { defaultCollapsed: false }],
    '<script data-slot="sidebar-script">(function(){var v;try{v=window.localStorage.getItem("\\u003c/script>\\u003cb \\"x\\">")}catch(e){}if(v!=="collapsed"&&v!=="expanded"){v="expanded"}try{document.documentElement.setAttribute("data-ds-sidebar",v)}catch(e){}})();</script>',
  ],
];

function sourceOf(element: React.ReactElement) {
  return (element.props as { dangerouslySetInnerHTML: { __html: string } }).dangerouslySetInnerHTML.__html;
}

type Fake = { attributes: Map<string, string>; reads: string[]; writes: string[] };

/** Runs the head script against a fake window and document, the way the browser runs it before any React. */
function runScript(source: string, storage: "missing" | "throws" | "getter-throws" | Record<string, string>, root: "ok" | "throws" = "ok") {
  const fake: Fake = { attributes: new Map(), reads: [], writes: [] };
  const localStorage = {
    getItem(key: string) {
      fake.reads.push(key);
      if (storage === "throws") throw new Error("SecurityError");
      return typeof storage === "object" ? (storage[key] ?? null) : null;
    },
    setItem(key: string) {
      fake.writes.push(key);
    },
  };
  const window = storage === "getter-throws"
    ? Object.defineProperty({}, "localStorage", { get() { throw new Error("SecurityError"); } })
    : { localStorage };
  const document = {
    documentElement: {
      setAttribute(name: string, value: string) {
        if (root === "throws") throw new Error("blocked");
        fake.attributes.set(name, value);
      },
    },
  };
  new Function("window", "document", source)(window, document);
  return fake;
}

describe("sidebarScript is server-safe", () => {
  it("its module carries no client directive", () => {
    const text = readFileSync(new URL("./sidebar-script.tsx", import.meta.url), "utf8");
    expect(text).not.toMatch(/^\s*["']use client["']/m);
  });

  it("renders in a server context: renderToString of a <head> with the script", () => {
    expect(typeof window).toBe("undefined");
    const html = renderToString(
      <html lang="en">
        <head>{sidebarScript("app-sidebar", { nonce: "abc" })}</head>
        <body />
      </html>,
    );
    expect(html).toContain('<head><script nonce="abc" data-slot="sidebar-script">');
    expect(html).toContain('getItem("app-sidebar")');
  });

  it("the package's navigation entry exports the same function, and it renders there too", () => {
    expect(navigation.sidebarScript).toBe(sidebarScript);
    expect(renderToString(<head>{navigation.sidebarScript("k")}</head>)).toContain('data-slot="sidebar-script"');
  });

  it("the output is byte-identical to the script before the move", () => {
    for (const [args, html] of BEFORE) expect(renderToStaticMarkup(sidebarScript(...args))).toBe(html);
  });
});

describe("sidebarScript run before React", () => {
  it("a stored collapsed choice sets the collapsed attribute on <html> synchronously, with no render", () => {
    const fake = runScript(sourceOf(sidebarScript("app-sidebar")), { "app-sidebar": "collapsed" });
    // Set while the script runs, before any React code: the first frame is already collapsed.
    expect(fake.attributes.get("data-ds-sidebar")).toBe("collapsed");
    expect(fake.reads).toEqual(["app-sidebar"]);
    expect(fake.writes).toEqual([]);
  });

  it("a stored expanded choice wins over defaultCollapsed", () => {
    const fake = runScript(sourceOf(sidebarScript("app-sidebar", { defaultCollapsed: true })), { "app-sidebar": "expanded" });
    expect(fake.attributes.get("data-ds-sidebar")).toBe("expanded");
  });

  it("nothing stored (or a stray value): the default, never a remembered collapse, and nothing written", () => {
    for (const storage of ["missing", { "app-sidebar": "wide" }] as const) {
      const fake = runScript(sourceOf(sidebarScript("app-sidebar")), storage);
      expect(fake.attributes.get("data-ds-sidebar")).toBe("expanded");
      expect(fake.writes).toEqual([]);
    }
    expect(runScript(sourceOf(sidebarScript("app-sidebar", { defaultCollapsed: true })), "missing").attributes.get("data-ds-sidebar")).toBe("collapsed");
  });

  it("localStorage that throws (blocked storage) is a no-op: no error, the default", () => {
    for (const storage of ["throws", "getter-throws"] as const) {
      let fake: Fake | undefined;
      expect(() => {
        fake = runScript(sourceOf(sidebarScript("app-sidebar")), storage);
      }).not.toThrow();
      expect(fake!.attributes.get("data-ds-sidebar")).toBe("expanded");
    }
  });

  it("an <html> that refuses the attribute does not throw either", () => {
    expect(() => runScript(sourceOf(sidebarScript("app-sidebar")), { "app-sidebar": "collapsed" }, "throws")).not.toThrow();
  });
});
