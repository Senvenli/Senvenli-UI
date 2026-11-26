// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The release safeguards RELEASE.md relies on. 0.3.1 to 0.3.3 shipped a stale dist/ because the publish skipped the
// build; these checks keep the guards that make that impossible from being dropped by accident.
const root = fileURLToPath(new URL("../../../", import.meta.url));
const PACKAGES = ["tokens", "react", "cli", "mcp"];
const manifest = (name: string) => JSON.parse(readFileSync(`${root}packages/${name}/package.json`, "utf8"));

describe("release guards", () => {
  it.each(PACKAGES)("@senvenli/%s clears and rebuilds dist/ before it is packed or published", (name) => {
    const { scripts = {}, files = [] } = manifest(name);
    expect(scripts.build, "a build script").toBeTruthy();
    // prepack runs on `pnpm pack` and `pnpm publish`: the clean removes files whose sources are gone, then the build.
    expect(scripts.prepack, "prepack").toMatch(/rmSync\(\s*'dist'/);
    expect(scripts.prepack, "prepack").toMatch(/pnpm run build$/);
    expect(files, "dist is what is published").toContain("dist");
  });

  it("all four packages share one version", () => {
    expect(new Set(PACKAGES.map((name) => manifest(name).version)).size).toBe(1);
  });

  it("the release checklist and its post-publish verification are in place", () => {
    expect(existsSync(`${root}scripts/verify-published.sh`)).toBe(true);
    const release = readFileSync(`${root}RELEASE.md`, "utf8");
    for (const step of ["pnpm install --frozen-lockfile", "pnpm release:check", "npm whoami", "scripts/verify-published.sh"]) {
      expect(release, step).toContain(step);
    }
  });
});
