import type { ExampleMeta } from "../types";

export default [
  { id: "basic", title: "A labeled field", description: "The label sits above the field; help text goes under it." },
  { id: "text-affixes", title: "Prefix and suffix", description: "An icon, a unit or a URL part inside the frame." },
  { id: "text-invalid", title: "Invalid", description: "The error says what happened and what to do." },
  { id: "text-states", title: "Small, read-only and disabled", description: "The smaller size for dense forms, and the two states a value can be locked in." },
  { id: "password-sign-in", title: "Password: Signing in", description: "`current-password` lets the password manager fill it; the button shows or hides the value." },
  { id: "password-new-password", title: "Password: Creating a password", description: "The requirements up front, and a strength meter while typing." },
  { id: "password-invalid", title: "Password: Invalid", description: "The error says what to do next." },
  { id: "search-basic", title: "Search: Search a list", description: "The placeholder lists what can be searched; `aria-label` names the field." },
  { id: "search-filtering", title: "Search: Filtering as you type", description: "Controlled: the list follows the text, and Esc or the clear button empties it." },
  { id: "search-with-label", title: "Search: Label, shortcut and small size", description: "A visible label, and a key hint shown while the field is empty." },
  { id: "number-quantity", title: "Number: A quantity", description: "The stepper suits small whole numbers; the range is stated up front." },
  { id: "number-currency", title: "Number: Money", description: "`currency` adds the symbol and keeps the currency's decimals." },
  { id: "number-units", title: "Number: Units and percentages", description: "A suffix for a unit, or `formatOptions` when Intl can print it." },
  { id: "tel-basic", title: "Phone: A phone number", description: "Opens on `defaultCountry`; the suggested countries lead the list." },
  { id: "tel-controlled", title: "Phone: Controlled", description: "The value is E.164; `onChange` also gives the chosen country." },
  { id: "tel-invalid", title: "Phone: Invalid", description: "The error says what a full number looks like." },
] satisfies ExampleMeta[];
