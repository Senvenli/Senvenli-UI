import { describe, expect, it } from "vitest";
import { commandsFor } from "../src/lib/package-managers";

describe("commandsFor", () => {
  it("writes an install in each manager's words", () => {
    expect(commandsFor("npm i @senvenli/react")).toEqual({
      npm: "npm i @senvenli/react",
      pnpm: "pnpm add @senvenli/react",
      yarn: "yarn add @senvenli/react",
      bun: "bun add @senvenli/react",
    });
    expect(commandsFor("npm install -D tailwindcss")!.bun).toBe("bun add -d tailwindcss");
  });

  it("writes a run-once command with dlx / bunx, dropping npx's -y", () => {
    expect(commandsFor("npx -y @senvenli/cli theme abc --tailwind")).toEqual({
      npm: "npx @senvenli/cli theme abc --tailwind",
      pnpm: "pnpm dlx @senvenli/cli theme abc --tailwind",
      yarn: "yarn dlx @senvenli/cli theme abc --tailwind",
      bun: "bunx @senvenli/cli theme abc --tailwind",
    });
  });

  it("leaves a block alone when any line is something else", () => {
    expect(commandsFor("claude mcp add senvenli-ui -- npx -y @senvenli/mcp")).toBeNull();
    expect(commandsFor("npm i @senvenli/react\ncd app")).toBeNull();
    expect(commandsFor("npm run build")).toBeNull();
  });
});
