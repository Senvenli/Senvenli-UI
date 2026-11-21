import { getNiceTickValues } from "recharts";

import { localWords } from "../intl-locale";
import type { ChartValueFormatter } from "./chart-parts";

/*
 * How wide a vertical axis must be for its ticks, and how a tick or a bar-end label fits the room
 * it has. Shared by every chart with a value axis; not exported from the package.
 *
 * Recharts draws a tick on a vertical axis 8px in from the plot (its tick size, 6px, and tick margin, 2px, also
 * with the tick line off), and keeps a tick on one line only while the tick, measured, is narrower than the
 * width it is given (strictly: `width < given`). Each tick is given the axis's width less those 8px
 * ({@link tickWrapWidth}): the room it has between the axis's outer edge and where it is drawn. So an axis 8px
 * wider than its longest tick's estimate draws that tick whole, on one line.
 *
 * A tick is estimated by {@link textWidth}: each character at the widest Geist or its fallback draws it at 11px,
 * so a tick is never wider than its estimate, before the web font loads too.
 */
/** Recharts' tick size and tick margin: where a vertical axis draws its ticks from the plot's edge. */
export const TICK_INSET = 8;
/**
 * Past this an axis would squeeze the plot, so a value axis the DS sizes is never wider (an axis that
 * grew for an unbreakable tick left a 320px chart a 26px plot). A tick estimated longer than the room the clamped
 * axis leaves it (128px less the 8px inset) wraps between its units, as each tick's width is that room; one that
 * cannot is shown compact by the DS's ticks ({@link tickText}); what still does not fit is clipped within the axis
 * by the tick itself (value-tick's ValueTick), its reading start kept, its whole text its accessible name and hover
 * title: never over the plot, never past the chart's edge.
 */
export const AXIS_MAX = 128;

/**
 * @internal A value as Recharts plots it on a number axis (its `makeNumber`): a number (a `Number` object too), or
 * a string or date that converts to one, when the result is finite; `undefined` otherwise (a gap: null, missing,
 * "abc", NaN). `"1500000"` is drawn at 1,500,000, so it counts wherever the plotted values count and is shown
 * wherever they are shown (the data table, the tooltip).
 */
