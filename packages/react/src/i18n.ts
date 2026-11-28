import { aliasSourcesOf, intlLocale } from "./intl-locale";

export { contentLang, formatDateTime, hasIntlData, intlLocale } from "./intl-locale";

/**
 * Built-in English strings of the components. Other languages are added by the app with
 * `registerDsStrings(locale, strings)`; anything not registered falls back to English.
 * Consumers can also override each string through the component's own prop.
 */
type Strings = Record<string, string>;

const CLOSE: Strings = {
  en: "Close",
};

const NEW_TAB: Strings = {
  en: "(opens in a new tab)",
};

const OPTIONAL: Strings = {
  en: "(optional)",
};

const CLEAR: Strings = {
  en: "Clear",
};

const SHOW_PASSWORD: Strings = {
  en: "Show password",
};

const HIDE_PASSWORD: Strings = {
  en: "Hide password",
};

/** Password strength words: weak, fair, strong. */
const STRENGTH: Record<string, [string, string, string]> = {
  en: ["Weak", "Fair", "Strong"],
};

/** "{n} characters over the limit" (n is formatted by the caller). */
const OVER_LIMIT: Strings = {
  en: "{n} characters over the limit",
};

const REQUIRED: Strings = {
  en: "Fill in this field.",
};

const LIMIT_EXCEEDED: Strings = {
  en: "Character limit exceeded",
};

const RESEND: Strings = {
  en: "Resend code",
};

/** "{time}" is a m:ss countdown. */
const RESEND_IN: Strings = {
  en: "Resend in {time}",
};

const INCREASE: Strings = {
  en: "Increase",
};

const DECREASE: Strings = {
  en: "Decrease",
};

const CHOOSE_FILES: Strings = {
  en: "choose from your computer",
};

/** "{choose}" is the picker link: "or choose from your computer". */
const OR_CHOOSE: Strings = {
  en: "or {choose}",
};

const UP_TO: Strings = {
  en: "up to {size}",
};

const TOO_LARGE: Strings = {
  en: "The file is over the {size} limit.",
};

const ONLY_ONE: Strings = {
  en: "Only one file can be added here.",
};
const WRONG_TYPE: Strings = {
  en: "This file type is not accepted.",
};

const CANCEL_UPLOAD: Strings = {
  en: "Cancel upload",
};

const SELECT_PLACEHOLDER: Strings = {
  en: "Select",
};
const SELECT_ALL: Strings = {
  en: "Select all",
};
const SELECTED_COUNT: Strings = {
  en: "{count} selected",
};
const MORE_COUNT: Strings = {
  en: "{count} more",
};
const REMOVE_ITEM: Strings = {
  en: "Remove {label}",
};
const NO_MATCH: Strings = {
  en: "No results for “{query}”.",
};
const CREATE_ITEM: Strings = {
  en: "Add “{query}”",
};
const LOADING: Strings = {
  en: "Loading…",
};
const SHOW_SUGGESTIONS: Strings = {
  en: "Show suggestions",
};
const CLEAR_ALL: Strings = {
  en: "Clear all",
};
const ACTION_FAILED: Strings = {
  en: "That did not work. Try again.",
};
const RETRY: Strings = {
  en: "Try again",
};
const ERROR_CODE: Strings = {
  en: "Error code: {code}",
};
const SELECTED: Strings = {
  en: "Selected",
};
const ONLINE: Strings = {
  en: "online",
};
const MORE_PEOPLE: Strings = {
  en: "{count} more",
};
const DELTA_UP: Strings = {
  en: "up {value}",
};
const DELTA_DOWN: Strings = {
  en: "down {value}",
};
const NO_CHANGE: Strings = {
  en: "no change",
};
const NOT_SET: Strings = {
  en: "Not set",
};
const COPY_VALUE: Strings = {
  en: "Copy: {label}",
};
const COPY: Strings = {
  en: "Copy",
};
const COPIED: Strings = {
  en: "Copied",
};
const COPY_FAILED: Strings = {
  en: "Could not copy",
};
const IMAGE_POSITION: Strings = {
  en: "Image {index} of {total}",
};
const PREVIOUS_IMAGE: Strings = {
  en: "Previous image",
};
const NEXT_IMAGE: Strings = {
  en: "Next image",
};
const GO_TO_IMAGE: Strings = {
  en: "Go to image {index}",
};
const THEME: Strings = {
  en: "Theme",
};
const THEME_SYSTEM: Strings = {
  en: "System",
};
const THEME_LIGHT: Strings = {
  en: "Light",
};
const THEME_DARK: Strings = {
  en: "Dark",
};
const THEME_NOW_LIGHT: Strings = {
  en: "now light",
};
const THEME_NOW_DARK: Strings = {
  en: "now dark",
};
const PREVIOUS_MONTH: Strings = {
  en: "Previous month",
};
const NEXT_MONTH: Strings = {
  en: "Next month",
};
/** DatePicker granularity="month": the month grid's year stepper and its "this month" action. */
const PREVIOUS_YEAR: Strings = {
  en: "Previous year",
};
const NEXT_YEAR: Strings = {
  en: "Next year",
};
const THIS_MONTH: Strings = {
  en: "This month",
};
/**
 * A date picker's bounds and an unavailable day, in the provider locale: React Aria words these after
 * the browser's language instead. "{date}" is the bound, formatted by the caller. Where React Aria has the locale,
 * the wording is its own, so only the language changes.
 */
const DATE_MIN: Strings = {
  en: "Value must be {date} or later.",
};
const DATE_MAX: Strings = {
  en: "Value must be {date} or earlier.",
};
/** The same with a month; English uses the date sentences. Apps register per-locale month wording if they need it. */
const MONTH_MIN: Strings = { ...DATE_MIN };
const MONTH_MAX: Strings = { ...DATE_MAX };
const DATE_UNAVAILABLE: Strings = {
  en: "Selected date unavailable.",
};
const TODAY: Strings = {
  en: "Today",
};
const RANGE_START: Strings = {
  en: "Start",
};
const RANGE_END: Strings = {
  en: "End",
};
const RANGE_PRESETS: Strings = {
  en: "Quick ranges",
};
const RANGE_START_TIME: Strings = {
  en: "Start time",
};
const RANGE_END_TIME: Strings = {
  en: "End time",
};
/**
 * A date, a date and time, or a time typed in part: {parts} is the missing parts, each in the form the
 * sentence takes it (the object of "enter": see DATE_PART_NAMES), listed with `datePartsLabel`. One sentence per kind of
 * field, so the subject can agree with what is incomplete in languages that need it.
 */
