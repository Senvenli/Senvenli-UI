# Changelog

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