export function chartNumber(value: unknown): number | undefined {
  if (typeof value !== "number" && !(value instanceof Number) && typeof value !== "string" && !(value instanceof Date)) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

/*
 * Character widths in hundredths of a px at 11px, measured in Chromium: each
 * character alone, the widest it is drawn by any face a chart may use, hinted to whole pixels (as Linux draws) and at
 * its true advance (as macOS and Windows draw): Geist; the "Geist Fallback" apps get from next/font (Arial at
 * size-adjust 104.76%, as a Next.js build emits it), drawn before Geist loads; Arial (as Liberation Sans, its metric
 * twin); system-ui, Noto Sans and DejaVu Sans, which draw what the others lack. Kerning only narrows a pair, and a
 * mark set on a letter (an accent, once decomposed; a vowel sign in an Indic script) takes no room of its own, so a
 * text is never wider than the sum of its characters. Each character is measured in pages of 31 languages too, as
 * Chromium picks an Arabic, Persian, Indic or Han fallback face by the page's language (ar-EG draws Arabic-Indic
 * figures wider than ar). Checked against every number Intl formats (246 locales, every numbering system; decimal,
 * currency by symbol, code and name, compact short and long, percent, units), each drawn in a page of its own
 * language (36,489 strings): none is wider than its estimate in any of the faces.
 */
/** Every base character of Latin (to Latin Extended-B), Greek, Cyrillic, Armenian, Hebrew and Arabic, the spaces, punctuation and currency signs. */
const MEASURED: readonly (readonly [number, string])[] = [
  [125, "\u200a"],
  [200, "ۥ\u2006⁄"],
  [250, "\u2009\u202f"],
  [275, "՛՝′"],
  [300, "լյויןٱٲٳ\u2005\u205f"],
  [304, "'"],
  [307, "ijl"],
  [325, "ıłƚǃȷɉͿϳіјֈ؞اـٴ"],
  [350, " ,.\u00a0ՙ՚۔\u2008‘’‚‛⁞"],
  [372, ":;"],
  [374, "I"],
  [375, "ƗǀΙІӀӏ։"],
  [400, "·ŀſƖ͵ι՜ז،؛٫٬ۦ\u2004‐‑⁏⁚⁝"],
  [425, "؍ۯ⁁"],
  [430, "()[]"],
  [433, "t"],
  [434, "f"],
  [443, "!"],
  [450, "¡²³¹ŧƫƭչٵہۃ″‸‹›⁅⁆"],
  [455, "r"],
  [475, "ɍ"],
  [500, "-\\ƪ՞ւ֊גנ׳؋ٶۄۅۉۊۏ۽‶⁒"],
  [507, "\""],
  [525, "ªºȴȶϝءدذڈډڊڋڌڍڎڏڐۮ"],
  [528, "/"],
  [550, "`°´¸ɂ՟շرزوڑڒړڗژڙۆۇۈۋ۾‾"],
  [575, "ǉȝէ“”„‟"],
  [600, "szƨƶƾȥȿɀɈεζϯгзѕѯґҙӷԑԼץװױײ؏؟ةه٠١٢٤٥٦٩٪٭ڔږە۰۱۲۴۵۶۹ۼ\u2002․‼‽⁃"],
  [607, "*c|"],
  [625, "¦ĳƈǁȼͱͻͼͽνξϲсэєҁҫջךכר‖⁎"],
  [649, "k"],
  [650, "¨ĸƙƽͺ΄κςχϛвтғҭӻԇԯל٣٧٨۳۷۸•‣‴⁊⁖"],
  [652, "vxy"],
  [675, "ƛɏγλτϮкухчь҂ҍҐқҝҟүұҳҹӌӽӿԟօ"],
  [700, "$?JL_abdeghnopqu{}¢£¤¥§«¯µ»ðþđĿŁŋƀƃƅƌƍƐƒƞƥƹƺƻƿǂǝǥȜȣȽɁɇɋΓδηθμορυϐϑϙϡϧϫϭϱϵ϶ϸϼЈГабеоряђѮѳҏҕҮҰҷһӄәӡөӶԁԐԛԩԭՒբեզըիծկհձղճմնոսվրցքבדעצعغمٷڕڠ۩‒–‗†‡‷₣₤₫₰₶₸₺"],
  [704, "FT"],
  [725, "¶¿ßøŦƑƩƬƮȾͰͳͷΣΤβσϏϜЗТилнпћџҘҬԓԧԷգժռףפ״؆؇جحخځڂڃڄڅچڇڿ⁋⁌⁍₮"],
  [750, "ƷƸƼαϗϟϥϰцѣҋҒңӆӈӊӠӺԍդۿ\u2007₹"],
  [755, "Z"],
  [775, "ħƔƵǷȢȤΖдҩԥՐ"],
  [800, "ABEKPSVXYÞƂƄƋƎƦƧȺɃɅɆɎΑΒΔΕΚΛΞΡΥΧπφϕϞϨϩϷϻЅАБВЕКРУХЧЬъѫѵҌҎҔҚҜҞҲҸҺӃӋӼӾԀԆԏԞԬԮԻՀՉՏאהחטםמסקתلڵڶڷڸھ€₭₱₳₷₽"],
  [825, "ƘƴȠҶҽҿԦԨԲԵԸԿՅՆՈՍՑթ֏نڹںڻڼڽ"],
  [850, "ͶϤϪЛмѻԒԳԴԶԺՁՂՃՇՋՔ؉ؠؽؾؿۑ⁈⁉₾"],
  [858, "&"],
  [875, "ϦѧӅӎԤՖ₴"],
  [900, "CDGHNOQRUÐØĐŉŊƁƆƇƉƏƓƝƟƤƱƲƳǤȻɄɊɌΗΘΝΟΠΩψϒϘϚϬϴϹϽϾϿЄЏДИНОПСЦЭЯыѢѥѲҀҊҢҪҵӇӉӘӨԌԎԚԝՄՊՌՎՓՕֆև֍֎שׯ؝قىيٯڧڨیێې‿⁀⁐⁔⁗⁛₡₢₦₲₵₻₼₿⃀⃁"],
  [901, "w"],
  [922, "#+<=>^~"],
  [925, "¬±×÷ωѡѿҡԱ⁕⁘⁙⁜−"],
  [950, "ĲƣȡȵͲϖФюҠԹԾٸ"],
  [975, "ǌϠѦѱҥҨԗ₠"],
  [1000, "MƊǈΜΦΨϣϺЂЋМЪжфњѪѭѰѴҗԅԖԡ؎ػؼكکګڬڭڮگڰڱڲڳڴۍ₪"],
  [1025, "ĦшҧӍԣԽՠ؈طظڟ⁇"],
  [1050, "щѺҼҾے"],
  [1072, "m"],
  [1075, "¼½¾ապտփ₥"],
  [1100, "%W©®æƕȸȹϢЫљѤҴӕԃԉԋԕԙԜխ؊بتثٮٹٺٻټٽپٿڀ۞‥‧‵※⁑⁓₩\u3000"],
  [1125, "ǋѩҤԄ"],
  [1150, "œƜѽԘفڡڢڣڤڥڦ"],
  [1200, "@ÆŒƢЖШЮҖӔԂԈԠڪ\u2003—―…"],
  [1225, "ǶЊЩѹԊԢ"],
  [1250, "⁂"],
  [1300, "ǆǇǳЉѨѬԔԫ"],
  [1325, "﷼"],
  [1350, "Ѹسشښڛڜۺ"],
  [1400, "ѼҦ₧₨₯"],
  [1450, "صضڝڞۻ"],
  [1500, "ǅǊǲ‰"],
  [1550, "Ԫ"],
  [1600, "ǄǱѠѾ"],
  [1925, "‱"],
  [7950, "﷽"],
];
/** Proportional figures (labels), "0" to "9": Geist's "0" is its widest. */
const PROPORTIONAL_FIGURES = [729, 700, 700, 700, 700, 700, 700, 700, 700, 700] as const;
/** Tabular figures (axis ticks, `tabular-nums`): 7px in every face (Geist's are 7px hinted, 6.6px at their true advance). */
const TABULAR_FIGURE = 700;
const GLYPHS = new Map<string, number>(MEASURED.flatMap(([width, chars]) => Array.from(chars, (char) => [char, width] as const)));
/**
 * Any other letter, spacing mark or figure, by its script: the widest measured in it (Han and kana 1em; Tamil and
 * Myanmar letters and vowel signs up to 28px, "ஔ"). A script missing here, or one the browser's regular expressions
 * do not know yet, counts at 36px, the widest letter of any script (a cuneiform sign).
 */
const SCRIPT_WIDTHS: readonly (readonly [number, string])[] = [
  [1100, "Adlam Anatolian_Hieroglyphs Bamum Bopomofo Carian Caucasian_Albanian Chorasmian Cypriot Cypro_Minoan Deseret Dives_Akuru Dogra Elbasan Gothic Han Hangul Hanifi_Rohingya Hatran Hebrew Hiragana Imperial_Aramaic Kaithi Katakana Kawi Kayah_Li Kharoshthi Khitan_Small_Script Lisu Lycian Lydian Makasar Marchen Modi Mro Multani Nabataean Nag_Mundari Nandinagari Nko Nushu Nyiakeng_Puachue_Hmong Ol_Chiki Old_North_Arabian Old_Permic Old_South_Arabian Old_Turkic Old_Uyghur Osage Osmanya Pahawh_Hmong Pau_Cin_Hau Phoenician Rejang Runic Shavian Siddham Sora_Sompeng Syloti_Nagri Tai_Le Takri Tangsa Tangut Thai Tibetan Tifinagh Toto Vithkuqi Wancho Warang_Citi Yezidi Yi"],
  [1300, "Bassa_Vah Batak Bengali Bhaiksuki Brahmi Buhid Chakma Coptic Devanagari Elymaic Georgian Gujarati Gunjala_Gondi Hanunoo Khojki Lao Lepcha Mahajani Mandaic Meetei_Mayek Old_Hungarian Palmyrene Phags_Pa Samaritan Sharada Tagalog Tagbanwa Thaana Zanabazar_Square"],
  [1550, "Ahom Avestan Buginese Cherokee Cyrillic Duployan Ethiopic Glagolitic Greek Inscriptional_Pahlavi Inscriptional_Parthian Khmer Khudawadi Latin Limbu Linear_A Manichaean Masaram_Gondi Medefaidrin Mende_Kikakui Miao Mongolian New_Tai_Lue Ogham Old_Sogdian Psalter_Pahlavi Soyombo Syriac Tai_Tham Tai_Viet Tirhuta Ugaritic Vai"],
  [1800, "Armenian Canadian_Aboriginal Cham Gurmukhi Javanese Meroitic_Hieroglyphs Newa Old_Italic Oriya Saurashtra Sogdian"],
  [2200, "Balinese Egyptian_Hieroglyphs Kannada Linear_B Meroitic_Cursive Old_Persian Sinhala Sundanese Telugu"],
  [2400, "Malayalam"],
  [2800, "Arabic Myanmar Tamil"],
  [2400, "Common Inherited"],
];
const UNKNOWN_LETTER = 3600;
const SCRIPTS = SCRIPT_WIDTHS.flatMap(([width, names]) =>
  names.split(" ").flatMap((name) => {
    try {
      return [[new RegExp(`\\p{Script=${name}}`, "u"), width] as const];
    } catch {
      return [];
    }
  }),
);
/** Any other space; any other sign or punctuation mark (the widest measured, "⸻", 31.25px). */
const OTHER_SPACE = 1200;
const OTHER_SIGN = 3125;

function charWidth(char: string, tabular: boolean): number {
  if (char >= "0" && char <= "9") return tabular ? TABULAR_FIGURE : PROPORTIONAL_FIGURES[char.charCodeAt(0) - 48]!;
  const known = GLYPHS.get(char);
  if (known !== undefined) return known;
  // Format and bidi marks (U+200F, U+061C…) and marks set on a letter take no room.
  if (/[\p{Cf}\p{Mn}\p{Me}]/u.test(char)) return 0;
  if (/[\p{L}\p{N}\p{Mc}]/u.test(char)) {
    for (const [script, width] of SCRIPTS) if (script.test(char)) return width;
    return UNKNOWN_LETTER;
  }
  if (/\s/u.test(char)) return OTHER_SPACE;
  return OTHER_SIGN;
}

/** How a text's figures are drawn: `tabular` (`tabular-nums`, value ticks) or `proportional` (labels). */
type Figures = "proportional" | "tabular";

/**
 * @internal A text's width in px as drawn at 11px, estimated from its characters: the sum of each
 * character's widest width (see above), accents decomposed (a Turkish "ş" counts as an "s"), rounded up. Never
 * under the text as any of the measured faces draws it, Geist's next/font fallback included, in any script: a figure
 * 7px, "." and "," 3.5px, the space 3.5px, "€" 8px, "%" 11px, a Latin letter 3–11px ("W" 11px), a Cyrillic or
 * Greek one up to 16px ("Ѡ"), an Arabic one up to 14.5px. `tabular` for `tabular-nums` figures (axis ticks),
 * proportional otherwise (labels). The same on the server, in tests and before the web font loads, so a layout sized
 * by it never moves after the first render.
 */
export function textWidth(text: string, figures: Figures = "proportional"): number {
  let hundredths = 0;
  for (const char of text.normalize("NFD")) hundredths += charWidth(char, figures === "tabular");
  return Math.ceil(hundredths / 100);
}

/**
 * The axis's width for these ticks: the longest's {@link textWidth} (in tabular figures, as ticks are drawn), plus
 * the 8px inset and any further room the axis holds beside its ticks (an axis name), within min–128px.
 *
 * With the chart's `locale`, ticks as the axis shows them ({@link tickText}): when a tick does not fit the room
 * the 128px axis leaves it, even between its units, every tick is shown with its figures compact and exact
 * ("€ 150 Tn", "€ 2,25 Mn"), and the axis is sized for the longest line of those, so a compact axis is no wider
 * than its ticks. Never past 128px: a tick that still does not fit (a formatter's long word against a figure) is
 * clipped within the axis by the tick (value-tick's ValueTick), never the plot squeezed for it.
 *
 * The ticks are drawn in the room the axis then gives them (its width less the inset and `room`): no wider than
 * the 120px (less `room`) they are laid out in here, and no narrower than their longest line, and in any room
 * between those {@link tickText} lays them out the same (what did not fit the wider room fits no narrower one, and
 * each line kept fits both), so the ticks drawn are the ones the axis was sized for. `values` are the values the ticks
 * were formatted from ({@link formattedValues}), as the ticks are given them, so both read the figures alike.
 */
export function tickAxisWidth(ticks: Iterable<string>, min: number, room = 0, locale?: string, values?: FormattedValues): number {
  const texts = [...ticks];
  let longest = 0;
  for (const tick of texts) longest = Math.max(longest, textWidth(tick, "tabular"));
  const whole = Math.min(AXIS_MAX, Math.max(min, longest + TICK_INSET + room));
  // Under the clamp every tick has the room of the longest, on one line; only at it may one not fit.
  const tickRoom = tickWrapWidth(whole, room);
  if (locale === undefined || whole < AXIS_MAX || !compactsAxis(texts, tickRoom)) return whole;
  let shown = 0;
  for (const tick of texts) for (const line of tickText(tick, tickRoom, locale, texts, values).lines) shown = Math.max(shown, textWidth(line, "tabular"));
  return Math.min(AXIS_MAX, Math.max(min, shown + TICK_INSET + room));
}

/** The px a value tick's line takes (its 11px font, one line under the last, `dy` 1em). */
const TICK_LINE = 11;

/**
 * @internal How far a value axis's top tick stands above its gridline, past one line: a
 * tick is centered on its gridline, so a tick of `n` lines reaches (n − 1) half-lines higher than a one-line tick,
 * and the chart's top margin (which holds a one-line tick's upper half) takes that much more, so the tick stays
 * inside the chart ("€ 1.500.000 net | this month" passed the svg's top by 4px). `top` is the topmost tick as formatted,
 * `axisTexts` every tick of the axis, `values` the values they were formatted from, `room` what the tick is given; 0
 * for a one-line top tick.
 */
export function tickOverhang(top: string | undefined, room: number, locale: string, axisTexts: readonly string[] = [], values?: FormattedValues): number {
  if (top === undefined) return 0;
  const { lines } = tickText(top, room, locale, axisTexts, values);
  return Math.ceil(((lines.length - 1) * TICK_LINE) / 2);
}

/**
 * The width Recharts may give each tick of an axis this wide before it wraps the tick at a space: the axis less
 * its 8px inset and any room beside the ticks. Below the 128px clamp it is never reached (the axis was sized for
 * the longest tick); at the clamp it is exactly the room left, so a longer tick wraps rather than crossing the
 * axis's outer edge.
 */
export function tickWrapWidth(axisWidth: number, room = 0): number {
  return Math.max(0, axisWidth - TICK_INSET - room);
}

/**
 * The ticks Recharts draws on a value axis whose domain is `[0, "auto"]` (its default): the range of the
 * values, always with zero in it, extended to Recharts' own nice ticks (its public `getNiceTickValues`, as the
 * axis calls it). Values count as Recharts plots them ({@link chartNumber}): numeric strings among them; a gap
 * is left out, as the plot leaves it out. `allowDecimals: false` keeps the steps whole, as the axis's own
 * `allowDecimals` does: counts read 0 / 1 / 2 / 3, never 0.7 / 1.4 / 2.1.
 */
export function valueAxisTicks(values: Iterable<unknown>, tickCount: number, allowDecimals = true): number[] {
  let low = 0;
  let high = 0;
  for (const value of values) {
    const number = chartNumber(value);
    if (number === undefined) continue;
    low = Math.min(low, number);
    high = Math.max(high, number);
  }
  return getNiceTickValues([low, high], tickCount, allowDecimals, "adaptive");
}

/**
 * The width of a value axis over these values: its ticks as Recharts computes them, formatted as the axis
 * formats them, through {@link tickAxisWidth} (with the chart's `locale`, as the axis shows them).
 */
export function valueAxisWidth(values: Iterable<unknown>, format: ChartValueFormatter, options: { tickCount: number; min: number; locale?: string; allowDecimals?: boolean }): number {
  const ticks = valueAxisTicks(values, options.tickCount, options.allowDecimals);
  return tickAxisWidth(ticks.map(format), options.min, 0, options.locale, formattedValues(ticks, format));
}

/* ── Units and lines ─────────────────────────────────────────── */

/**
 * The spaces a label may break at, as Recharts' Text breaks: ordinary ones only. A no-break space (U+00A0, U+202F)
 * is where Intl keeps a figure together ("1\u00a0450\u00a0000,00\u00a0€" in ru, fr), so it never parts.
 */
const BREAK = /([ \t\n\f\r\v\u2028\u2029]+)/;
/** The ordinary spaces at a text's start, and a word (up to the next ordinary space): as a label breaks. */
const SPACES_AHEAD = /^[ \t\n\f\r\v\u2028\u2029]+/;
const WORD_AHEAD = /^[^ \t\n\f\r\v\u2028\u2029]+/;
const LETTER = /\p{L}/u;
const DIGIT = /\p{Nd}/u;
/** A word that ends in a separator: a comma (Latin, Arabic, CJK), a semicolon, a slash, a bar, a middle dot or a dash. */
const SEPARATED = /[,،、，;؛；/|·•–—]$/u;

/** A run of a label's words that never parts, with the spaces before it. */
type TextUnit = { space: string; unit: string };

/** A label's words, each with the ordinary spaces before it. */
function wordsOf(text: string): { space: string; word: string }[] {
  const parts = text.split(BREAK);
  const words: { space: string; word: string }[] = [];
  for (let index = 0; index < parts.length; index += 2) {
    const word = parts[index]!;
    if (word !== "") words.push({ space: index === 0 ? "" : parts[index - 1]!, word });
  }
  return words;
}

/** Whether a figure stands ahead of `from`, before the next word with a letter: a separator there parts two figures. */
function figureAhead(words: readonly { word: string }[], from: number): boolean {
  for (let at = from; at < words.length; at += 1) {
    const { word } = words[at]!;
    if (DIGIT.test(word)) return true;
    if (LETTER.test(word)) return false;
  }
  return false;
}

/**
 * @internal A label's unbreakable units, each with the spaces before it. A label breaks only at a space
 * between two words that both hold a letter: a space beside a word without one (a figure, a currency sign, a minus,
 * a "%", a "/") never breaks. So a figure keeps the words a formatter writes against it, whatever they are and in any
 * locale: its sign and currency sign ("€ -350.000", "48.920,00 €", "% 12", "– 350.000 €"), its currency code or name
 * ("1.450.000 TL", "TRY 1.450.000", "1.450.000,00 Türk"), its unit ("-12.000 km", "120 km / h") and magnitude
 * ("€ 1,2 Mn", "-1,2 milyon", "-1.2 مليون"), and a word qualifying it ("€ 12.000.000 net", "total € 1.450.000");
 * only a phrase parts, between its own words ("124 orders | this month", "1.450.000,00 Türk | lirası"). No word list:
 * what a figure keeps is decided by where the formatter puts it, so it holds for any formatter and locale. A label
 * also breaks after a separator that ends a word between two figures, each with its words: a ","
 * or a "/" with a figure before it and another ahead, before the next word with a letter: "12 orders, | 3 canceled",
 * "€ 900.000 / | € 1.450.000 target", "€ 900 – | € 1.450", so a label of several figures wraps between them, each
 * figure still with its own words. A separator with no figure before it is a sign ("– 350.000 €"), and one with no
 * figure ahead parts no figures ("120 km / h", "€ 1.450.000 | target"): neither breaks. The one rule for
 * bar-end labels and value ticks.
 */
export function textUnits(text: string): TextUnit[] {
  const words = wordsOf(text);
  const units: (TextUnit & { lettered: boolean })[] = [];
  words.forEach(({ space, word }, at) => {
    const lettered = LETTER.test(word);
    const last = units.at(-1);
    // `lettered` on a unit is its last word's: a break needs a letter on both sides of the space, or a separator
    // between two figures before it.
    const separates = last !== undefined && SEPARATED.test(last.unit) && DIGIT.test(last.unit) && figureAhead(words, at);
    if (last && !(last.lettered && lettered) && !separates) {
      last.unit += space + word;
      last.lettered = lettered;
    } else units.push({ space: units.length === 0 ? "" : space, unit: word, lettered });
  });
  return units.map(({ space, unit }) => ({ space, unit }));
}

const joinUnits = (units: readonly TextUnit[]) => units.map((unit, index) => (index === 0 ? unit.unit : unit.space + unit.unit)).join("");

/**
 * Units laid into lines: each line as long as fits the room by {@link textWidth}. When a unit is wider than the room
 * the text stays one line (wider than the room, the caller places or shortens it): breaking it would only add lines
 * that still overflow.
 */
function unitLines(units: readonly TextUnit[], room: number, figures: Figures): string[] {
  if (units.some(({ unit }) => textWidth(unit, figures) > room)) return units.length > 0 ? [joinUnits(units)] : [];
  const lines: string[] = [];
  let line = "";
  for (const { space, unit } of units) {
    const joined = line === "" ? unit : line + space + unit;
    if (line !== "" && textWidth(joined, figures) > room) {
      lines.push(line);
      line = unit;
    } else {
      line = joined;
    }
  }
  if (line !== "") lines.push(line);
  return lines;
}

/**
 * @internal A text's lines for the room it has: whole when it fits, otherwise broken between its units
 * ({@link textUnits}: never beside a figure), each line as long as fits, by the same estimate as the room. When a
 * unit is wider than the room, the whole text on one line, wider than the room.
 */
export function textLines(text: string, room: number, figures: Figures = "proportional"): string[] {
  if (textWidth(text, figures) <= room) return [text];
  const lines = unitLines(textUnits(text), room, figures);
  return lines.length > 0 ? lines : [text];
}

const fitsRoom = (lines: readonly string[], room: number) => lines.every((line) => textWidth(line, "tabular") <= room);
/** Whether a tick fits its room, whole or between its units. */
const tickFits = (text: string, room: number) => fitsRoom(textLines(text, room, "tabular"), room);
/** Whether an axis shows its figures compact: one of its ticks does not fit the room, even between its units. */
const compactsAxis = (texts: readonly string[], room: number) => texts.some((text) => !tickFits(text, room));

/* ── Compact figures ─────────────────────────────────────────── */

/**
 * A figure as a formatter writes it: digits of one script with the group and decimal marks between them
 * ("150.000.000", "1\u00a0450\u00a0000,5", "١٥٠٬٠٠٠"); a plain space only as a group mark (three digits after it).
 */
const FIGURE = /\p{Nd}+(?:(?:[.,'’\u00a0\u202f\u2009٫٬]|\x20(?=\p{Nd}{3}(?!\p{Nd})))\p{Nd}+)*/gu;
/** Intl's names for the digit scripts a formatter may write in, by their zero. */
const NUMBERING = new Map([
  [0x30, "latn"],
  [0x660, "arab"],
  [0x6f0, "arabext"],
  [0x966, "deva"],
  [0x9e6, "beng"],
  [0xe50, "thai"],
  [0xff10, "fullwide"],
]);
/**
 * Marks that only ever group a figure's digits: the spaces, the apostrophes (de-CH) and the Arabic thousands
 * separator. The Arabic decimal separator only ever is the decimal mark. "." and "," are either, by the formatter's
 * locale, which need not be the chart's.
 */
const GROUP_MARK = /[\x20\u00a0\u2009\u202f'’٬]/;
const DECIMAL_MARK = "٫";

/** The zero of a digit's script: Unicode puts each script's ten digits in a row. */
function digitZero(code: number): number {
  let start = code;
  while (DIGIT.test(String.fromCodePoint(start - 1))) start -= 1;
  return code - ((code - start) % 10);
}

/**
 * Intl reads a decimal string exactly (Intl.NumberFormat v3, in every engine the DS supports), past a double's 15–17
 * digits; ES2022's types know only numbers. An engine without it reads the string as a number.
 */
type DecimalFormat = { format(value: string): string; formatToParts(value: string): Intl.NumberFormatPart[] };
const formats = new Map<string, DecimalFormat>();
function numberFormat(locale: string, options: Intl.NumberFormatOptions): DecimalFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let format = formats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(locale, options) as unknown as DecimalFormat;
    formats.set(key, format);
  }
  return format;
}

/** A figure's digits (as Latin ones) and the marks between them, each with the count of digits before it. */
type FigureMarks = { digits: string; marks: { mark: string; at: number }[] };

function figureMarks(figure: string): FigureMarks {
  let digits = "";
  const marks: { mark: string; at: number }[] = [];
  for (const char of figure) {
    const code = char.codePointAt(0)!;
    if (DIGIT.test(char)) digits += String(code - digitZero(code));
    else marks.push({ mark: char, at: digits.length });
  }
  return { digits, marks };
}

type Role = "group" | "decimal";
/** A way a formatter may have written a figure: each of its marks' role, and where that puts its decimal point. */
type Reading = { roles: ReadonlyMap<string, Role>; point: number };

/**
 * Where these roles put a figure's decimal point, when a formatter writes figures so: one decimal
 * mark at most, once, after every group mark; one group mark, the digits grouped as Intl groups them, in threes
 * ("1.450.000") or in the Indian way, twos then the last three ("1,45,00,000"), the first group one to three digits
 * (one or two in the Indian way) and never a leading zero. Undefined otherwise: "15.10.2026", "192.168.1.1",
 * "0555 123" and "1.4500" are not figures any formatter writes.
 */
function pointOf({ digits, marks }: FigureMarks, roles: ReadonlyMap<string, Role>): number | undefined {
  const decimals = marks.filter(({ mark }) => roles.get(mark) === "decimal");
  const groups = marks.filter(({ mark }) => roles.get(mark) === "group");
  if (decimals.length > 1) return undefined;
  const point = decimals[0]?.at ?? digits.length;
  if (groups.length === 0) return point;
  if (new Set(groups.map(({ mark }) => mark)).size > 1 || groups.some(({ at }) => at >= point) || digits[0] === "0") return undefined;
  const bounds = [0, ...groups.map(({ at }) => at), point];
  const [first, ...rest] = bounds.slice(1).map((bound, index) => bound - bounds[index]!);
  const threes = first! <= 3 && rest.every((size) => size === 3);
  const indian = first! <= 2 && rest.at(-1) === 3 && rest.slice(0, -1).every((size) => size === 2);
  return first! >= 1 && (threes || indian) ? point : undefined;
}

/**
 * Every reading of a figure a formatter may have written ({@link pointOf}): the spaces, the apostrophes (de-CH) and
 * the Arabic thousands separator only ever group; the Arabic decimal separator only ever is the decimal mark; "." and
 * "," are either, by the formatter's locale, which need not be the chart's. None for marks no formatter writes, one
 * when the marks prove themselves ("1.450.000", "1.450.000,5", "0,500"), two when they cannot tell ("1,500": fifteen
 * hundred in en, one and a half in de).
 */
function readingsOf(figure: FigureMarks): Reading[] {
  const distinct = [...new Set(figure.marks.map(({ mark }) => mark))];
  const choices = distinct.map((mark): readonly Role[] => (GROUP_MARK.test(mark) ? ["group"] : mark === DECIMAL_MARK ? ["decimal"] : ["group", "decimal"]));
  const readings: Reading[] = [];
  const walk = (at: number, roles: Map<string, Role>) => {
    if (at === distinct.length) {
      const point = pointOf(figure, roles);
      if (point !== undefined) readings.push({ roles: new Map(roles), point });
      return;
    }
    for (const role of choices[at]!) walk(at + 1, new Map(roles).set(distinct[at]!, role));
  };
  walk(0, new Map());
  return readings;
}

/** The marks an axis's figures prove to group, and the ones they prove to be the decimal mark. */
type MarkRoles = { group: ReadonlySet<string>; decimal: ReadonlySet<string>; byValue: boolean };

/**
 * Whether a reading agrees with what the axis proves: one formatter writes every tick of an axis, with one group mark
 * and one decimal mark, so a mark proven to group never is the decimal mark, and a mark is not a role another mark
 * proved. `proven` also asks that each mark's role be proven, by the mark itself or by the other mark's.
 */
function agrees(reading: Reading, { group, decimal }: MarkRoles, proven: boolean): boolean {
  for (const [mark, role] of reading.roles) {
    const same = role === "group" ? group : decimal;
    const other = role === "group" ? decimal : group;
    if (other.has(mark) || [...same].some((each) => each !== mark)) return false;
    if (proven && !same.has(mark) && ![...other].some((each) => each !== mark)) return false;
  }
  return true;
}

/**
 * Whether a figure read so is the value it was formatted from: equal to it, as rounded to the figure's last
 * significant digit (a formatter rounds to its fraction or significant digits: "1.450.000" for 1,450,000.4 or, at
 * two significant digits, for 1,452,345). The readings of a figure differ a thousandfold, so at most one is.
 */
function writesValue({ digits }: FigureMarks, point: number, value: number): boolean {
  const figure = Number(`${digits.slice(0, point) || "0"}.${digits.slice(point) || "0"}`);
  const lastSignificant = Math.max(...[...digits].map((digit, at) => (digit === "0" ? -1 : at)));
  const place = point - 1 - (lastSignificant < 0 ? digits.length - 1 : lastSignificant);
  const difference = Math.abs(figure - Math.abs(value));
  return difference <= 0.5 * 10 ** place * (1 + 1e-9) || difference <= Math.abs(value) * 4 * Number.EPSILON;
}

/**
 * @internal The values the ticks or labels of an axis were formatted from, by their formatted text:
 * what proves how the formatter writes its marks. A text formats one value, so the last one counts.
 */
export type FormattedValues = ReadonlyMap<string, number>;

/** @internal These values as `format` writes them ({@link FormattedValues}); a value that is not a finite number is left out. */
export function formattedValues(values: Iterable<unknown>, format: (value: number) => string): FormattedValues {
  const map = new Map<string, number>();
  for (const value of values) {
    const number = chartNumber(value);
    if (number !== undefined) map.set(format(number), number);
  }
  return map;
}

/**
 * What the figures of an axis prove of their marks ("1,500" from a de formatter in an en chart was read
 * as fifteen hundred, "1.5K"). With the values the ticks were formatted from, outright: the reading
 * under which a figure is its tick's value is the formatter's ("€60,000" of 60,000 proves "," groups; "1,500" of 1.5
 * that it is the decimal mark). A figure that is no value of its text (a formatter's own scaling, an identifier)
 * proves nothing. Only without values, by the figures alone: a mark a figure proves by its own marks
 * ({@link readingsOf}, one reading) holds for the others.
 */
function markRoles(texts: readonly string[], values: FormattedValues | undefined): MarkRoles {
  const group = new Set<string>();
  const decimal = new Set<string>();
  const known = values ? texts.flatMap((text) => (values.has(text) ? [[text, values.get(text)!] as const] : [])) : [];
  const byValue = known.length > 0;
  const prove = (reading: Reading) => {
    for (const [mark, role] of reading.roles) (role === "group" ? group : decimal).add(mark);
  };
  if (byValue) {
    for (const [text, value] of known) {
      for (const [match] of text.matchAll(FIGURE)) {
        const figure = figureMarks(match);
        const matching = readingsOf(figure).filter((reading) => writesValue(figure, reading.point, value));
        if (matching.length === 1) prove(matching[0]!);
      }
    }
  } else {
    for (const text of texts) {
      for (const [match] of text.matchAll(FIGURE)) {
        const readings = readingsOf(figureMarks(match));
        if (readings.length === 1) prove(readings[0]!);
      }
    }
  }
  // Proven both ways (two formatters, or a figure that only seemed one): proven neither.
  for (const mark of [...group]) {
    if (decimal.delete(mark)) group.delete(mark);
  }
  return { group, decimal, byValue };
}

/** A figure as the number it writes: its value as a decimal string, its digits' zero and Intl's name for them. */
type Figure = { value: string; zero: number; numbering: string | undefined };

/**
 * A figure read by the one reading ({@link readingsOf}) that agrees with what its axis proves ({@link markRoles}):
 * with values, only a reading the values prove; without, one its own marks or the axis's figures leave. Undefined
 * where no reading or more than one remains, so it is kept as written rather than misread (never by the chart's
 * locale, which need not be the formatter's), and under 1,000, which is short already.
 */
function readFigure(figure: string, roles: MarkRoles): Figure | undefined {
  const zero = digitZero(figure.codePointAt(0)!);
  const numbering = NUMBERING.get(zero);
  const marks = figureMarks(figure);
  const readings = readingsOf(marks).filter((reading) => agrees(reading, roles, roles.byValue));
  if (readings.length !== 1) return undefined;
  const { point } = readings[0]!;
  const whole = marks.digits.slice(0, point).replace(/^0+(?=\d)/, "");
  if (whole.length < 4) return undefined;
  return { value: `${whole}.${marks.digits.slice(point) || "0"}`, zero, numbering };
}

/**
 * A figure compact with exactly these fraction digits, or with as many as it needs (up to 20) when none are given:
 * then it is exact. In the locale and the figure's own digits.
 */
function compactParts(figure: Figure, locale: string, digits?: number): Intl.NumberFormatPart[] {
  const fraction = digits === undefined ? { maximumFractionDigits: 20 } : { minimumFractionDigits: digits, maximumFractionDigits: digits };
  return numberFormat(locale, { notation: "compact", numberingSystem: figure.numbering ?? "latn", ...fraction }).formatToParts(figure.value);
}

/** A figure's exact compact form: the magnitude Intl writes it in ("Mn", "ترليون"; none where a locale keeps it whole, as de under a million) and the fraction digits it needs. */
function exactCompact(figure: Figure, locale: string): { magnitude: string; digits: number } {
  const parts = compactParts(figure, locale);
  const magnitude = parts.filter((part) => part.type === "compact").map((part) => part.value).join("");
  const digits = parts.filter((part) => part.type === "fraction").reduce((sum, part) => sum + Array.from(part.value).length, 0);
  return { magnitude: `${figure.numbering ?? figure.zero}|${magnitude}`, digits };
}

/**
 * How an axis writes a figure short: compact (`padded` with its magnitude's fraction digits), or, `scientific`, in
 * scientific notation where that is narrower; undefined where it keeps it as written.
 */
type AxisFigures = (figure: string, padded: boolean, scientific: boolean) => string | undefined;

/**
 * The figures of an axis written short, in the chart's locale and the figure's own digits, always
 * exactly, so a tick never names a value its gridline does not stand at ("₺2,25 Tn", never Intl's "₺2,3 Tn" of two
 * significant digits; "€ 1,95 Mn", never "€ 2 Mn"):
 * - compact, in the fewest words its locale has; `padded`, the figures of one magnitude with the same fraction
 *   digits, as many as the one of them that needs most ("€ 1,50 Mn" beside "€ 2,25 Mn"; "€ 750 B" beside them keeps
 *   its own none); otherwise each with only the digits it needs ("€ 1,5 Mn"): still exact, and narrower, for an axis
 *   whose padded ticks do not fit;
 * - `scientific`, in scientific notation, exact ("1,5E29 €"), where that is narrower than compact: a figure past the
 *   largest magnitude its locale names, which compact keeps with every digit above it ("150 000 000 000 000 000 трлн
 *   €", "15,000,000,000,000京"). When an axis takes it is {@link shortText}'s, by fit.
 * Undefined under 1,000, where the figure's marks cannot be read for certain ({@link readFigure}), and where the
 * short form is no shorter than the figure as written ("1.450.000.000.007" stays): the figure is then kept as written.
 */
function axisFigures(texts: readonly string[], locale: string, values: FormattedValues | undefined, figures: Figures): AxisFigures {
  const roles = markRoles(texts, values);
  const digits = new Map<string, number>();
  type Forms = { exact: { magnitude: string; digits: number }; compact: (padded: boolean) => string; scientific: string };
  const forms = new Map<string, Forms | undefined>();
  const formsOf = (match: string) => {
    if (forms.has(match)) return forms.get(match);
    const figure = readFigure(match, roles);
    // A script Intl has no name for: its own digits for the Latin ones.
    const own = (text: string) => (figure?.numbering ? text : text.replace(/[0-9]/g, (digit) => String.fromCodePoint(figure!.zero + Number(digit))));
    const exact = figure && exactCompact(figure, locale);
    const found: Forms | undefined = figure && exact && {
      exact,
      compact: (padded: boolean) => own(compactParts(figure, locale, padded ? Math.max(exact.digits, digits.get(exact.magnitude) ?? 0) : exact.digits).map((part) => part.value).join("")),
      scientific: own(numberFormat(locale, { notation: "scientific", numberingSystem: figure.numbering ?? "latn", maximumFractionDigits: 20 }).format(figure.value)),
    };
    forms.set(match, found);
    return found;
  };
  const matches = texts.flatMap((text) => [...text.matchAll(FIGURE)].map(([match]) => match));
  for (const match of matches) {
    const found = formsOf(match);
    if (found) digits.set(found.exact.magnitude, Math.max(digits.get(found.exact.magnitude) ?? 0, found.exact.digits));
  }
  return (match, padded, scientific) => {
    const found = formsOf(match);
    if (!found) return undefined;
    const compact = found.compact(padded);
    const written = scientific && textWidth(found.scientific, figures) < textWidth(compact, figures) ? found.scientific : compact;
    // Exact can be long ("1,450000000007 Tn"): a figure is written short only where that is shorter.
    return textWidth(written, figures) < textWidth(match, figures) ? written : undefined;
  };
}

/**
 * A text as an axis shows it: its units, and where its figures stand (the first one's start, the last one's start
 * and its end, a compact magnitude with it).
 */
type Shown = { units: TextUnit[]; text: string; figures?: { first: number; last: number; end: number } };

/** Each unit with its figures written by `write` in place (a currency, a sign, a unit word stay as the formatter wrote them). */
function shownText(units: readonly TextUnit[], write: (figure: string) => string | undefined): Shown {
  let text = "";
  let first = -1;
  let last = -1;
  let end = -1;
  const shown = units.map(({ space, unit }, index) => {
    if (index > 0) text += space;
    let written = "";
    let from = 0;
    for (const match of unit.matchAll(FIGURE)) {
      written += unit.slice(from, match.index);
      last = text.length + written.length;
      if (first < 0) first = last;
      written += write(match[0]) ?? match[0];
      end = text.length + written.length;
      from = match.index + match[0].length;
    }
    written += unit.slice(from);
    text += written;
    return { space, unit: written };
  });
  return { units: shown, text, figures: first < 0 ? undefined : { first, last, end } };
}

/* ── The last resort ─────────────────────────────── */

/** The scripts written right to left whose letters are bidi class AL (Arabic letters) and R (the others), UAX #9. */
const AL_SCRIPT = /[\p{Script=Arabic}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Hanifi_Rohingya}]/u;
const R_SCRIPT = /[\p{Script=Hebrew}\p{Script=Nko}\p{Script=Samaritan}\p{Script=Mandaic}\p{Script=Adlam}\p{Script=Mende_Kikakui}\p{Script=Yezidi}]/u;
const RTL_LETTER = { test: (char: string) => LETTER.test(char) && (AL_SCRIPT.test(char) || R_SCRIPT.test(char)) };
/** A sign that is a figure's unit: a currency sign, a percent or per-mille sign. */
const UNIT_SIGN = /[\p{Sc}%‰‱]/u;
/** Words as they are compared with Intl's: format and bidi marks left out, every space one plain space. */
const plain = (text: string) => text.replace(/\p{Cf}/gu, "").replace(/\s+/gu, " ").trim();
/** The longest affix: a currency name or a unit runs to a few words ("Bosna-Hersek konvertibl markı"). */
const AFFIX_WORDS = 4;

type Affixes = { units: ReadonlySet<string>; magnitudes: ReadonlySet<string> };
const affixesByLocale = new Map<string, Affixes>();

/**
 * What Intl writes against a figure in the chart's locale: every currency's ISO code, symbol, narrow symbol and name
 * (each plural form), every unit short, narrow and long (each plural form), and the magnitudes of its compact
 * notation, short and long. Intl's own words, not a list of the DS's: what makes a word a figure's currency or unit
 * rather than a qualifier ("Türk lirası", "ج.م.", "km" against "net", "this month"). Built once a locale, and only for a
 * tick that reaches the last resort.
 */
function affixes(locale: string): Affixes {
  const known = affixesByLocale.get(locale);
  if (known) return known;
  const units = new Set<string>();
  const magnitudes = new Set<string>();
  const add = (set: Set<string>, parts: Intl.NumberFormatPart[], type: Intl.NumberFormatPartTypes) => {
    for (const part of parts) if (part.type === type && plain(part.value) !== "") set.add(plain(part.value));
  };
  const plural = new Intl.PluralRules(locale);
  // One number of each plural form the locale has, as names and long units change with it.
  const samples = [...new Map([0, 1, 2, 3, 5, 11, 21, 100, 0.5, 1.5].map((value) => [plural.select(value), value] as const)).values()];
  const supported = (key: "currency" | "unit") => (typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf(key) : []);
  for (const currency of supported("currency")) {
    units.add(currency);
    for (const currencyDisplay of ["symbol", "narrowSymbol"] as const) add(units, new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay }).formatToParts(1), "currency");
    const named = new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay: "name" });
    for (const sample of samples) {
      const parts = named.formatToParts(sample);
      add(units, parts, "currency");
      // An app writes Bosnian currency names through localWords ("eura", not Intl's "evra"): both are unit words.
      add(units, parts.map((part) => ({ ...part, value: localWords(locale, part.value) })), "currency");
    }
  }
  for (const unit of supported("unit")) {
    for (const unitDisplay of ["short", "narrow", "long"] as const) {
      const format = new Intl.NumberFormat(locale, { style: "unit", unit, unitDisplay });
      for (const sample of samples) add(units, format.formatToParts(sample), "unit");
    }
  }
  for (const compactDisplay of ["short", "long"] as const) {
    const format = new Intl.NumberFormat(locale, { notation: "compact", compactDisplay });
    for (let power = 3; power <= 18; power += 1) for (const lead of [1, 2, 5]) add(magnitudes, format.formatToParts(lead * 10 ** power), "compact");
  }
  const found = { units, magnitudes };
  affixesByLocale.set(locale, found);
  return found;
}