const DATE_INCOMPLETE: Strings = {
  en: "Incomplete date: enter {parts}, or clear the field.",
};
const DATE_TIME_INCOMPLETE: Strings = {
  en: "Incomplete date and time: enter {parts}, or clear the field.",
};
const TIME_INCOMPLETE: Strings = {
  en: "Incomplete time: enter {parts}, or clear the field.",
};
/** The parts of a date or time a field may miss (React Aria's segment types; an era is never typed in the DS). */
export type DatePartName = "day" | "month" | "year" | "hour" | "minute" | "second" | "dayPeriod";
/**
 * Each part as the object of "enter" in DATE_INCOMPLETE and its siblings: in many languages that is not the
 * nominative name Intl gives (an accusative, often with an article), so apps register the form their sentence needs
 * (`registerDsStrings(locale, { dateParts })`). The AM/PM segment of a 12-hour clock is named only when the hour is typed
 * and it is not.
 */
const DATE_PART_NAMES: Record<string, Record<DatePartName, string>> = {
  en: { day: "the day", month: "the month", year: "the year", hour: "the hour", minute: "the minutes", second: "the seconds", dayPeriod: "AM/PM" },
};
/**
 * How the list of parts is joined: [between two, before the last of three or more]; every other pair takes ", ".
 * The DS's own words, so the list never depends on the runtime's Intl data (CLDR's lists, written out).
 */
const LIST_AND: Record<string, [string, string]> = {
  en: [" and ", ", and "],
};
/**
 * "{month} has {n} days" for a day past the month's end (31.11). {month} is a registered month name (`months`) in the
 * form the sentence takes it, else Intl's long month name in the locale.
 */
const MONTH_HAS_DAYS: Strings = {
  en: "{month} has {n} days.",
};
/**
 * The same for a month the DS has no name for: a field in a calendar whose months are not the Gregorian ones (an
 * Islamic or Persian calendar, which React Aria takes from a locale outside the 14, such as ar-SA or fa, or from a
 * -u-ca- tag).
 */
const THIS_MONTH_HAS_DAYS: Strings = {
  en: "This month has {n} days.",
};
/**
 * The Gregorian months (January first) as MONTH_HAS_DAYS takes them: the sentence's subject, capitalised as its first
 * word: each language's own names (hr "Studeni"; me and sr "Jun", "Jul", "Avgust"; bs "Juni", "Juli", "August"; no
 * month name differs between Ijekavian and Ekavian), the nominative after the article in el ("Ο Νοέμβριος"), the
 * definite form in sq ("Nëntori ka 30 ditë."), and the prepositional after "в" in ru ("В ноябре 30 дней.").
 */
const MONTH_HAS_DAYS_MONTHS: Record<string, readonly string[]> = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};
const PREVIEW: Strings = {
  en: "Preview",
};
const PREVIEW_ACTION: Strings = {
  en: "Get started",
};
/** "{ratio}" is the measured contrast, formatted by the caller ("3,3:1"). */
const LOW_IN_LIGHT: Strings = {
  en: "This tone is not enough in the light theme: {ratio}",
};
const LOW_IN_DARK: Strings = {
  en: "This tone is not enough in the dark theme: {ratio}",
};
/** "{hex}" is the tone the system uses instead ("#6EA8FE"). */
const FIX_IN_LIGHT: Strings = {
  en: "In the light theme, filled buttons use the tone {hex} instead.",
};
const FIX_IN_DARK: Strings = {
  en: "In the dark theme, filled buttons use the tone {hex} instead.",
};
const NO_STEP_PASSES: Strings = {
  en: "No tone of this color reaches AA: actions keep the theme color and yours shows in accents only.",
};
/** "{example}" is a valid value ("#1E63D0"). */
const HEX_EXPECTED: Strings = {
  en: "Enter a 6-digit hex code: {example}",
};
const CUSTOM_COLOR: Strings = {
  en: "Choose a custom color",
};
/** "{name} · selected" under a swatch picker. */
const NAME_SELECTED: Strings = {
  en: "{name} · selected",
};
const CANCEL: Strings = {
  en: "Cancel",
};
/** "{text}" is what the user types, quoted by the caller's own words ("PG AB 482"). */
const TYPE_TO_CONFIRM: Strings = {
  en: "Type {text} to confirm",
};
const UNSAVED_TITLE: Strings = {
  en: "Changes not saved",
};
const UNSAVED_BODY: Strings = {
  en: "If you close now, your changes are lost.",
};
const DISCARD_CLOSE: Strings = {
  en: "Close without saving",
};
const KEEP_EDITING: Strings = {
  en: "Keep editing",
};
const EXPAND_SHEET: Strings = {
  en: "Expand panel",
};
const COLLAPSE_SHEET: Strings = {
  en: "Collapse panel",
};
const MAIN_NAVIGATION: Strings = {
  en: "Main menu",
};
const OPEN_MENU: Strings = {
  en: "Open menu",
};
const LANGUAGE: Strings = {
  en: "Language",
};
const COLLAPSE_SIDEBAR: Strings = {
  en: "Collapse menu",
};
const EXPAND_SIDEBAR: Strings = {
  en: "Expand menu",
};
const LOCATION: Strings = {
  en: "Location",
};
const SHOW_HIDDEN_LEVELS: Strings = {
  en: "Show hidden levels",
};
const PAGES: Strings = {
  en: "Pages",
};
const PREVIOUS_PAGE: Strings = {
  en: "Previous page",
};
const NEXT_PAGE: Strings = {
  en: "Next page",
};

