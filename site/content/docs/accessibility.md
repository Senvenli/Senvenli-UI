---
title: Accessibility
description: What the components do for you, and what is left for you to provide.
group: Principles
order: 8
---

The components are built on React Aria, which brings keyboard behavior, focus management and screen reader support that follow the WAI-ARIA practices.

## What you get

- **Keyboard.** Every interactive component works with the keyboard alone. Each component page lists its keys.
- **Focus.** Dialogs and popovers trap focus while open and return it when they close. Focus is always visible.
- **Contrast.** Every theme's text and border pairs meet WCAG AA, in light and in dark, whatever colors you choose.
- **Names and states.** Selected, expanded, invalid and disabled states are announced, not only shown.
- **Touch.** Small controls get a 44px hit area on touch screens.
- **Motion.** Animations respect the reduced-motion setting.

## What you provide

- **Labels.** A visible label for every field, or an `aria-label` where there is no room for one.
- **Alt text** for images that carry meaning.
- **Headings** in order on each page.
- **Clear words** in errors and empty states: what happened, and what to do next.

Each component page has an **Accessibility** section with its keyboard table, what is built in and what you provide.