/** The length of the longest phrase of `set` that `text` starts with, as whole words; 0 for none. */
function phraseAhead(text: string, set: ReadonlySet<string>): number {
  const words: string[] = [];
  let at = 0;
  const ends: number[] = [];
  while (words.length < AFFIX_WORDS) {
    const space = words.length === 0 ? "" : SPACES_AHEAD.exec(text.slice(at))?.[0];
    if (space === undefined) break;
    const word = WORD_AHEAD.exec(text.slice(at + space.length))?.[0];
    if (word === undefined) break;
    words.push(word);
    at += space.length + word.length;
    ends.push(at);
  }
  for (let count = words.length; count > 0; count -= 1) if (set.has(plain(words.slice(0, count).join(" ")))) return ends[count - 1]!;
  return 0;
}

/** The length of the longest phrase of `set` that `text` ends with, as whole words; 0 for none. */
function phraseBehind(text: string, set: ReadonlySet<string>): number {
  const words = wordsOf(trimBreaks(text));
  for (let count = Math.min(AFFIX_WORDS, words.length); count > 0; count -= 1) {
    const phrase = words.slice(-count);
    if (set.has(plain(phrase.map(({ word }) => word).join(" ")))) return phrase.reduce((sum, { space, word }, index) => sum + (index === 0 ? 0 : space.length) + word.length, 0) + (text.length - trimBreaks(text).length);
  }
  return 0;
}