/** Tour: the buttons that move between steps, leave the tour, and end it on the last step. */
const TOUR_NEXT: Strings = {
  en: "Next",
};
const TOUR_BACK: Strings = {
  en: "Back",
};
const TOUR_SKIP: Strings = {
  en: "Skip",
};
const TOUR_FINISH: Strings = {
  en: "Done",
};
const PAGE_N: Strings = {
  en: "Page {n}",
};
const PAGE_OF: Strings = {
  en: "Page {page} of {total}",
};
const RANGE_OF: Strings = {
  en: "{from}–{to} of {total}",
};
const PER_PAGE: Strings = {
  en: "Per page",
};
const STEP_N: Strings = {
  en: "Step {n}",
};
const STEP_N_OF: Strings = {
  en: "Step {n} of {total}",
};
const STEP_DONE: Strings = {
  en: "Done",
};
const STEP_NOW: Strings = {
  en: "Now",
};
const STEP_NEEDS_YOU: Strings = {
  en: "Waiting for you",
};
const STEP_WITH_PROVIDER: Strings = {
  en: "With us",
};
const STEP_FAILED: Strings = {
  en: "Something went wrong",
};
const PROGRESS_STEPS: Strings = {
  en: "Progress",
};
/** A finished Stepper: every step done, none current. */
const STEPS_ALL_DONE: Strings = {
  en: "All steps done",
};
const CLEAR_SELECTION: Strings = {
  en: "Clear selection",
};
const SKIP_TO_CONTENT: Strings = {
  en: "Skip to content",
};
const HOME_PAGE: Strings = {
  en: "{name} home",
};
const SELECTION: Strings = {
  en: "Selection",
};
const SHOW_DATA_TABLE: Strings = {
  en: "Show the data as a table",
};
const HIDE_DATA_TABLE: Strings = {
  en: "Hide the table",
};
const CHART_NO_DATA: Strings = {
  en: "No data for this period",
};
const CHART_FROM: Strings = {
  en: "From",
};
const CHART_TO: Strings = {
  en: "To",
};
const CHART_NOTES: Strings = {
  en: "Notes",
};
const CHART_PERIOD: Strings = {
  en: "Period",
};
const CHART_CATEGORY: Strings = {
  en: "Category",
};
const SPARKLINE_SUMMARY: Strings = {
  en: "First {first}, last {last}; low {min}, high {max}",
};
const GAUGE_TARGET: Strings = {
  en: "Target {target}",
};
const CHART_OTHER: Strings = {
  en: "Other",
};
const SHOW_ALL: Strings = {
  en: "Show all",
};
const SHOW_FEWER: Strings = {
  en: "Show fewer",
};
const HEATMAP_LESS: Strings = {
  en: "Less",
};
const HEATMAP_MORE: Strings = {
  en: "More",
};
const CHART_BAND: Strings = {
  en: "Band {from}–{to}",
};
const CHART_STATUS: Strings = {
  en: "Status",
};
const CHART_CONVERSION: Strings = {
  en: "Conversion",
};
// Waterfall and seasonality heatmap.
const CHART_CHANGE: Strings = {
  en: "Change",
};
const CHART_TOTAL: Strings = {
  en: "Total",
};
const CHART_INCREASE: Strings = {
  en: "Increase",
};
const CHART_DECREASE: Strings = {
  en: "Decrease",
};
const CHART_NO_VALUE: Strings = {
  en: "No data",
};
const PHONE_COUNTRY: Strings = {
  en: "Country: {country}, {code}",
};
const PHONE_COUNTRY_LIST: Strings = {
  en: "Country",
};
const PHONE_COUNTRY_SEARCH: Strings = {
  en: "Search countries",
};
const PHONE_SUGGESTED_COUNTRIES: Strings = {
  en: "Suggested countries",
};
const PHONE_ALL_COUNTRIES: Strings = {
  en: "All countries",
};
const PHONE_TOO_SHORT: Strings = {
  en: "The number looks incomplete. {country} numbers have {digits} digits.",
};
const PHONE_TOO_LONG: Strings = {
  en: "The number looks too long. {country} numbers have {digits} digits.",
};
const TABLE_SEARCH: Strings = {
  en: "Search",
};
const TABLE_COLUMNS: Strings = {
  en: "Columns",
};
const TABLE_CLEAR_FILTERS: Strings = {
  en: "Clear filters",
};
const TABLE_EMPTY: Strings = {
  en: "No records yet",
};
const TABLE_NO_RESULTS: Strings = {
  en: "No records match your search and filters",
};
const TABLE_LOAD_FAILED: Strings = {
  en: "The list could not be loaded",
};
const TABLE_LOAD_FAILED_HINT: Strings = {
  en: "Check your connection and try again; your search and filters are kept.",
};
const TABLE_REFRESH_FAILED: Strings = {
  en: "The list could not be refreshed",
};
const TABLE_REFRESH_FAILED_HINT: Strings = {
  en: "These are the last results that loaded. Try again; your search and filters are kept.",
};
const ABOUT: Strings = {
  en: "About",
};
const TABLE_TOOLS: Strings = {
  en: "List tools",
};
const TABLE_SELECTED: Strings = {
  en: "Selected records",
};
const CROP_HELP: Strings = {
  en: "Arrow keys move the image (Shift for more), plus and minus zoom, square brackets rotate.",
};
const CROP_STATUS: Strings = {
  en: "Zoom {zoom}, {position}",
};
const CROP_CENTERED: Strings = {
  en: "position centered",
};
const CROP_POSITION: Strings = {
  en: "position {x} across, {y} down",
};
const CROP_ZOOM: Strings = {
  en: "Zoom",
};
const CROP_ZOOM_IN: Strings = {
  en: "Zoom in",
};
const CROP_ZOOM_OUT: Strings = {
  en: "Zoom out",
};
const CROP_ROTATE_LEFT: Strings = {
  en: "Rotate left",
};
const CROP_ROTATE_RIGHT: Strings = {
  en: "Rotate right",
};
const CROP_ASPECT: Strings = {
  en: "Aspect",
};
const CROP_FIT: Strings = {
  en: "Fit",
};
const CROP_COVER: Strings = {
  en: "Fill",
};
const CROP_CONTAIN: Strings = {
  en: "Fit",
};
const CROP_SAVE_FAILED: Strings = {
  en: "The image could not be saved. Try again, or choose a smaller image.",
};
const CROP_BACKGROUND: Strings = {
  en: "Empty area color",
};
const COLOR_WHITE: Strings = {
  en: "White",
};
const COLOR_LIGHT_GREY: Strings = {
  en: "Light gray",
};
const COLOR_BLACK: Strings = {
  en: "Black",
};
const CROP_OUTPUT: Strings = {
  en: "Output: {size} · {type}",
};
const CROP_KEEPS_ALPHA: Strings = {
  en: "transparent area kept",
};
const CROP_SMALL: Strings = {
  en: "The image is {width} px wide; it is saved at {size} without enlarging.",
};
/** A crop over the surface's byte limit even at the lowest quality allowed; {size} is formatted by the caller. */
const CROP_TOO_LARGE: Strings = {
  en: "The cropped image is over the {size} limit. Zoom in to crop a smaller area, or choose another image.",
};
const CROP_SAVE: Strings = {
  en: "Crop and save",
};
const CROP_LOAD_FAILED: Strings = {
  en: "The image could not be opened. Choose another file.",
};
const CHART_TREND: Strings = {
  en: "Trend",
};
const CHART_SHARE: Strings = {
  en: "Share",
};
const CHART_VALUE: Strings = {
  en: "Value",
};
const COMMAND_PALETTE: Strings = {
  en: "Command",
};
const COMMAND_SEARCH: Strings = {
  en: "Search records or actions",
};
const RECENT_RECORDS: Strings = {
  en: "Recent",
};
const FREQUENT_ACTIONS: Strings = {
  en: "Frequent actions",
};
const HINT_MOVE: Strings = {
  en: "move",
};
const HINT_OPEN: Strings = {
  en: "open",
};
const HINT_CLOSE: Strings = {
  en: "close",
};
const RANGE_TOO_SHORT: Strings = {
  en: "Range too short",
};
const RANGE_TOO_LONG: Strings = {
  en: "Range too long",
};
const RANGE_CROSSES_CLOSED: Strings = {
  en: "A closed day is in between",
};
const RANGE_MIN: Strings = {
  en: "Minimum",
};
const RANGE_MAX: Strings = {
  en: "Maximum",
};
const REMOVE_FILE: Strings = {
  en: "Remove file",
};

const REPLACE: Strings = {
  en: "Replace",
};

const UPLOADED: Strings = {
  en: "uploaded",
};

/** Locales with registered strings; English is built in. */
const registered = new Set<string>(["en"]);

