---
title: Languages and RTL
description: The components speak English; your app adds its languages and right-to-left support comes built in.
group: Guides
order: 4
---

The library ships its own strings in English: "Fill in this field.", "Previous month", "Show the data as a table". Dates, numbers, month and language names come from the browser's `Intl` in the provider's locale.

## Add a language

Register your strings once, before the app renders. Anything you leave out stays English:

```ts
import { registerDsStrings } from "@senvenli/react";

registerDsStrings("de", {
  required: "Füllen Sie dieses Feld aus.",
  previousMonth: "Vorheriger Monat",
  nextMonth: "Nächster Monat",
});
```

Then pass the locale to the provider: `<DesignSystemProvider locale="de">`.

## See it in Spanish

The locale alone names the months and weekdays, orders the date and picks the first day of the week. The label is your own text:

```example
date-picker/spanish
```

## Your own locale tags

If your app uses a tag `Intl` does not know, map it to one it does:

```ts
import { registerLocaleAliases } from "@senvenli/react";

registerLocaleAliases({ me: "sr-Latn-ME" });
```

`LanguageSwitcher` names languages with `Intl`. For a language it names wrongly, or a UI language browsers ship no names for, register your own:

```ts
import { registerLanguageNames } from "@senvenli/react/action";

registerLanguageNames("en", { me: "Montenegrin" });
```

## Right to left

Set `dir="rtl"` on the page for Arabic, Hebrew or Persian. Components use logical properties (start and end, never left and right), mirror their directional icons, and keep numbers, codes and phone numbers left to right inside a right-to-left line.

The same date picker in Arabic: the field and the calendar mirror, the arrows point the reading way, and the digits follow the locale (`ar-EG` writes Arabic-Indic digits, `ar-AE` keeps Latin ones):

```example
date-picker/arabic
```