/** A text without the ordinary spaces at its end (a no-break space stays: it is part of a word). */
const trimBreaks = (text: string) => text.replace(/[ \t\n\f\r\v\u2028\u2029]+$/, "");

/**
 * Where a figure's group starts, from the figure at `at`: its own word ("-€150", "\u200f١٥٠"), the words before it with no
 * letter (a currency sign, a sign: "€ ", "– "), and, when those hold no currency or percent sign, the currency or
 * unit Intl writes right before it ("TRY ", "US$ "). `unit` when the figure has its currency or unit there.
 */
function groupStart(text: string, at: number, units: ReadonlySet<string>): { start: number; unit: boolean } {
  let start = at;
  while (start > 0 && !BREAK.test(text[start - 1]!)) start -= 1;
  let unit = UNIT_SIGN.test(text.slice(start, at));
  for (;;) {
    const before = text.slice(0, start);
    const word = wordsOf(before).at(-1);
    if (!word || DIGIT.test(word.word)) break;
    const wordStart = trimBreaks(before).length - word.word.length;
    if (!LETTER.test(word.word)) {
      start = wordStart;
      if (UNIT_SIGN.test(word.word)) unit = true;
      continue;
    }
    if (!unit) {
      const phrase = phraseBehind(before, units);
      if (phrase > 0) {
        start -= phrase;
        unit = true;
      }
    }
    break;
  }
  return { start, unit };
}

