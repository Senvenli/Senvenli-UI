# Senvenli UI: agent guide

- This library is generic. Never add product-specific code, copy or data (no rental, booking or tenant concepts). Product looks belong in themes (presets) in the consuming app.
- The default theme is neutral: soft black and white (`#fcfcfb` / `#0c0c0b`). Never use pure `#000` or `#fff`.
- Design rules: no focus rings (focus = the control's border takes the focus color), sentence case (no uppercase tracked labels), no gradients or glows, flat surfaces with no border at rest. Default font is Geist, weights 400/500. Use American spelling.
- Every color pair the engine emits must meet WCAG AA (4.5:1 for text, 3:1 for focus). `pnpm test` runs a hue sweep; never weaken it to make a change pass.
- Web and React Native components share names and props (React Aria vocabulary: `onPress`, `isDisabled`, `variant`, `size`).
- Run `pnpm test` and `pnpm typecheck` before pushing.
