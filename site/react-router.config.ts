import { readdirSync, readFileSync } from "node:fs";
import type { Config } from "@react-router/dev/config";

type IndexEntry = { name: string };

/** Every component slug, read at build time from the generated manifest index. */
const slugs = (JSON.parse(readFileSync(new URL("../packages/react/manifests/index.json", import.meta.url), "utf8")) as IndexEntry[]).map(
  (entry) => entry.name,
);

/** Every doc, from the Markdown files in content/docs. */
const docs = readdirSync(new URL("./content/docs/", import.meta.url)).filter((file) => file.endsWith(".md")).map((file) => file.replace(/\.md$/, ""));

export default {
  appDirectory: "src",
  // Overridable so the hydration check can keep a development build beside the real one.
  buildDirectory: process.env.SITE_BUILD_DIR ?? "build",
  // No runtime server: every route below becomes static files, and nginx serves them.
  ssr: false,
  prerender: {
    paths: ({ getStaticPaths }) => [
      ...getStaticPaths(), // "/", "/create", "/components", "/schema/component.full.json", "/llms.txt"
      ...slugs.flatMap((slug) => [`/components/${slug}`, `/components/${slug}.json`, `/components/${slug}.md`]),
      ...docs.flatMap((slug) => [`/docs/${slug}`, `/docs/${slug}.md`]),
      "/404", // lib/not-found-document.ts: NOT_FOUND_PATH
    ],
    concurrency: 4,
  },
} satisfies Config;
