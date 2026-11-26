import { useEffect, type RefObject } from "react";

const TOGGLE = '[data-slot="chart-table-toggle"]';

/**
 * Cards in a stretched grid keep their own height while a chart's data table is open.
 *
 * At rest the grid stretches every card to its row, so the rows read as even bands. A chart that opens its data table
 * grows its row, and the grid would stretch the cards beside it too, for no reason of their own. So while any table in
 * the grid is open, each card is held at the height it had at rest and aligned to the top of its row: the open card
 * grows, the others stay as they were. A minimum, not a fixed height: a card whose own content grows still grows.
 * After the grid's width changes with a table open the resting heights are unknown, so the cards fall back to their
 * content's height until the tables close.
 */
export function useOwnHeights(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const grid = ref.current;
    if (!grid || typeof ResizeObserver === "undefined") return;
    const cards = () => Array.from(grid.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
    const rest = new Map<HTMLElement, number>();
    let width = grid.clientWidth;
    const isOpen = () => grid.querySelector(`${TOGGLE}[aria-expanded="true"]`) !== null;

    const sync = () => {
      const open = isOpen();
      for (const card of cards()) {
        const height = rest.get(card);
        card.style.alignSelf = open ? "start" : "";
        card.style.minHeight = open && height ? `${height}px` : "";
      }
    };

    // Resting heights are read only while every table is closed; a new width with one open makes them stale.
    const sizes = new ResizeObserver(() => {
      if (!isOpen()) {
        for (const card of cards()) rest.set(card, card.getBoundingClientRect().height);
      } else if (grid.clientWidth !== width) {
        rest.clear();
        sync();
      }
      width = grid.clientWidth;
    });
    sizes.observe(grid);
    for (const card of cards()) sizes.observe(card);

    // aria-expanded changes in the same task as the click, and this runs before the browser paints the taller row.
    const toggles = new MutationObserver(sync);
    toggles.observe(grid, { attributes: true, attributeFilter: ["aria-expanded"], subtree: true });

    return () => {
      sizes.disconnect();
      toggles.disconnect();
      for (const card of cards()) {
        card.style.alignSelf = "";
        card.style.minHeight = "";
      }
    };
  }, [ref]);
}