/** The table key for a locale: a registered exact tag ("pt-BR"), else its language ("pt"), else English. */
function tableKey(locale: string): string {
  const find = (tag: string): string | undefined => {
    const lower = tag.toLowerCase();
    for (const key of registered) if (key.toLowerCase() === lower) return key;
    const language = lower.split(/[-_]/)[0] ?? "en";
    return registered.has(language) ? language : undefined;
  };
  // Inside components the locale is the alias target (`registerLocaleAliases`); its strings live under the app tag.
  for (const source of aliasSourcesOf(locale)) {
    const key = find(source);
    if (key) return key;
  }
  return find(locale) ?? "en";
}

/** Whether components have their own words for a locale; others fall back to English. */
export function hasDsStrings(locale: string): boolean {
  return tableKey(locale) !== "en" || locale.toLowerCase().split(/[-_]/)[0] === "en";
}

export type DsStringKey = keyof typeof DS_STRINGS;
export type DsStringsInput = Partial<Record<DsStringKey, string>> & {
  strength?: [string, string, string];
  /** Month names in the form `monthHasDays` uses ("{month} has {n} days."), January first. */
  months?: readonly string[];
  /** The parts of a date as the object of "enter" in the incomplete-date sentences. */
  dateParts?: Record<DatePartName, string>;
  /** How the missing parts are joined: [between two, before the last of three or more]. */
  listAnd?: [string, string];
};

/**
 * Add a language: give the component strings for `locale` (any subset; missing ones stay English).
 * Call once at startup, before rendering, for every locale the app supports.
 *
 *   registerDsStrings("de", { close: "Schließen", optional: "(optional)" });
 */
export function registerDsStrings(locale: string, strings: DsStringsInput): void {
  const tables = DS_STRINGS as unknown as Record<string, Record<string, string>>;
  for (const [key, value] of Object.entries(strings)) {
    if (key === "strength" && Array.isArray(value)) STRENGTH[locale] = value as [string, string, string];
    else if (key === "months" && Array.isArray(value)) MONTH_HAS_DAYS_MONTHS[locale] = value as readonly string[];
    else if (key === "dateParts" && value && typeof value === "object") DATE_PART_NAMES[locale] = value as Record<DatePartName, string>;
    else if (key === "listAnd" && Array.isArray(value)) LIST_AND[locale] = value as [string, string];
    else if (typeof value === "string" && tables[key]) tables[key]![locale] = value;
  }
  registered.add(locale);
}

function pick(strings: Strings, locale: string): string {
  return strings[tableKey(locale)] ?? strings.en;
}


const formatCount = (locale: string, count: number) => new Intl.NumberFormat(intlLocale(locale)).format(count);

export const closeLabel = (locale: string) => pick(CLOSE, locale);
export const newTabLabel = (locale: string) => pick(NEW_TAB, locale);
export const optionalLabel = (locale: string) => pick(OPTIONAL, locale);
export const clearLabel = (locale: string) => pick(CLEAR, locale);
export const showPasswordLabel = (locale: string) => pick(SHOW_PASSWORD, locale);
export const hidePasswordLabel = (locale: string) => pick(HIDE_PASSWORD, locale);
export function strengthLabels(locale: string): [string, string, string] {
  return STRENGTH[tableKey(locale)] ?? STRENGTH.en;
}
export function overLimitLabel(locale: string, count: number): string {
  return pick(OVER_LIMIT, locale).replace("{n}", formatCount(locale, count));
}
export const requiredLabel = (locale: string) => pick(REQUIRED, locale);
export const limitExceededLabel = (locale: string) => pick(LIMIT_EXCEEDED, locale);
export const resendLabel = (locale: string) => pick(RESEND, locale);
export function resendInLabel(locale: string, seconds: number): string {
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  return pick(RESEND_IN, locale).replace("{time}", time);
}
export const increaseLabel = (locale: string) => pick(INCREASE, locale);
export const decreaseLabel = (locale: string) => pick(DECREASE, locale);
export const chooseFilesLabel = (locale: string) => pick(CHOOSE_FILES, locale);
export const orChooseTemplate = (locale: string) => pick(OR_CHOOSE, locale);
export const upToLabel = (locale: string, size: string) => pick(UP_TO, locale).replace("{size}", size);
export const tooLargeLabel = (locale: string, size: string) => pick(TOO_LARGE, locale).replace("{size}", size);
export const wrongTypeLabel = (locale: string) => pick(WRONG_TYPE, locale);
export const onlyOneLabel = (locale: string) => pick(ONLY_ONE, locale);
export const selectPlaceholder = (locale: string) => pick(SELECT_PLACEHOLDER, locale);
export const selectAllLabel = (locale: string) => pick(SELECT_ALL, locale);
export const selectedCountLabel = (locale: string, count: number) =>
  pick(SELECTED_COUNT, locale).replace("{count}", formatCount(locale, count));
export const moreCountLabel = (locale: string, count: number) =>
  pick(MORE_COUNT, locale).replace("{count}", formatCount(locale, count));
export const removeItemLabel = (locale: string, label: string) => pick(REMOVE_ITEM, locale).replace("{label}", label);
export const noMatchLabel = (locale: string, query: string) => pick(NO_MATCH, locale).replace("{query}", query);
export const createItemLabel = (locale: string, query: string) => pick(CREATE_ITEM, locale).replace("{query}", query);
export const loadingLabel = (locale: string) => pick(LOADING, locale);
export const showSuggestionsLabel = (locale: string) => pick(SHOW_SUGGESTIONS, locale);
export const clearAllLabel = (locale: string) => pick(CLEAR_ALL, locale);
export const actionFailedLabel = (locale: string) => pick(ACTION_FAILED, locale);
export const retryLabel = (locale: string) => pick(RETRY, locale);
export const errorCodeLabel = (locale: string) => pick(ERROR_CODE, locale);
export const selectedLabel = (locale: string) => pick(SELECTED, locale);
export const onlineLabel = (locale: string) => pick(ONLINE, locale);
export const morePeopleLabel = (locale: string, count: number) =>
  pick(MORE_PEOPLE, locale).replace("{count}", formatCount(locale, count));
export const deltaLabel = (locale: string, direction: "up" | "down" | "flat", value: string) =>
  direction === "flat" ? pick(NO_CHANGE, locale) : pick(direction === "up" ? DELTA_UP : DELTA_DOWN, locale).replace("{value}", value);
export const notSetLabel = (locale: string) => pick(NOT_SET, locale);
export const copyValueLabel = (locale: string, label: string) => pick(COPY_VALUE, locale).replace("{label}", label);
export const copyLabel = (locale: string) => pick(COPY, locale);
export const copiedLabel = (locale: string) => pick(COPIED, locale);
export const copyFailedLabel = (locale: string) => pick(COPY_FAILED, locale);
export const imagePositionLabel = (locale: string, index: number, total: number) =>
  pick(IMAGE_POSITION, locale).replace("{index}", formatCount(locale, index)).replace("{total}", formatCount(locale, total));
