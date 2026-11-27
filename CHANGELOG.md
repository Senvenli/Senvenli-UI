# Changelog

## 0.3.5 (2026-11-27)

- `@senvenli/tokens`: **pure-grey neutrals.** The neutral ramp keeps its lightness steps at zero chroma, so surfaces,
  menus, popovers, hovers, borders and shadows read as true grey in light and dark instead of warm brown; contrast is
  unchanged (all 128 pairs pass AA). The brand's subtle fills (selection, `brand-subtle`) keep only a trace of the hue;
  status tints are unchanged. **Changed:** every default theme's neutrals.
- `@senvenli/react` forms: a settings layout. `Form width="wide"` (800px, start-aligned); `FormSection` takes a
  `description`, a `separator` and `layout="split"` (title and description beside the fields); the new `FormGroup`
  with `orientation="horizontal"` lays every field out as a row (label and description first, the control at the end)
  and `separated` puts rules between rows; `Switch` and `Checkbox` take `controlPlacement`.
- `@senvenli/react` Sidebar: `togglePlacement="header"` puts the collapse toggle beside the brand; collapsed, it takes
  the brand's place. `footer` stays the default.
- `@senvenli/react` Input `type="password"`: `autoComplete="off"` for a masked secret that is not a password.
- `@senvenli/cli`, `@senvenli/mcp`: no change; released at the same version.

## 0.3.4 (2026-11-27)

- **Fix: 0.3.1, 0.3.2 and 0.3.3 were published without their build.** Their `dist/` was the 0.3.0 build, so none of
  the changes listed under them reached npm (Fab `color`, Tour, roomier Table rows, the small radius scale, Table
  `description`, comfortable DataTable, SidebarAccount, tooltip keycaps). 0.3.4 ships all of them; install 0.3.4 or
  later, not those three.
- Every package now clears and rebuilds its `dist/` before it is packed or published (`prepack`), and `scripts/verify-published.sh`
  compares the published `dist/` with a fresh build after each release.

## 0.3.3 (2026-11-27)

- `@senvenli/tokens`: **smaller default corners.** The base radius is now `0.375rem` (6px) and the steps are 2 / 4 / 6 /
  8 / 12px: controls 6px; menus, popovers, listboxes, cards, table containers and toasts 8px, with their items at
  4px so the corners are concentric; dialogs, drawers and the command palette 12px. **Changed:** themes without an
  explicit `radius` get the smaller corners; pass `radius: 0.625` for the previous look.
- `@senvenli/react` Table: a column's `description` renders a second, smaller line in the subtle tone under the
  value (an email under a name); both lines truncate. Virtualized rows grow to fit it.
- `@senvenli/react` DataTable: **changed:** density defaults to `comfortable` (rows of at least 48px); pass
  `density="compact"` for the 36px rows.
- `@senvenli/react` SidebarAccount (new, `@senvenli/react/navigation`): the signed-in person in the Sidebar footer, a
  row that opens the account menu; collapsed, a square the size of a nav icon with the avatar centred and the name as
  its tooltip.
- `@senvenli/react` Tooltip: a shortcut's keycaps take the tooltip's colours instead of the page surface.
- `@senvenli/cli`, `@senvenli/mcp`: the documented default radius is `0.375`; no other change.

## 0.3.2 (2026-11-27)

- `@senvenli/react` Tour (new, `@senvenli/react/overlay`): a guided tour of a few steps, each pointing at a part of the
  page (a CSS selector, a ref or a function) with a title, a sentence and Back / Next / Done, plus Skip. By default
  the page is dimmed except the target, which cannot be pressed, and the panel is a modal dialog; `mask={false}` keeps
  the page usable. Done calls `onFinish`, Skip / close / Esc call `onSkip`. Targets that appear late are waited for
  (`targetTimeout`), then centred or skipped (`missingTarget`). Arrow keys move between steps (mirrored right to
  left); the step's heading takes focus and progress ("Step 2 of 5") is announced. New DS strings: `tourNext`,
  `tourBack`, `tourSkip`, `tourFinish`.
- `@senvenli/react` Table: roomier default density. Cells get 12px above and below the value (the 48px row stays the
  minimum), the header row is 40px, and the first and last columns get 24px at the table's edge. Compact and
  virtualized tables keep their fixed rows.
- `@senvenli/tokens`, `@senvenli/cli`, `@senvenli/mcp`: no change; released at the same version.

## 0.3.1 (2026-11-26)

- `@senvenli/react` Fab: `color` sets a fill outside the theme, such as a chat app's own green
  (`color="#25d366"`). The label and icon pick ink or paper, whichever contrasts more with it; hover, press and focus
  work on that fill. A color the engine cannot read is ignored and the brand fill stays.
- `@senvenli/tokens`, `@senvenli/cli`, `@senvenli/mcp`: no change; released at the same version.

## 0.3.0 (2026-11-26)

- `@senvenli/react` charts: the data table swaps in place of the plot. An icon toggle at the end of the chart's top
  row (`aria-pressed`) turns the plot into the compact Table at the same height, scrolling inside, so a card never
  changes size; screen readers still get the table while the plot shows. New on every chart (`ChartTableProps`):
  `tableView` (`"swap"` by default, `"hidden"`, `"none"`), `isTableOpen` / `defaultTableOpen` / `onTableOpenChange`.
  **Changed:** the "Show the data as a table" text button below the chart is gone; `BarList` has no data table by
  default (`tableView="none"`; its names and values are text).
- `@senvenli/react` Table: start-aligned cells stay on one line unless the column sets `wrap` or `width`, so on a
  phone the table scrolls sideways instead of breaking values over two lines.
- `@senvenli/react` touch and pointer: chart legend toggles get the 44px coarse-pointer hit area; Tabs,
  SegmentedControl, Pagination and Accordion triggers show the pointer cursor (`not-allowed` when disabled).
- `@senvenli/react` Navbar: the brand never shrinks and links stay on one line at md widths.
- `@senvenli/tokens`, `@senvenli/cli`, `@senvenli/mcp`: no change; released at the same version.

## 0.2.0 (2026-11-25)

- `@senvenli/tokens`: `darkColors`, hand-picked dark-mode colors per role (`{ primary: "#c99a2e" }`). A given color is
  used as-is in dark mode instead of being derived from the light one; it still moves only if its label would fall
  below AA, and `adjusted` reports that. Light mode is unchanged.
- `@senvenli/cli`: `--primary-dark <color>`.
- `@senvenli/mcp`: `primaryDark` on `create_theme` and `validate_theme`.
- `@senvenli/react`: no API change; released at the same version as the others.

## 0.1.0 (2026-11-25)

The first public release, all four packages at the same version.

- `@senvenli/react`: 103 components in 12 families on React Aria Components and Tailwind v4, each with a JSON
  manifest (props with origin, usage, guidance, accessibility, tokens). ESM with explicit file extensions, so it loads
  in Node for SSR as well as in bundlers.
- `@senvenli/tokens`: the theme engine (up to three colors → light and dark tokens, 128 WCAG AA pairs), CSS and native
  hex output, preset codes, and `checkThemeCss` for a hand-edited theme.
- `@senvenli/cli`: `npx @senvenli/cli theme [preset] [--primary …] [--tailwind] [--native] [--out file]`.
- `@senvenli/mcp`: an MCP server (stdio and Streamable HTTP) with 7 read-only tools, 2 prompts and every component and
  doc as a resource.