/**
 * Where a figure's group ends, from the end of the last figure (`at`, a compact magnitude with it): the rest of its
 * word ("1,5 MnTL"); then, word by word, a word with no letter (a currency sign, a "%", a "/"), with the word it
 * holds to after it ("/ h"); a magnitude the formatter wrote ("1,5 milyon"); the currency or unit Intl writes in the
 * chart's locale ("Türk lirası", "km", "ج.م."), and, when the figure has none yet, the first word after it as its unit
 * (a formatter's own: "1.450.000 TL", "124 orders"). What follows is a qualifier ("net", "this month").
 */
function groupEnd(text: string, at: number, unit: boolean, found: Affixes): number {
  const rest = WORD_AHEAD.exec(text.slice(at))?.[0] ?? "";
  let end = at + rest.length;
  // A currency or unit Intl joins to the figure's word with a no-break space ("ترليون\u00a0ج.م.") is its unit too.
  let hasUnit = unit || UNIT_SIGN.test(rest) || rest.split(/[\u00a0\u202f]/).some((piece) => found.units.has(plain(piece)));
  let held = false;
  let magnitude = true;
  for (;;) {
    const space = SPACES_AHEAD.exec(text.slice(end))?.[0];
    if (space === undefined) break;
    const from = end + space.length;
    const word = WORD_AHEAD.exec(text.slice(from))?.[0];
    if (word === undefined) break;
    if (!LETTER.test(word)) {
      end = from + word.length;
      hasUnit ||= UNIT_SIGN.test(word);
      held = SEPARATED.test(word);
      continue;
    }
    const ahead = text.slice(from);
    const scale = magnitude ? phraseAhead(ahead, found.magnitudes) : 0;
    if (scale > 0) {
      end = from + scale;
      magnitude = false;
      continue;
    }
    // Intl's currency or unit is the figure's even beside its sign ("₺150 Tn Türk lirası", tr's currency name); a
    // first word is when the figure has none; after a separator with no figure ahead ("km / h") the word holds to
    // it, as textUnits holds it.
    const named = phraseAhead(ahead, found.units);
    if (named > 0 || !hasUnit || held) {
      end = from + (named || word.length);
      hasUnit = true;
      held = false;
      magnitude = false;
      continue;
    }
    break;
  }
  return end;
}