export const previousImageLabel = (locale: string) => pick(PREVIOUS_IMAGE, locale);
export const nextImageLabel = (locale: string) => pick(NEXT_IMAGE, locale);
export const goToImageLabel = (locale: string, index: number) => pick(GO_TO_IMAGE, locale).replace("{index}", formatCount(locale, index));
export const themeLabels = (locale: string) => ({
  theme: pick(THEME, locale),
  system: pick(THEME_SYSTEM, locale),
  light: pick(THEME_LIGHT, locale),
  dark: pick(THEME_DARK, locale),
  nowLight: pick(THEME_NOW_LIGHT, locale),
  nowDark: pick(THEME_NOW_DARK, locale),
});
export const previousMonthLabel = (locale: string) => pick(PREVIOUS_MONTH, locale);
export const nextMonthLabel = (locale: string) => pick(NEXT_MONTH, locale);
export const todayLabel = (locale: string) => pick(TODAY, locale);
export const previousYearLabel = (locale: string) => pick(PREVIOUS_YEAR, locale);
export const nextYearLabel = (locale: string) => pick(NEXT_YEAR, locale);
export const thisMonthLabel = (locale: string) => pick(THIS_MONTH, locale);
export const dateMinLabel = (locale: string, date: string, isMonth = false) => pick(isMonth ? MONTH_MIN : DATE_MIN, locale).replace("{date}", date);
export const dateMaxLabel = (locale: string, date: string, isMonth = false) => pick(isMonth ? MONTH_MAX : DATE_MAX, locale).replace("{date}", date);
export const dateUnavailableLabel = (locale: string) => pick(DATE_UNAVAILABLE, locale);
export const rangeStartLabel = (locale: string) => pick(RANGE_START, locale);
export const rangeEndLabel = (locale: string) => pick(RANGE_END, locale);
export const rangePresetsLabel = (locale: string) => pick(RANGE_PRESETS, locale);
export const rangeStartTimeLabel = (locale: string) => pick(RANGE_START_TIME, locale);
export const rangeEndTimeLabel = (locale: string) => pick(RANGE_END_TIME, locale);
/** The missing parts, in the given order, as the object of the incomplete sentence ("the day and the month", "the day, the month, and the year"). */
export function datePartsLabel(locale: string, parts: readonly DatePartName[]): string {
  const key = tableKey(locale);
  const names = DATE_PART_NAMES[key] ?? DATE_PART_NAMES.en!;
  const [pair, last] = LIST_AND[key] ?? LIST_AND.en!;
  const words = parts.map((part) => names[part]);
  if (words.length <= 1) return words.join("");
  if (words.length === 2) return words.join(pair);
  // Arabic lists take the Arabic comma ("اليوم، الشهر والسنة"); its "و" joins the next word with no space.
  return words.slice(0, -1).join(key === "ar" ? "، " : ", ") + last + words[words.length - 1];
}
/** "Incomplete date: enter the month, or clear the field.": a date (`date`), a date and time (`dateTime`) or a time (`time`) typed in part. */
export const dateIncompleteLabel = (locale: string, parts: readonly DatePartName[], kind: "date" | "dateTime" | "time" = "date") =>
  pick(kind === "time" ? TIME_INCOMPLETE : kind === "dateTime" ? DATE_TIME_INCOMPLETE : DATE_INCOMPLETE, locale).replace("{parts}", datePartsLabel(locale, parts));
/**
 * "November has 30 days.": a day past the end of a month that has `days` days. `month` is the Gregorian month
 * (1–12); left out (a field in another calendar), the sentence says "this month". A locale without its own sentence
 * reads the whole sentence in English, with an English month name. The count is written in Western Arabic digits.
 */
export function monthHasDaysLabel(locale: string, days: number, month?: number): string {
  // A language without its own sentence uses English throughout, so no English sentence carries a foreign month.
  const own = hasDsStrings(locale) ? tableKey(locale) : "en";
  const key = MONTH_HAS_DAYS[own] !== undefined || THIS_MONTH_HAS_DAYS[own] !== undefined ? own : "en";
  const intlMonth = (m: number) => new Intl.DateTimeFormat(intlLocale(locale), { month: "long" }).format(new Date(2000, m - 1, 1));
  const name = month !== undefined ? (MONTH_HAS_DAYS_MONTHS[key]?.[month - 1] ?? intlMonth(month)) : undefined;
  const withMonth = MONTH_HAS_DAYS[key] ?? MONTH_HAS_DAYS.en!;
  const plain = THIS_MONTH_HAS_DAYS[key] ?? THIS_MONTH_HAS_DAYS.en!;
  let sentence = name !== undefined ? withMonth.replace("{month}", name) : plain;
  // Romanian puts "de" between a count and its noun from 20 on (and after 0), not for 1–19 (a 5- or 6-day month in the
  // Ethiopic and Coptic calendars).
  if (key === "ro" && days % 100 >= 1 && days % 100 <= 19) sentence = sentence.replace("{n} de zile", "{n} zile");
  // Arabic counts 3–10 take the plural "أيام"; 11–99 (every Gregorian month) the singular accusative "يومًا".
  if (key === "ar" && days % 100 >= 3 && days % 100 <= 10) sentence = sentence.replace("{n} يومًا", "{n} أيام");
  return sentence.replace("{n}", String(days));
}
export const previewLabel = (locale: string) => pick(PREVIEW, locale);
export const previewActionLabel = (locale: string) => pick(PREVIEW_ACTION, locale);
export const lowContrastLabel = (locale: string, theme: "light" | "dark", ratio: string) =>
  pick(theme === "light" ? LOW_IN_LIGHT : LOW_IN_DARK, locale).replace("{ratio}", ratio);
export const contrastFixLabel = (locale: string, theme: "light" | "dark", hex: string) =>
  pick(theme === "light" ? FIX_IN_LIGHT : FIX_IN_DARK, locale).replace("{hex}", hex);
export const noStepPassesLabel = (locale: string) => pick(NO_STEP_PASSES, locale);
export const hexExpectedLabel = (locale: string, example: string) => pick(HEX_EXPECTED, locale).replace("{example}", example);
export const customColorLabel = (locale: string) => pick(CUSTOM_COLOR, locale);
export const nameSelectedLabel = (locale: string, name: string) => pick(NAME_SELECTED, locale).replace("{name}", name);
export const cancelLabel = (locale: string) => pick(CANCEL, locale);
export const typeToConfirmLabel = (locale: string, text: string) => pick(TYPE_TO_CONFIRM, locale).replace("{text}", text);
export const unsavedTitleLabel = (locale: string) => pick(UNSAVED_TITLE, locale);
export const unsavedBodyLabel = (locale: string) => pick(UNSAVED_BODY, locale);
export const discardCloseLabel = (locale: string) => pick(DISCARD_CLOSE, locale);
export const keepEditingLabel = (locale: string) => pick(KEEP_EDITING, locale);
export const expandSheetLabel = (locale: string) => pick(EXPAND_SHEET, locale);
export const collapseSheetLabel = (locale: string) => pick(COLLAPSE_SHEET, locale);
export const mainNavigationLabel = (locale: string) => pick(MAIN_NAVIGATION, locale);
export const stepLabel = (locale: string, n: number) => pick(STEP_N, locale).replace("{n}", formatCount(locale, n));
export const stepOfLabel = (locale: string, n: number, total: number) =>
  pick(STEP_N_OF, locale).replace("{n}", formatCount(locale, n)).replace("{total}", formatCount(locale, total));
