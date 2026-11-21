import { readFileSync } from "node:fs";
import type { Config } from "@react-router/dev/config";

type IndexEntry = { name: string };

/** Every component slug, read at build time from the generated manifest index. */
const slugs = (JSON.parse(readFileSync(new URL("../packages/react/manifests/index.json", import.meta.url), "utf8")) as IndexEntry[]).map(
  (entry) => entry.name,
);

/** Docs pages are a fixed list until the docs content lands. */
const docs = ["getting-started"];

export default {
  appDirectory: "src",
  // Overridable so the hydration check can keep a development build beside the real one.
  buildDirectory: process.env.SITE_BUILD_DIR ?? "build",
  // No runtime server: every route below becomes static files, and nginx serves them.
  ssr: false,
  prerender: {
    paths: ({ getStaticPaths }) => [
      ...getStaticPaths(), // "/", "/create", "/components", "/schema/component.full.json"
      ...slugs.flatMap((slug) => [`/components/${slug}`, `/components/${slug}.json`, `/components/${slug}.md`]),
      ...docs.map((slug) => `/docs/${slug}`),
      "/404", // lib/not-found-document.ts: NOT_FOUND_PATH
    ],
    concurrency: 4,
  },
} satisfies Config;
