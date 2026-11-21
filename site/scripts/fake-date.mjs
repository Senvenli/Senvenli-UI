// Preload for the skew check only: `NODE_OPTIONS="--import ./scripts/fake-date.mjs" TZ=Pacific/Auckland`.
// It pins the build's clock to another month, so a page that reads "now" while prerendering shows it:
// the HTML then differs from what a browser renders today, and hydration reports the mismatch.
const FIXED = Date.parse(process.env.FAKE_NOW ?? "2026-08-15T09:00:00Z");
const RealDate = Date;

globalThis.Date = class extends RealDate {
  constructor(...args) {
    if (args.length === 0) super(FIXED);
    else super(...args);
  }
  static now() {
    return FIXED;
  }
};
