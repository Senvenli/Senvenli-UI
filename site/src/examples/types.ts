/**
 * A component's examples live in `examples/<slug>/`: an `index.ts` that lists them in order, and one file per
 * example (`<id>.tsx`) whose default export renders it. The page shows that file's source as the example's
 * code, so the code is never a second copy that can drift from what runs.
 *
 * The rule for every example: the prerendered HTML is built once and read on any later day, in any time zone.
 * So an example never reads the clock, the device zone, a random number or the viewport while rendering:
 *   - dates are fixed values (`new CalendarDate(2026, 3, 18)`, an ISO instant with its offset);
 *   - anything formatted from an instant names its `timeZone`;
 *   - "now" is passed in (`now={NOW}`), never read;
 *   - an example that must be live (today, a ticking clock) goes inside <ClientOnly> with its box reserved.
 */
export type ExampleMeta = {
  /** The file name without `.tsx`, and the anchor on the page. */
  id: string;
  /** Sentence case: "With an icon", "Disabled". */
  title: string;
  /** One line on when to reach for this variant. */
  description?: string;
};

/** What the page receives for each example: its meta and the source it shows. */
export type ExampleData = ExampleMeta & { code: string };
