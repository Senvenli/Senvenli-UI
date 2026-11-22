export { DesignSystemProvider, type DesignSystemProviderProps } from "./provider";
export type { Tone } from "./tone";
export type { Density } from "./density";
export { ComponentDefaultsProvider, MotionScope, useComponentDefaults, useReducedMotion } from "./defaults";
export type { ComponentDefaults, ComponentMotion, ComponentRadius, ComponentSize } from "./defaults";
export { cn, TEXT_STYLES } from "./utils";
export { LAYER, FLOATING_BANNER_OFFSET } from "./layers";
export { registerDsStrings, hasDsStrings, type DsStringKey, type DsStringsInput } from "./i18n";
export {
  registerLocaleAliases,
  registerLocalWords,
  intlLocale,
  contentLang,
  formatDateTime,
  regionNames,
} from "./intl-locale";