/** Extended Arabic-Indic figures (Persian, Urdu): bidi class EN, as European figures are (see readsRightToLeft's extension). */
const EXTENDED_ARABIC_FIGURE = /[\u06f0-\u06f9]/u;
/** The isolate initiators (LRI, RLI, FSI) and their terminator (PDI), whose content UAX #9's rule P2 passes over. */
const ISOLATE_INITIATOR = /[\u2066\u2067\u2068]/u;
const PDI = "\u2069";

/**
 * @internal Whether a text reads from the right, by its first strong character: UAX #9's rule P2, as a
 * browser decides `dir="auto"` and `unicode-bidi: plaintext`, with one extension.
 *
 * P2: the first character of bidi class L, R or AL decides, passing over what an isolate (LRI, RLI or FSI to its PDI,
 * or to the end without one) holds. A right-to-left mark or letter (R, AL; the Arabic letter mark U+061C is AL) reads
 * from the right; a left-to-right mark or any other letter, or a figure of class L ("१५०"), from the left. Figures of
 * class EN or AN, signs, currency signs, spaces and punctuation are weak or neutral and decide nothing: "150 ترليون",
 * "€ 50 ترليون", "0 كم" and "150 ترليون TL" (Intl's "ar", "ar-MA", "ur" write Latin figures) read from the right,
 * their first letter Arabic, as "\u200f١٥٠ ترليون €" and "إجمالي € 1.450.000" do; "€ 1.450.000 net", "150 трлн €"
 * and "\u200e-150 ترليون" from the left. A line with no strong character ("€ 1.450.000", "%12,4") reads left to
 * right, the plot's direction.
 *
 * The extension: before any strong character, an Arabic-Indic figure or Arabic number sign (class AN, U+0660–0669,
 * U+0600–0605 and the Arabic separators) or an Extended Arabic-Indic figure (U+06F0–06F9, class EN like the European
 * figures) also decides right to left, where P2 would leave "١٥٠" or "۱۵۰" to the plot's left-to-right direction. The
 * reason: only right-to-left locales write these figures (Arabic, Persian, Urdu, Pashto, Sorani…), so such a line is
 * given the direction the rest of its axis reads in, which is also the side a clipped line keeps in view
 * (clipDirection). The figures themselves are drawn in the same order either way (EN and AN figures are laid out left to
 * right at any level), and the line's anchor follows its direction (value-tick's anchorFor), so it stands where it
 * stood. What can differ is a neutral or a Latin word after the figures: measured in Chromium over Intl's output (26
 * locales, 9 styles, 7 values; 106 lines where the extension decides and P2 would not), for every Arabic locale (ar,
 * ar-EG, ar-SA, ar-IQ, ar-SY, ar-YE, ar-SD) and "ur" it changes nothing drawn, as Intl writes an Arabic letter mark (AL)
 * or a right-to-left mark where a sign or a symbol would move; in fa (scientific notation only), fa-AF, ur-IN, ps, ckb,
 * sd, ks, pa-Arab, uz-Arab, mzn and lrc (60 lines) a sign, percent sign, currency or Latin unit after the figures stands
 * on their left, as a right-to-left reader reads it ("١٣ ٪" in ckb, "۱۲٫۵ km" in ps), where P2 would put it on the right.
 *
 * The direction every tick and label line is drawn in (value-tick's lineDirection), and a clipped line's own direction
 * (clipDirection), so its reading start stays in view.
 */
export function readsRightToLeft(text: string): boolean {
  let isolates = 0;
  for (const char of text) {
    if (ISOLATE_INITIATOR.test(char)) {
      isolates += 1;
      continue;
    }
    if (char === PDI) {
      isolates = Math.max(0, isolates - 1);
      continue;
    }
    if (isolates > 0) continue;
    const type = bidiClass(char);
    if (type === "R" || type === "AL") return true;
    if (type === "L") return false;
    // The extension above (not P2).
    if (type === "AN" || EXTENDED_ARABIC_FIGURE.test(char)) return true;
  }
  return false;
}

/* ── A clipped line's direction ──────────────────────────── */

/** The Unicode bidirectional classes a chart's text uses (UAX #9), explicit embeddings aside. */
type BidiClass = "L" | "R" | "AL" | "EN" | "AN" | "ES" | "ET" | "CS" | "NSM" | "BN" | "WS" | "ON";

