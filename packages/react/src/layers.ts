/**
 * The stacking order of fixed and floating layers (classes written out in
 * full so Tailwind finds them):
 *
 *   page content              auto
 *   sticky bars               z-20      LAYER.stickyBar
 *   floating banner           z-30      LAYER.floatingBanner: e.g. a consent bar, above sticky bars
 *   Fab                       z-40      LAYER.fab: lifts above a shown floating banner
 *   React Aria overlays       100000    Popover, Modal: inline style set by React Aria, portalled
 *                                       to the end of <body>
 *   toasts                    100001    LAYER.toast: above popovers and modals; rises above a shown
 *                                       floating banner through --ds-floating-banner-offset
 *   focused skip link         100002    LAYER.skipLink: only while the link is focused
 *
 * Above page content and sticky bars, a floating banner sits below the Fab,
 * toasts, popovers, drawers and dialogs.
 */
export const LAYER = {
  stickyBar: "z-20",
  floatingBanner: "z-30",
  fab: "z-40",
  /** Above React Aria's popovers and modals (inline z-index 100000), so a toast is never hidden by one. */
  toast: "z-[100001]",
  /** The focused skip link: above everything, it is the first thing a keyboard user meets. */
  skipLink: "focus:z-[100002]",
} as const;

/**
 * Set on <html> while a floating banner is shown: how far its top edge sits
 * above the bottom of the viewport. Bottom-fixed layers (the Fab, the toast
 * region) add it to their own bottom offset, so the banner never covers them.
 */
export const FLOATING_BANNER_OFFSET = "--ds-floating-banner-offset";