export const stepDoneLabel = (locale: string) => pick(STEP_DONE, locale);
export const stepNowLabel = (locale: string) => pick(STEP_NOW, locale);
export const stepNeedsYouLabel = (locale: string) => pick(STEP_NEEDS_YOU, locale);
export const stepWithProviderLabel = (locale: string) => pick(STEP_WITH_PROVIDER, locale);
export const stepFailedLabel = (locale: string) => pick(STEP_FAILED, locale);
export const progressStepsLabel = (locale: string) => pick(PROGRESS_STEPS, locale);
export const stepsAllDoneLabel = (locale: string) => pick(STEPS_ALL_DONE, locale);
export const clearSelectionLabel = (locale: string) => pick(CLEAR_SELECTION, locale);
export const skipToContentLabel = (locale: string) => pick(SKIP_TO_CONTENT, locale);
/** A sparkline's text summary: first, last, lowest and highest value. */
export const sparklineSummaryLabel = (locale: string, values: { first: string; last: string; min: string; max: string }) =>
  pick(SPARKLINE_SUMMARY, locale).replace("{first}", values.first).replace("{last}", values.last).replace("{min}", values.min).replace("{max}", values.max);
export const gaugeTargetLabel = (locale: string, target: string) => pick(GAUGE_TARGET, locale).replace("{target}", target);
export const chartOtherLabel = (locale: string) => pick(CHART_OTHER, locale);
export const chartShareLabel = (locale: string) => pick(CHART_SHARE, locale);
export const chartTrendLabel = (locale: string) => pick(CHART_TREND, locale);
export const cropHelpLabel = (locale: string) => pick(CROP_HELP, locale);
export const cropStatusLabel = (locale: string, zoom: string, position: string) => pick(CROP_STATUS, locale).replace("{zoom}", zoom).replace("{position}", position);
export const cropCenteredLabel = (locale: string) => pick(CROP_CENTERED, locale);
export const cropPositionLabel = (locale: string, x: string, y: string) => pick(CROP_POSITION, locale).replace("{x}", x).replace("{y}", y);
export const cropZoomLabel = (locale: string) => pick(CROP_ZOOM, locale);
export const cropZoomInLabel = (locale: string) => pick(CROP_ZOOM_IN, locale);
export const cropZoomOutLabel = (locale: string) => pick(CROP_ZOOM_OUT, locale);
export const cropRotateLeftLabel = (locale: string) => pick(CROP_ROTATE_LEFT, locale);
export const cropRotateRightLabel = (locale: string) => pick(CROP_ROTATE_RIGHT, locale);
export const cropAspectLabel = (locale: string) => pick(CROP_ASPECT, locale);
export const cropFitLabel = (locale: string) => pick(CROP_FIT, locale);
export const cropCoverLabel = (locale: string) => pick(CROP_COVER, locale);
export const cropContainLabel = (locale: string) => pick(CROP_CONTAIN, locale);
export const cropSaveFailedLabel = (locale: string) => pick(CROP_SAVE_FAILED, locale);
export const cropBackgroundLabel = (locale: string) => pick(CROP_BACKGROUND, locale);
export const colorWhiteLabel = (locale: string) => pick(COLOR_WHITE, locale);
export const colorLightGreyLabel = (locale: string) => pick(COLOR_LIGHT_GREY, locale);
export const colorBlackLabel = (locale: string) => pick(COLOR_BLACK, locale);
export const cropOutputLabel = (locale: string, size: string, type: string) => pick(CROP_OUTPUT, locale).replace("{size}", size).replace("{type}", type);
export const cropKeepsAlphaLabel = (locale: string) => pick(CROP_KEEPS_ALPHA, locale);
export const cropSmallLabel = (locale: string, width: string, size: string) => pick(CROP_SMALL, locale).replace("{width}", width).replace("{size}", size);
export const cropSaveLabel = (locale: string) => pick(CROP_SAVE, locale);
export const cropTooLargeLabel = (locale: string, size: string) => pick(CROP_TOO_LARGE, locale).replace("{size}", size);
export const cropLoadFailedLabel = (locale: string) => pick(CROP_LOAD_FAILED, locale);
export const tableSearchLabel = (locale: string) => pick(TABLE_SEARCH, locale);
export const tableColumnsLabel = (locale: string) => pick(TABLE_COLUMNS, locale);
export const tableClearFiltersLabel = (locale: string) => pick(TABLE_CLEAR_FILTERS, locale);
export const tableEmptyLabel = (locale: string) => pick(TABLE_EMPTY, locale);
export const tableNoResultsLabel = (locale: string) => pick(TABLE_NO_RESULTS, locale);
export const tableLoadFailedLabel = (locale: string) => pick(TABLE_LOAD_FAILED, locale);
export const tableLoadFailedHintLabel = (locale: string) => pick(TABLE_LOAD_FAILED_HINT, locale);
export const tableRefreshFailedLabel = (locale: string) => pick(TABLE_REFRESH_FAILED, locale);
export const tableRefreshFailedHintLabel = (locale: string) => pick(TABLE_REFRESH_FAILED_HINT, locale);
export const tableToolsLabel = (locale: string) => pick(TABLE_TOOLS, locale);
export const aboutLabel = (locale: string) => pick(ABOUT, locale);
export const tableSelectedLabel = (locale: string) => pick(TABLE_SELECTED, locale);
export const phoneCountryLabel = (locale: string, country: string, code: string) => pick(PHONE_COUNTRY, locale).replace("{country}", country).replace("{code}", code);
export const phoneCountryListLabel = (locale: string) => pick(PHONE_COUNTRY_LIST, locale);
export const phoneCountrySearchLabel = (locale: string) => pick(PHONE_COUNTRY_SEARCH, locale);
export const phoneSuggestedCountriesLabel = (locale: string) => pick(PHONE_SUGGESTED_COUNTRIES, locale);
export const phoneAllCountriesLabel = (locale: string) => pick(PHONE_ALL_COUNTRIES, locale);
export const phoneTooShortLabel = (locale: string, country: string, digits: string) => pick(PHONE_TOO_SHORT, locale).replace("{country}", country).replace("{digits}", digits);
export const phoneTooLongLabel = (locale: string, country: string, digits: string) => pick(PHONE_TOO_LONG, locale).replace("{country}", country).replace("{digits}", digits);
export const showAllLabel = (locale: string) => pick(SHOW_ALL, locale);
export const showFewerLabel = (locale: string) => pick(SHOW_FEWER, locale);
export const heatmapLessLabel = (locale: string) => pick(HEATMAP_LESS, locale);
export const heatmapMoreLabel = (locale: string) => pick(HEATMAP_MORE, locale);
export const chartBandLabel = (locale: string, from: string, to: string) => pick(CHART_BAND, locale).replace("{from}", from).replace("{to}", to);
export const chartStatusLabel = (locale: string) => pick(CHART_STATUS, locale);
export const chartConversionLabel = (locale: string) => pick(CHART_CONVERSION, locale);
export const chartValueLabel = (locale: string) => pick(CHART_VALUE, locale);
export const chartNoDataLabel = (locale: string) => pick(CHART_NO_DATA, locale);
export const chartPeriodLabel = (locale: string) => pick(CHART_PERIOD, locale);
export const chartFromLabel = (locale: string) => pick(CHART_FROM, locale);
export const chartToLabel = (locale: string) => pick(CHART_TO, locale);
export const chartNotesLabel = (locale: string) => pick(CHART_NOTES, locale);
export const chartCategoryLabel = (locale: string) => pick(CHART_CATEGORY, locale);
export const chartChangeLabel = (locale: string) => pick(CHART_CHANGE, locale);
export const chartTotalLabel = (locale: string) => pick(CHART_TOTAL, locale);
export const chartIncreaseLabel = (locale: string) => pick(CHART_INCREASE, locale);
export const chartDecreaseLabel = (locale: string) => pick(CHART_DECREASE, locale);
export const chartNoValueLabel = (locale: string) => pick(CHART_NO_VALUE, locale);
export const showDataTableLabel = (locale: string) => pick(SHOW_DATA_TABLE, locale);
export const hideDataTableLabel = (locale: string) => pick(HIDE_DATA_TABLE, locale);
/** The selection column's name where there is no select-all checkbox. */
export const selectionLabel = (locale: string) => pick(SELECTION, locale);
/** "Acme home": a brand link's name. */
export const homePageLabel = (locale: string, name: string) => pick(HOME_PAGE, locale).replace("{name}", name);
export const locationLabel = (locale: string) => pick(LOCATION, locale);
export const showHiddenLevelsLabel = (locale: string) => pick(SHOW_HIDDEN_LEVELS, locale);
export const pagesLabel = (locale: string) => pick(PAGES, locale);
export const previousPageLabel = (locale: string) => pick(PREVIOUS_PAGE, locale);
export const nextPageLabel = (locale: string) => pick(NEXT_PAGE, locale);
export const tourNextLabel = (locale: string) => pick(TOUR_NEXT, locale);
export const tourBackLabel = (locale: string) => pick(TOUR_BACK, locale);
export const tourSkipLabel = (locale: string) => pick(TOUR_SKIP, locale);
export const tourFinishLabel = (locale: string) => pick(TOUR_FINISH, locale);
export const perPageLabel = (locale: string) => pick(PER_PAGE, locale);
export const pageLabel = (locale: string, n: number) => pick(PAGE_N, locale).replace("{n}", formatCount(locale, n));
export const pageOfLabel = (locale: string, page: number, total: number) =>
  pick(PAGE_OF, locale).replace("{page}", formatCount(locale, page)).replace("{total}", formatCount(locale, total));