function bidiClass(char: string): BidiClass {
  if (char === "\u200e") return "L";
  if (char === "\u200f") return "R";
  if (/[\u061c\u060b\u060d\u061b\u061d-\u061f\u066d\u06d4]/u.test(char)) return "AL";
  if (/[\u0600-\u0605\u0660-\u0669\u066b\u066c\u06dd\u0890\u0891\u08e2\u{10d30}-\u{10d39}]/u.test(char)) return "AN";
  // European figures (and their full-width, mathematical and Extended Arabic-Indic forms) are EN; the figures of a
  // right-to-left script (N'Ko, Adlam) are R; every other script's figures ("१५०", "๑๕๐") are L.
  if (/[0-9\u06f0-\u06f9\uff10-\uff19\u{1d7ce}-\u{1d7ff}\u{1fbf0}-\u{1fbf9}]/u.test(char)) return "EN";
  if (/\p{Nd}/u.test(char)) return R_SCRIPT.test(char) ? "R" : "L";
  if (/[\p{Mn}\p{Me}]/u.test(char)) return "NSM";
  if (/\p{Cf}/u.test(char)) return "BN";
  if (AL_SCRIPT.test(char) && /\p{L}/u.test(char)) return "AL";
  if (R_SCRIPT.test(char) && /\p{L}/u.test(char)) return "R";
  if (/[\p{L}\p{Mc}]/u.test(char)) return "L";
  if (/[+\-\u207a\u207b\u208a\u208b\u2212\ufb29\ufe62\ufe63\uff0b\uff0d]/u.test(char)) return "ES";
  if (/[\p{Sc}#%°‰‱\u066a\u0609\u060a\u2030-\u2034]/u.test(char)) return "ET";
  if (/[,.:/\u00a0\u060c\u202f\u2044\ufe50\ufe52\ufe55\uff0c\uff0e\uff0f\uff1a]/u.test(char)) return "CS";
  if (/\s/u.test(char)) return "WS";
  return "ON";
}

/**
 * A line's characters in the order a browser draws them from the left, in a paragraph of this direction: the Unicode
 * bidirectional algorithm (UAX #9: its weak, neutral and implicit rules and its reordering) for a line without
 * explicit embeddings, as a chart's ticks and labels are. Format marks keep the level before them.
 */
function visualOrder(chars: readonly string[], rtl: boolean): number[] {
  const base = rtl ? 1 : 0;
  const edge: BidiClass = rtl ? "R" : "L";
  const types = chars.map(bidiClass);
  const kept = types.flatMap((type, at) => (type === "BN" ? [] : [at]));
  const t = kept.map((at) => types[at]!);
  // W1–W3: a mark takes the class before it; a European figure after Arabic letters is an Arabic one; AL is R.
  let strong: BidiClass = edge;
  t.forEach((type, at) => {
    if (type === "NSM") t[at] = at === 0 ? edge : t[at - 1]!;
    if (t[at] === "L" || t[at] === "R" || t[at] === "AL") strong = t[at]!;
    if (t[at] === "EN" && strong === "AL") t[at] = "AN";
  });
  t.forEach((type, at) => {
    if (type === "AL") t[at] = "R";
  });
  // W4: one separator between two figures of a kind joins them.
  for (let at = 1; at < t.length - 1; at += 1) {
    const [before, after] = [t[at - 1], t[at + 1]];
    if (t[at] === "ES" && before === "EN" && after === "EN") t[at] = "EN";
    else if (t[at] === "CS" && before === after && (before === "EN" || before === "AN")) t[at] = before!;
  }
  // W5: a run of terminators beside a European figure is one.
  for (let at = 0; at < t.length; at += 1) {
    if (t[at] !== "ET") continue;
    let end = at;
    while (end < t.length && t[end] === "ET") end += 1;
    if (t[at - 1] === "EN" || t[end] === "EN") for (let each = at; each < end; each += 1) t[each] = "EN";
    at = end;
  }
  // W6, W7: other separators and terminators are neutral; a European figure after Latin letters is Latin.
  strong = edge;
  t.forEach((type, at) => {
    if (type === "ES" || type === "ET" || type === "CS") t[at] = "ON";
    if (t[at] === "L" || t[at] === "R") strong = t[at]!;
    if (t[at] === "EN" && strong === "L") t[at] = "L";
  });
  // N1, N2: neutrals between two of one direction (figures count as R) take it; others the paragraph's.
  const direction = (type: BidiClass | undefined) => (type === undefined ? edge : type === "L" ? "L" : "R");
  for (let at = 0; at < t.length; at += 1) {
    if (t[at] !== "WS" && t[at] !== "ON") continue;
    let end = at;
    while (end < t.length && (t[end] === "WS" || t[end] === "ON")) end += 1;
    const before = direction(t[at - 1]);
    const resolved = before === direction(t[end]) ? before : edge;
    for (let each = at; each < end; each += 1) t[each] = resolved;
    at = end;
  }
  // I1, I2: the implicit levels.
  const levels = new Array<number>(chars.length).fill(base);
  kept.forEach((index, at) => {
    const type = t[at]!;
    levels[index] = rtl ? (type === "R" ? 1 : 2) : type === "L" ? 0 : type === "R" ? 1 : 2;
  });
  types.forEach((type, at) => {
    if (type === "BN") levels[at] = at === 0 ? base : levels[at - 1]!;
  });
  // L2: from the highest level to the lowest odd one, each run at or above it reversed.
  const order = chars.map((_, at) => at);
  const highest = Math.max(base, ...levels);
  const lowestOdd = Math.min(...levels.filter((level) => level % 2 === 1), highest + 1);
  for (let level = highest; level >= lowestOdd && level > 0; level -= 1) {
    for (let at = 0; at < order.length; at += 1) {
      if (levels[order[at]!]! < level) continue;
      let end = at;
      while (end < order.length && levels[order[end]!]! >= level) end += 1;
      order.splice(at, end - at, ...order.slice(at, end).reverse());
      at = end;
    }
  }
  return order;
}

/**
 * @internal The direction a clipped line is laid out in, so its reading start, its first character,
 * is drawn inside its clip: the clip's start edge holds the paragraph's start (its left in "ltr", its right in "rtl"),
 * and the characters a browser draws between that edge and the first one ({@link visualOrder}, at their
 * {@link textWidth}) push it in. The line's own direction ({@link readsRightToLeft}) where its first character then
 * fits within `room` ("\u200f١٥٠ ترليون €xxxx" in "rtl", its figure at the right edge); otherwise the other where it
 * does ("\u200f1.45M €xxxx", whose right-to-left mark leads a left-to-right run: in "rtl" that run would stand at
 * the right edge with its figure at its far left, clipped; in "ltr" the figure is at the left edge); otherwise the
 * one that brings it nearer the edge.
 */
export function clipDirection(line: string, room: number, figures: Figures = "proportional"): "ltr" | "rtl" {
  const chars = Array.from(line.normalize("NFC"));
  const first = chars.findIndex((char) => !/[\p{Cf}\p{Mn}\p{Me}\s]/u.test(char));
  const own: "ltr" | "rtl" = readsRightToLeft(line) ? "rtl" : "ltr";
  if (first < 0) return own;
  const width = (char: string) => textWidth(char, figures);
  const reach = (rtl: boolean) => {
    const order = visualOrder(chars, rtl);
    const at = order.indexOf(first);
    const before = rtl ? order.slice(at + 1) : order.slice(0, at);
    return before.reduce((sum, index) => sum + width(chars[index]!), 0) + width(chars[first]!);
  };
  const other = own === "rtl" ? "ltr" : "rtl";
  const [ownReach, otherReach] = [reach(own === "rtl"), reach(other === "rtl")];
  if (ownReach <= room) return own;
  if (otherReach <= room) return other;
  return otherReach < ownReach ? other : own;
}

/** A line ending in "…", which after a right-to-left word takes a right-to-left mark (U+200F, no width), so it stays at that word's end. */
function ended(line: string): string {
  const lastLetter = Array.from(line).reverse().find((char) => LETTER.test(char));
  return `${line}…${lastLetter && RTL_LETTER.test(lastLetter) ? "‏" : ""}`;
}

/**
 * The most whole words of `words` from their start that fit the room on a line of `base` (none when `base` is ""),
 * with "…" after them when some are left out: the line, and whether any were. "…" is left out only where it alone
 * does not fit after `base`.
 */
function wordsThatFit(base: string, words: readonly { space: string; word: string }[], room: number, figures: Figures): { line: string; dropped: boolean } {
  const join = (count: number) => words.slice(0, count).reduce((line, { space, word }) => (line === "" ? word : line + space + word), base);
  const all = join(words.length);
  if (textWidth(all, figures) <= room) return { line: all, dropped: false };
  for (let count = words.length - 1; count >= 0; count -= 1) {
    const line = ended(join(count).trimEnd());
    if (textWidth(line, figures) <= room) return { line, dropped: true };
  }
  return { line: base, dropped: words.length > 0 };
}

/**
 * The last resort for a text that does not fit its room even with its figures short:
 * words that are not the figure's are dropped, whole, and "…" stands for them. A text's figure group is never dropped
 * or cut: from the first figure's sign and currency (or the currency or unit Intl writes before it, "TRY") to the
 * last figure, its magnitude and its own currency or unit after it ({@link groupEnd}: "€ 150 Tn", "150 Tn Türk
 * lirası", "1,5 ترليون TL", "‏١٥٠ ترليون ج.م.‏"), its units broken only as {@link textUnits} breaks them. After it,
 * qualifiers ("net", "this month") stand on its last line while they fit, and "…" after the last kept. A phrase before it
 * ("Total order revenue") stands on a line of its own above, as many of its words as fit and "…" after them, so
 * a text takes at most one more line than its figure group: "Total…" over "€ 145 Tn net…", and none more than
 * `maxLines` (a tick under the plot: its band's), the phrase before it then dropped. A text with no figure
 * keeps its first word as that group. What is kept and still does not fit (a formatter's long word against a
 * figure) is clipped by the tick or label, its reading start kept. `dropped` when words were.
 */
function lastResort(shown: Shown, room: number, locale: string, figures: Figures, maxLines = Number.POSITIVE_INFINITY): { lines: string[]; dropped: boolean } {
  const { text } = shown;
  let start: number;
  let end: number;
  if (shown.figures) {
    const found = affixes(locale);
    start = groupStart(text, shown.figures.first, found.units).start;
    end = groupEnd(text, shown.figures.end, groupStart(text, shown.figures.last, found.units).unit, found);
  } else {
    start = SPACES_AHEAD.exec(text)?.[0].length ?? 0;
    end = start + (WORD_AHEAD.exec(text.slice(start))?.[0].length ?? 0);
  }
  // The group parts only between its figures, after a separator ("€ 900.000 / | € 1.450.000"), never from its own
  // magnitude, currency or unit ("1,45 Mn TL"); and, as any label, not at all when a part is wider than the room
  // (breaking it would only add lines that still overflow).
  const parts: TextUnit[] = [];
  for (const unit of textUnits(text.slice(start, end))) {
    const last = parts.at(-1);
    if (last && !(SEPARATED.test(last.unit) && DIGIT.test(unit.unit))) last.unit += unit.space + unit.unit;
    else parts.push({ ...unit });
  }
  const group = linesWithin(parts, room, figures, maxLines);
  const after = wordsThatFit(group.pop() ?? "", wordsOf(text.slice(end)), room, figures);
  const lines = [...group, after.line];
  const lead = wordsOf(text.slice(0, start));
  if (lead.length === 0) return { lines, dropped: after.dropped };
  const before = wordsThatFit("", lead, room, figures);
  // Above the figure's lines only where its band holds one more (a tick under the plot holds few).
  const above = textWidth(before.line, figures) <= room && lines.length < maxLines;
  return { lines: above ? [before.line, ...lines] : lines, dropped: after.dropped || before.dropped || !above };
}

/**
 * How a text is laid out and when it fits: its lines in `room`, each no wider than `limit`, its figures drawn so;
 * `rebreak` to break a shortened text between the units of the text as shown rather than as written. `clips` where a
 * line wider than `limit` is clipped there (a value tick beside the plot, within its axis; a bar-end label, at the
 * plot's start or the chart's edge); where nothing clips it (a value tick under the plot), a line may stand wider
 * than its room, and the text is never more than compact (see {@link shortText}), unless a line would pass `edge`, the
 * chart's width, where the svg's edge cuts it whatever else stands there.
 */
type Fit = { room: number; limit: number; figures: Figures; locale: string; values?: FormattedValues; rebreak: boolean; clips: boolean; maxLines: number; edge?: number };

/**
 * Units in lines of `room` ({@link unitLines}), or, where that takes more than `maxLines` lines, in the narrowest wider
 * room that takes no more (the x band guard). For a value tick under the plot, which nothing clips
 * sideways (Recharts spaces those ticks by the whole formatted tick on one line) but whose band below the plot holds
 * only so many lines (Recharts' 30px x axis: two 11px lines under its 8px inset); past them a line stood past the
 * svg's bottom, into the axis name or the legend under it. Its lines then grow wider, never taller: every line is still
 * part of the one-line text Recharts spaced the ticks by, so it never reaches a neighbor or the chart's edge, and no
 * word is dropped or written in scientific notation (never under the plot). Greedy breaking takes no more lines in
 * a wider room, so the room is found by halving.
 */
function linesWithin(units: readonly TextUnit[], room: number, figures: Figures, maxLines: number): string[] {
  const lines = unitLines(units, room, figures);
  if (lines.length <= maxLines) return lines;
  let low = room;
  let high = textWidth(joinUnits(units), figures);
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (unitLines(units, middle, figures).length <= maxLines) high = middle;
    else low = middle;
  }
  return unitLines(units, high, figures);
}

/**
 * The one chain by which a value tick and a bar-end label are shortened, each step
 * only when the one before does not fit (`fit`: every line within its limit), the same on the server and in the
 * browser:
 * 1. whole, or broken between its units ({@link textLines});
 * 2. its figures short and exact ({@link axisFigures}): compact, in the fewest words its locale has; or, only where
 *    a line would otherwise be clipped, in scientific notation: where
 *    the text clips (`fit.clips`), its figure group, the least it keeps at the last (step 3), is still wider than its
 *    limit compact, so compact it would be clipped even with its other words dropped for "…", and in scientific
 *    notation it fits ("1,5E29 €", "€1.5E29" for ja's "€15,000,000,000,000京"; never where compact fits, as
 *    "1500兆", nor where neither does, as scientific notation would then be clipped too). The trigger is the clip,
 *    never the magnitude, so it is the same in every locale;
 * 3. the words that are not its figure's dropped and "…" for them ({@link lastResort}): never a word cut, never a
 *    figure, its magnitude or its currency or unit.
 * What still does not fit is clipped by the tick or the label, its reading start in view. Where nothing but the
 * chart's own edge clips a text (a value tick under the plot: the tick moves in from the chart's edges, value-tick's
 * ValueTick), the chain stops at step 2's compact form, the readable one ("€ 1.5 ترليون", "12 млн km / h"), wider than
 * its room or not: never scientific notation, never "…", unless a line of the axis is wider than the whole chart
 * (`fit.edge`), which the svg's edge would cut: then the chain goes on for every tick of that axis, with the chart's
 * width as its limit.
 * `axis` is every text the same formatter wrote beside this one (a value axis's ticks): the step an axis takes, every
 * tick of it takes, so an axis never mixes "€ 9.000.000.000.000" with "€ 12 Tn", nor "€ 900 Tn" with "€ 1,5E29": when
 * one tick of an axis beside the plot would be clipped compact and is not in scientific notation, the whole axis is in
 * scientific notation, its other ticks too, which alone would not be clipped (one notation on an axis, so its ticks
 * read against one another). The figures of one magnitude share their fraction digits ("€ 1,50 Mn", "€ 2,25 Mn")
 * where those all fit, or each has only the digits it needs ("€ 1,5 Mn", "€ 2,25 Mn"). `values` are what proves how
 * the formatter writes its marks ({@link markRoles}). `shortened` when the lines are not the text as written, which
 * the tick or label then carries whole for assistive technology and as a hover title. The tooltip and the data table
 * always show the values whole.
 */
function shortText(text: string, axis: readonly string[], fit: Fit): { lines: string[]; shortened: boolean } {
  const { room, limit, figures, locale } = fit;
  const fits = (lines: readonly string[]) => lines.every((line) => textWidth(line, figures) <= limit);
  // In lines of the room, between its units: a tick's as written, so a tick takes at most one more line than its
  // figure group; a label's as shown, a compact magnitude a word of its own ("€ 1,45 млн | target").
  const lay = (shown: Shown) => linesWithin(fit.rebreak ? textUnits(shown.text) : shown.units, room, figures, fit.maxLines);
  // As written: whole where it fits, else broken between its units, in at most `maxLines` lines.
  const written = (each: string) => (textWidth(each, figures) <= room ? [each] : linesWithin(textUnits(each), room, figures, fit.maxLines));
  const texts = [text, ...axis];
  if (texts.every((each) => fits(written(each)))) return { lines: written(text), shortened: false };
  const short = axisFigures(texts, locale, fit.values, figures);
  const write = (each: string, padded: boolean, scientific: boolean) => shownText(textUnits(each), (figure) => short(figure, padded, scientific));
  // What a text keeps at the last, its figure group, fits: whole, or with its other words dropped.
  const keeps = (shown: Shown) => fits(lay(shown)) || fits(lastResort(shown, limit, locale, figures, fit.maxLines).lines);
  // Scientific notation only where a text clips and it, and only it, keeps that text from being clipped: then for the
  // whole axis. Never where nothing clips.
  const scientific = fit.clips && texts.some((each) => !keeps(write(each, false, false)) && keeps(write(each, false, true)));
  const padded = !scientific && texts.every((each) => fits(lay(write(each, true, false))));
  // Under the plot only the chart's own edge cuts a tick (it is moved in from the edges, as a category tick is): a line
  // no wider than the chart stands compact; one wider would be cut there, so the chain goes on with the chart's width
  // as the limit the clip gives a tick beside the plot (scientific notation where that alone fits, else qualifiers
  // dropped for "…"). That is decided once for the axis, as every step is: when one tick's compact line
  // would pass the edge, every tick of the axis goes on, so an axis never mixes "€80.000.000.000.000.000 Tn" with
  // "€1,2E29".
  const edge = fit.edge;
  if (!fit.clips && edge !== undefined && texts.some((each) => lay(write(each, padded, false)).some((line) => textWidth(line, figures) > edge))) {
    return shortText(text, axis, { ...fit, clips: true, limit: edge });
  }
  const shown = write(text, padded, scientific);
  const lines = lay(shown);
  // Where nothing clips, compact is the last step: wider than its room or not, the text is read whole.
  if (fits(lines) || !fit.clips) return { lines, shortened: shown.text !== text };
  const resort = lastResort(shown, limit, locale, figures, fit.maxLines);
  return { lines: resort.lines, shortened: resort.dropped || shown.text !== text };
}

/**
 * @internal A value tick as its axis shows it in `room`: {@link shortText}'s chain, in tabular figures,
 * every tick of its axis (`axisTexts`, written by the same formatter from `values`) taking the same step. `clips` for
 * a tick beside the plot (a vertical axis), whose line still wider than the room is clipped by the tick within the
 * axis (value-tick's ValueTick); `false` for one under the plot (a horizontal axis), which nothing clips: it is at
 * most compact, never in scientific notation nor shortened with "…", and may stand wider than its room.
 * `maxLines`, the lines its band holds under the plot: a tick that would take more is laid out wider, in no more
 * ({@link linesWithin}). `edge`, the chart's width under the plot: the one bound a tick there has, as the svg's edge
 * cuts what passes it; only an axis with a line wider than the whole chart takes the chain's last steps there, every
 * tick of it.
 */
export function tickText(text: string, room: number, locale: string, axisTexts: readonly string[] = [], values?: FormattedValues, clips = true, maxLines = Number.POSITIVE_INFINITY, edge?: number): { lines: string[]; shortened: boolean } {
  return shortText(text, axisTexts, { room, limit: room, figures: "tabular", locale, values, rebreak: false, clips, maxLines, edge });
}

/**
 * @internal A bar-end label as it stands at its bar's end: {@link shortText}'s chain,
 * the value ticks' own, in proportional figures. Its lines are laid out in `room` (to the chart's edge, or the plot's
 * start); a line may pass it up to `limit` (back over its own bar), and only what passes that is shortened. `values`
 * are the chart's labels by their text, each with the total it was formatted from: what proves how the formatter
 * writes its marks. A line still wider than `limit` is clipped by the label (core-charts' BarEndLabel).
 */
export function labelText(text: string, room: number, limit: number, locale: string, values?: FormattedValues): { lines: string[]; shortened: boolean } {
  return shortText(text, [], { room, limit: Math.max(room, limit), figures: "proportional", locale, values, rebreak: true, clips: true, maxLines: Number.POSITIVE_INFINITY });
}
