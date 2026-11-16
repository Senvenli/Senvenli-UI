import * as React from "react";

import { TOUCH_TARGET } from "./styles";

/**
 * The invisible 44px hit area of a compact or small icon-only Button or LinkButton under a coarse pointer
 *, and of the DS's other small icon buttons that take a tap but are not Buttons: GridList's tile
 * actions. Empty and `aria-hidden`: it adds nothing to the accessible name or the text, and under a fine pointer it
 * is not displayed. The control must be positioned (`relative` or `absolute`). See `TOUCH_TARGET` for how it grows
 * without moving anything.
 */
export function TouchTarget() {
  return <span aria-hidden="true" data-slot="button-touch-target" className={TOUCH_TARGET} />;
}