/** "41–60 of 1,204"; consumers name the items with their own sentence. */
export const rangeOfLabel = (locale: string, from: number, to: number, total: number) =>
  pick(RANGE_OF, locale).replace("{from}", formatCount(locale, from)).replace("{to}", formatCount(locale, to)).replace("{total}", formatCount(locale, total));
export const openMenuLabel = (locale: string) => pick(OPEN_MENU, locale);
export const languageLabel = (locale: string) => pick(LANGUAGE, locale);
export const collapseSidebarLabel = (locale: string) => pick(COLLAPSE_SIDEBAR, locale);
export const expandSidebarLabel = (locale: string) => pick(EXPAND_SIDEBAR, locale);
export const commandPaletteLabel = (locale: string) => pick(COMMAND_PALETTE, locale);
export const commandSearchLabel = (locale: string) => pick(COMMAND_SEARCH, locale);
export const recentRecordsLabel = (locale: string) => pick(RECENT_RECORDS, locale);
export const frequentActionsLabel = (locale: string) => pick(FREQUENT_ACTIONS, locale);
export const commandHints = (locale: string) => ({ move: pick(HINT_MOVE, locale), open: pick(HINT_OPEN, locale), close: pick(HINT_CLOSE, locale) });
export const rangeTooShortLabel = (locale: string) => pick(RANGE_TOO_SHORT, locale);
export const rangeTooLongLabel = (locale: string) => pick(RANGE_TOO_LONG, locale);
export const rangeCrossesClosedLabel = (locale: string) => pick(RANGE_CROSSES_CLOSED, locale);
export const rangeMinLabel = (locale: string) => pick(RANGE_MIN, locale);
export const rangeMaxLabel = (locale: string) => pick(RANGE_MAX, locale);
export const cancelUploadLabel = (locale: string) => pick(CANCEL_UPLOAD, locale);
export const removeFileLabel = (locale: string) => pick(REMOVE_FILE, locale);
export const replaceLabel = (locale: string) => pick(REPLACE, locale);
export const uploadedLabel = (locale: string) => pick(UPLOADED, locale);
export const DS_STRINGS = {
  chooseFiles: CHOOSE_FILES, orChoose: OR_CHOOSE, upTo: UP_TO, tooLarge: TOO_LARGE, wrongType: WRONG_TYPE, onlyOne: ONLY_ONE, selectPlaceholder: SELECT_PLACEHOLDER, selectAll: SELECT_ALL, selectedCount: SELECTED_COUNT, moreCount: MORE_COUNT, removeItem: REMOVE_ITEM, noMatch: NO_MATCH, createItem: CREATE_ITEM, loading: LOADING, showSuggestions: SHOW_SUGGESTIONS, clearAll: CLEAR_ALL, actionFailed: ACTION_FAILED, retry: RETRY, errorCode: ERROR_CODE, selected: SELECTED, online: ONLINE, morePeople: MORE_PEOPLE, deltaUp: DELTA_UP, deltaDown: DELTA_DOWN, noChange: NO_CHANGE, notSet: NOT_SET, copyValue: COPY_VALUE, copy: COPY, copied: COPIED, copyFailed: COPY_FAILED, imagePosition: IMAGE_POSITION, previousImage: PREVIOUS_IMAGE, nextImage: NEXT_IMAGE, goToImage: GO_TO_IMAGE, previousMonth: PREVIOUS_MONTH, nextMonth: NEXT_MONTH, theme: THEME, themeSystem: THEME_SYSTEM, themeLight: THEME_LIGHT, themeDark: THEME_DARK, themeNowLight: THEME_NOW_LIGHT, themeNowDark: THEME_NOW_DARK, rangeMin: RANGE_MIN, rangeMax: RANGE_MAX, rangeTooShort: RANGE_TOO_SHORT, rangeTooLong: RANGE_TOO_LONG, rangeCrossesClosed: RANGE_CROSSES_CLOSED, today: TODAY, rangeStart: RANGE_START, rangeEnd: RANGE_END, rangePresets: RANGE_PRESETS, rangeStartTime: RANGE_START_TIME, rangeEndTime: RANGE_END_TIME, monthHasDays: MONTH_HAS_DAYS, thisMonthHasDays: THIS_MONTH_HAS_DAYS, dateIncomplete: DATE_INCOMPLETE, dateTimeIncomplete: DATE_TIME_INCOMPLETE, timeIncomplete: TIME_INCOMPLETE, preview: PREVIEW, previewAction: PREVIEW_ACTION, lowInLight: LOW_IN_LIGHT, lowInDark: LOW_IN_DARK, fixInLight: FIX_IN_LIGHT, fixInDark: FIX_IN_DARK, noStepPasses: NO_STEP_PASSES, hexExpected: HEX_EXPECTED, customColor: CUSTOM_COLOR, nameSelected: NAME_SELECTED, cancel: CANCEL, typeToConfirm: TYPE_TO_CONFIRM, unsavedTitle: UNSAVED_TITLE, unsavedBody: UNSAVED_BODY, discardClose: DISCARD_CLOSE, keepEditing: KEEP_EDITING, expandSheet: EXPAND_SHEET, collapseSheet: COLLAPSE_SHEET, location: LOCATION, showHiddenLevels: SHOW_HIDDEN_LEVELS, pages: PAGES, previousPage: PREVIOUS_PAGE, nextPage: NEXT_PAGE, tourNext: TOUR_NEXT, tourBack: TOUR_BACK, tourSkip: TOUR_SKIP, tourFinish: TOUR_FINISH, pageN: PAGE_N, pageOf: PAGE_OF, rangeOf: RANGE_OF, perPage: PER_PAGE, stepN: STEP_N, stepNOf: STEP_N_OF, stepDone: STEP_DONE, stepNow: STEP_NOW, stepNeedsYou: STEP_NEEDS_YOU, stepWithProvider: STEP_WITH_PROVIDER, stepFailed: STEP_FAILED, progressSteps: PROGRESS_STEPS, stepsAllDone: STEPS_ALL_DONE, clearSelection: CLEAR_SELECTION, skipToContent: SKIP_TO_CONTENT, sparklineSummary: SPARKLINE_SUMMARY, gaugeTarget: GAUGE_TARGET, chartOther: CHART_OTHER, chartShare: CHART_SHARE, chartTrend: CHART_TREND, cropHelp: CROP_HELP, cropStatus: CROP_STATUS, cropCentered: CROP_CENTERED, cropPosition: CROP_POSITION, cropZoom: CROP_ZOOM, cropZoomIn: CROP_ZOOM_IN, cropZoomOut: CROP_ZOOM_OUT, cropRotateLeft: CROP_ROTATE_LEFT, cropRotateRight: CROP_ROTATE_RIGHT, cropAspect: CROP_ASPECT, cropFit: CROP_FIT, cropCover: CROP_COVER, cropContain: CROP_CONTAIN, cropSaveFailed: CROP_SAVE_FAILED, cropBackground: CROP_BACKGROUND, colorWhite: COLOR_WHITE, colorLightGrey: COLOR_LIGHT_GREY, colorBlack: COLOR_BLACK, cropOutput: CROP_OUTPUT, cropKeepsAlpha: CROP_KEEPS_ALPHA, cropSmall: CROP_SMALL, cropSave: CROP_SAVE, cropTooLarge: CROP_TOO_LARGE, cropLoadFailed: CROP_LOAD_FAILED, tableSearch: TABLE_SEARCH, tableColumns: TABLE_COLUMNS, tableClearFilters: TABLE_CLEAR_FILTERS, tableEmpty: TABLE_EMPTY, tableNoResults: TABLE_NO_RESULTS, tableLoadFailed: TABLE_LOAD_FAILED, tableLoadFailedHint: TABLE_LOAD_FAILED_HINT, tableRefreshFailed: TABLE_REFRESH_FAILED, tableRefreshFailedHint: TABLE_REFRESH_FAILED_HINT, tableTools: TABLE_TOOLS, about: ABOUT, tableSelected: TABLE_SELECTED, phoneCountry: PHONE_COUNTRY, phoneCountryList: PHONE_COUNTRY_LIST, phoneCountrySearch: PHONE_COUNTRY_SEARCH, phoneSuggestedCountries: PHONE_SUGGESTED_COUNTRIES, phoneAllCountries: PHONE_ALL_COUNTRIES, phoneTooShort: PHONE_TOO_SHORT, phoneTooLong: PHONE_TOO_LONG, showAll: SHOW_ALL, showFewer: SHOW_FEWER, heatmapLess: HEATMAP_LESS, heatmapMore: HEATMAP_MORE, chartBand: CHART_BAND, chartStatus: CHART_STATUS, chartConversion: CHART_CONVERSION, chartValue: CHART_VALUE, chartNoData: CHART_NO_DATA, chartPeriod: CHART_PERIOD, chartNotes: CHART_NOTES, chartFrom: CHART_FROM, chartTo: CHART_TO, chartCategory: CHART_CATEGORY, chartChange: CHART_CHANGE, chartTotal: CHART_TOTAL, chartIncrease: CHART_INCREASE, chartDecrease: CHART_DECREASE, chartNoValue: CHART_NO_VALUE, showDataTable: SHOW_DATA_TABLE, hideDataTable: HIDE_DATA_TABLE, selection: SELECTION, homePage: HOME_PAGE, mainNavigation: MAIN_NAVIGATION, openMenu: OPEN_MENU, language: LANGUAGE, collapseSidebar: COLLAPSE_SIDEBAR, expandSidebar: EXPAND_SIDEBAR, commandPalette: COMMAND_PALETTE, commandSearch: COMMAND_SEARCH, recentRecords: RECENT_RECORDS, frequentActions: FREQUENT_ACTIONS, hintMove: HINT_MOVE, hintOpen: HINT_OPEN, hintClose: HINT_CLOSE,
  cancelUpload: CANCEL_UPLOAD, removeFile: REMOVE_FILE, replace: REPLACE, uploaded: UPLOADED,
  resend: RESEND, resendIn: RESEND_IN, increase: INCREASE, decrease: DECREASE,
  required: REQUIRED, limitExceeded: LIMIT_EXCEEDED,
  close: CLOSE, newTab: NEW_TAB, optional: OPTIONAL, clear: CLEAR, showPassword: SHOW_PASSWORD,
  hidePassword: HIDE_PASSWORD, overLimit: OVER_LIMIT,
  previousYear: PREVIOUS_YEAR, nextYear: NEXT_YEAR, thisMonth: THIS_MONTH,
  dateMin: DATE_MIN, dateMax: DATE_MAX, monthMin: MONTH_MIN, monthMax: MONTH_MAX, dateUnavailable: DATE_UNAVAILABLE,
};
export const DS_STRENGTH = STRENGTH;
