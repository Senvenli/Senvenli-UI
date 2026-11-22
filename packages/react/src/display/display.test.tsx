import fs from "node:fs";
import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createTheme, toCSS } from "@senvenli/tokens";
import { Button } from "../action/index";
import { DS_STRINGS, intlLocale, registerDsStrings } from "../i18n";
import { registerLocaleAliases } from "../intl-locale";
import { DesignSystemProvider } from "../provider";
import { Avatar, AvatarGroup, Badge, BadgeAnchor, Card, CardBody, CardFooter, CardHeader, CardMedia, Kbd, ModifierKbd, Separator } from "./index";

const here = (file: string) => new URL(file, import.meta.url);
const theme = toCSS(createTheme(), { tailwind: true }) + fs.readFileSync(here("../../styles/theme.css"), "utf8");
const PHYSICAL = /(^|\s|:)(-?m[lr]-|p[lr]-|-?left-|-?right-|border-[lr](-|\s|$)|rounded-[lr]-|text-left|text-right)/;
const classesOf = (element: Element | null | undefined) => element?.getAttribute("class") ?? "";
const slot = (name: string, root: ParentNode = document) => root.querySelector(`[data-slot="${name}"]`);

function inLocale(ui: React.ReactElement, locale = "en", navigate = vi.fn()) {
  return render(<DesignSystemProvider locale={locale} navigate={navigate}>{ui}</DesignSystemProvider>);
}

/** Every ds colour/shadow utility on the element resolves to a theme token. */
function expectTokens(element: Element | null | undefined) {
  for (const utility of classesOf(element).split(/\s+/)) {
    const color = /(?:^|:)(?:bg|text|ring|inset-ring|border)-(ds-(?:background|surface|icon|text|border)[a-z-]*)$/.exec(utility);
    if (color) expect(theme, utility).toContain(`--color-${color[1]}:`);
    const shadow = /(?:^|:)shadow-(ds-[a-z-]+)$/.exec(utility);
    if (shadow) expect(theme, utility).toContain(`--shadow-${shadow[1]}:`);
  }
}

const pressKey = (element: HTMLElement, key = "Enter") => {
  act(() => element.focus());
  fireEvent.keyDown(element, { key });
  fireEvent.keyUp(element, { key });
};

afterEach(cleanup);

describe("Card", () => {
  it("has header, body and footer parts with the variant's surface", () => {
    inLocale(
      <Card>
        <CardHeader title="Today's orders" subtitle="Main warehouse" menu={<Button variant="subtle" iconOnly iconBefore="ellipsis" aria-label="Card options" />} />
        <CardBody>10:00 · Order 482</CardBody>
        <CardFooter><Button variant="link">View all</Button></CardFooter>
      </Card>,
    );
    expect(screen.getByRole("heading", { level: 3, name: "Today's orders" })).toBeTruthy();
    expect(slot("card-subtitle")?.textContent).toBe("Main warehouse");
    expect(classesOf(slot("card"))).toContain("shadow-ds-raised");
    expect(classesOf(slot("card-body"))).toContain("px-ds-300");
    expect(classesOf(slot("card-footer"))).toContain("border-t");
    expect(classesOf(slot("card-footer"))).toContain("justify-end");
    expect(slot("card-link")).toBeNull();
    expectTokens(slot("card"));
  });

  it("has outline and sunken variants and a compact padding", () => {
    inLocale(
      <>
        <Card variant="outline" isCompact><CardBody>Outline</CardBody></Card>
        <Card variant="sunken"><CardBody>Sunken</CardBody></Card>
      </>,
    );
    const [outline, sunken] = Array.from(document.querySelectorAll('[data-slot="card"]'));
    // The outline is drawn above the content, so a flush photo never covers it.
    expect(classesOf(outline)).toContain("after:inset-ring-ds-border");
    expect(classesOf(outline)).toContain("after:z-0");
    expect(classesOf(outline)).not.toContain("shadow-ds-raised");
    expect(classesOf(outline!.querySelector('[data-slot="card-body"]'))).toContain("px-ds-200");
    expect(classesOf(sunken)).toContain("bg-ds-surface-sunken");
    expectTokens(outline);
    expectTokens(sunken);
  });

  it("is one link named by its title when it has an href, with the menu still its own control", () => {
    const navigate = vi.fn();
    const onMenu = vi.fn();
    inLocale(
      <Card href="/orders/482">
        <CardHeader title="Order 482" menu={<Button variant="subtle" iconOnly iconBefore="ellipsis" aria-label="Options" onPress={onMenu} />} />
        <CardBody>Desk lamp · 4 items</CardBody>
      </Card>,
      "en",
      navigate,
    );
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]!.getAttribute("data-slot")).toBe("card-link");
    expect(screen.getByRole("link", { name: "Order 482" })).toBe(links[0]);
    // Only the link and the trailing menu take focus.
    expect(Array.from(document.querySelectorAll("a[href], button")).length).toBe(2);
    expect(classesOf(links[0])).toContain("data-[focus-visible]:inset-ring-2");
    expect(classesOf(links[0])).toContain("data-[focus-visible]:inset-ring-ds-border-focused");
    expect(slot("card")?.getAttribute("data-variant")).toBe("interactive");
    expect(classesOf(slot("card"))).toContain("has-[[data-slot=card-link][data-hovered]]:shadow-ds-overlay");
    // Keyboard reaches it; Enter on a native link is the browser's click, which jsdom does not synthesize.
    act(() => links[0]!.focus());
    expect(document.activeElement).toBe(links[0]);
    fireEvent.click(links[0]!);
    expect(navigate).toHaveBeenCalledWith("/orders/482", undefined);
    // The menu sits above the link and does not navigate.
    navigate.mockClear();
    expect(classesOf(slot("card-menu"))).toContain("z-[2]");
    pressKey(screen.getByRole("button", { name: "Options" }));
    expect(onMenu).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("is one button with onPress, and takes an aria-label when it has no header", () => {
    const onPress = vi.fn();
    inLocale(
      <Card onPress={onPress} aria-label="Desk lamp details">
        <CardBody>Desk lamp</CardBody>
      </Card>,
    );
    const button = screen.getByRole("button", { name: "Desk lamp details" });
    pressKey(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("never leaves the link unnamed: title, aria-label, or a warning and no dangling reference", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    inLocale(
      <>
        <Card href="/a"><CardHeader title="Titled" /><CardBody>x</CardBody></Card>
        <Card href="/b" aria-label="Labelled"><CardMedia /><CardBody>y</CardBody></Card>
      </>,
    );
    expect(screen.getByRole("link", { name: "Titled" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Labelled" })).toBeTruthy();
    expect(warn).not.toHaveBeenCalled();
    cleanup();
    inLocale(<Card href="/c"><CardBody>z</CardBody></Card>);
    const link = slot("card-link") as HTMLElement;
    expect(link.hasAttribute("aria-labelledby")).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    cleanup();
    // A header that goes away takes its id with it.
    const ui = (withHeader: boolean) => (
      <DesignSystemProvider locale="en" navigate={vi.fn()}>
        <Card href="/d">{withHeader && <CardHeader title="Temporary" />}<CardBody>w</CardBody></Card>
      </DesignSystemProvider>
    );
    const { rerender } = render(ui(true));
    expect(slot("card-link")?.hasAttribute("aria-labelledby")).toBe(true);
    rerender(ui(false));
    expect(slot("card-link")?.hasAttribute("aria-labelledby")).toBe(false);
    warn.mockRestore();
  });

  it("does not carry a failed photo over to a new src", () => {
    const ui = (src: string) => (
      <DesignSystemProvider locale="en" navigate={vi.fn()}><Card><CardMedia src={src} /></Card></DesignSystemProvider>
    );
    const { rerender } = render(ui("/a.jpg"));
    fireEvent.error(slot("card-media")?.querySelector("img") as HTMLImageElement);
    expect(slot("card-media")?.querySelector("img")).toBeNull();
    rerender(ui("/b.jpg"));
    expect(slot("card-media")?.querySelector("img")?.getAttribute("src")).toBe("/b.jpg");
  });

  it("shows a flush 16:9 photo, and the icon on sunken when there is none or it fails", () => {
    inLocale(
      <>
        <Card><CardMedia src="/lamp.jpg" alt="" /></Card>
        <Card><CardMedia fallbackIcon="package" /></Card>
        <Card><CardMedia /></Card>
      </>,
    );
    const [photo, empty, plain] = Array.from(document.querySelectorAll('[data-slot="card-media"]'));
    expect(classesOf(photo)).toContain("aspect-video");
    const image = photo!.querySelector("img") as HTMLImageElement;
    expect(classesOf(image)).toContain("object-cover");
    expect(empty!.querySelector("svg")?.getAttribute("data-icon")).toBe("package");
    // With no icon named, the fallback is the generic image icon.
    expect(plain!.querySelector("svg")?.getAttribute("data-icon")).toBe("image");
    fireEvent.error(image);
    expect(photo!.querySelector("img")).toBeNull();
    expect(photo!.querySelector("svg")?.getAttribute("data-icon")).toBe("image");
  });
});

describe("Avatar", () => {
  it("shows the person's initials, upper-cased with the locale, named by the full name", () => {
    inLocale(
      <>
        <Avatar name="Ada Lovelace" />
        <Avatar name="ian iverson" />
      </>,
    );
    const avatars = screen.getAllByRole("img");
    expect(avatars.map((avatar) => avatar.getAttribute("aria-label"))).toEqual(["Ada Lovelace", "ian iverson"]);
    expect(avatars.map((avatar) => slot("avatar-fallback", avatar)?.textContent)).toEqual(["AL", "II"]);
    expect(slot("avatar-fallback", avatars[0])?.getAttribute("aria-hidden")).toBe("true");
    cleanup();
    // A locale with its own casing rule (dotted capital I) upper-cases by that rule.
    inLocale(<Avatar name="ian iverson" />, "az");
    expect(slot("avatar-fallback")?.textContent).toBe("İİ");
  });

  it("keeps a stable tint per name and says online in the name", () => {
    inLocale(
      <>
        <Avatar name="Grace Hopper" presence="online" />
        <Avatar name="Grace Hopper" />
      </>,
    );
    const [online, plain] = screen.getAllByRole("img");
    expect(online!.getAttribute("aria-label")).toBe(`Grace Hopper (${DS_STRINGS.online.en})`);
    expect(slot("avatar-presence", online)?.getAttribute("aria-hidden")).toBe("true");
    const tint = (element: Element) => classesOf(element).split(/\s+/).filter((utility) => utility.startsWith("bg-")).join();
    expect(tint(online!)).toBe(tint(plain!));
    expectTokens(online);
    expectTokens(slot("avatar-presence", online));
  });

  it("shows the photo once it loads and falls back to initials if it fails", () => {
    inLocale(<Avatar name="Grace Hopper" src="/grace.jpg" size="large" />);
    const avatar = screen.getByRole("img", { name: "Grace Hopper" });
    const image = slot("avatar-image", avatar) as HTMLImageElement;
    expect(image.getAttribute("alt")).toBe("");
    expect(classesOf(image)).toContain("opacity-0");
    expect(slot("avatar-fallback", avatar)?.textContent).toBe("GH");
    fireEvent.load(image);
    expect(avatar.getAttribute("data-status")).toBe("loaded");
    expect(slot("avatar-fallback", avatar)).toBeNull();
    cleanup();
    inLocale(<Avatar name="Grace Hopper" src="/broken.jpg" />);
    fireEvent.error(slot("avatar-image") as HTMLImageElement);
    expect(slot("avatar-image")).toBeNull();
    expect(slot("avatar-fallback")?.textContent).toBe("GH");
  });

  it("starts over when the photo changes, never showing the last one's state", () => {
    const ui = (src: string) => (
      <DesignSystemProvider locale="en" navigate={vi.fn()}><Avatar name="Grace Hopper" src={src} /></DesignSystemProvider>
    );
    const { rerender } = render(ui("/a.jpg"));
    fireEvent.load(slot("avatar-image") as HTMLImageElement);
    expect(slot("avatar")?.getAttribute("data-status")).toBe("loaded");
    rerender(ui("/b.jpg"));
    expect(slot("avatar")?.getAttribute("data-status")).toBe("loading");
    expect(classesOf(slot("avatar-image"))).toContain("opacity-0");
    expect(slot("avatar-fallback")?.textContent).toBe("GH");
  });

  it("keeps accents of decomposed names and hides an avatar without a name", () => {
    inLocale(
      <>
        <Avatar name={"Émile Zola"} />
        <Avatar name="" />
      </>,
    );
    expect(slot("avatar-fallback")?.textContent).toBe("ÉZ");
    const empty = document.querySelectorAll('[data-slot="avatar"]')[1]!;
    expect(empty.hasAttribute("role")).toBe(false);
    expect(empty.getAttribute("aria-hidden")).toBe("true");
  });

  it("uses a rounded square and a contained logo for companies, and the icon without letters", () => {
    inLocale(
      <>
        <Avatar name="Acme Inc." shape="square" src="/logo.svg" />
        <Avatar name="—" shape="square" />
        <Avatar name="" />
      </>,
    );
    const [company, noLetters, empty] = Array.from(document.querySelectorAll('[data-slot="avatar"]'));
    expect(classesOf(company)).toContain("rounded-ds-medium");
    expect(classesOf(slot("avatar-image", company))).toContain("object-contain");
    expect(slot("avatar-fallback", noLetters)?.querySelector("svg")?.getAttribute("data-icon")).toBe("building-2");
    expect(slot("avatar-fallback", empty)?.querySelector("svg")?.getAttribute("data-icon")).toBe("user");
  });

  it("groups with an 8px overlap and a ring, folding the rest into +N", () => {
    inLocale(
      <AvatarGroup max={3} aria-label="Team members">
        {["Ada Lovelace", "Grace Hopper", "Alan Turing", "Edsger Dijkstra", "Barbara Liskov"].map((name) => <Avatar key={name} name={name} />)}
      </AvatarGroup>,
    );
    const group = screen.getByRole("group", { name: "Team members" });
    expect(classesOf(group)).toContain("[&>*+*]:-ms-ds-100");
    expect(group.querySelectorAll('[data-slot="avatar"]')).toHaveLength(3);
    for (const avatar of Array.from(group.querySelectorAll('[data-slot="avatar"]'))) expect(classesOf(avatar)).toContain("ring-ds-surface");
    const more = slot("avatar-group-more", group);
    expect(more?.textContent).toBe("+2");
    expect(more?.getAttribute("aria-label")).toBe("2 more");
  });
});

describe("Badge", () => {
  it("shows a count, hides at 0, and caps at 99+ (9+ on an icon)", () => {
    inLocale(
      <>
        <span>Messages <Badge variant="count" value={3} tone="brand" /></span>
        <Badge variant="count" value={0} />
        <Badge variant="count" value={120} />
        <BadgeAnchor>
          <Button variant="subtle" iconOnly iconBefore="bell" aria-label="Notifications, 9+ unread" />
          <Badge variant="count" value={12} tone="danger" isOnIcon />
        </BadgeAnchor>
      </>,
    );
    const badges = Array.from(document.querySelectorAll('[data-slot="badge"]'));
    expect(badges.map((badge) => badge.textContent)).toEqual(["3", "99+", "9+"]);
    expect(classesOf(badges[0])).toContain("tabular-nums");
    // On an icon the control's label carries the count; the badge itself is hidden.
    expect(badges[2]!.getAttribute("aria-hidden")).toBe("true");
    expect(classesOf(badges[2])).toContain("-end-1.5");
    expect(badges[0]!.hasAttribute("aria-hidden")).toBe(false);
    for (const badge of badges) expectTokens(badge);
  });

  it("has an 8px unread dot, hidden from screen readers", () => {
    inLocale(
      <BadgeAnchor>
        <Button variant="subtle" iconOnly iconBefore="message-square" aria-label="Messages, new message" />
        <Badge variant="count" isDot isOnIcon />
      </BadgeAnchor>,
    );
    const dot = slot("badge");
    expect(dot?.getAttribute("aria-hidden")).toBe("true");
    expect(classesOf(dot)).toContain("bg-ds-icon-danger");
    expect(classesOf(dot)).toContain("size-ds-100");
  });
});

describe("Badge (status: subtle, bold)", () => {
  it("always carries the word, in the subtle or bold status colours", () => {
    inLocale(
      <>
        <Badge tone="information">Approved</Badge>
        <Badge tone="warning" hasDot>Under review</Badge>
        <Badge tone="danger" variant="bold">Overdue</Badge>
        <Badge>Draft</Badge>
      </>,
    );
    const lozenges = Array.from(document.querySelectorAll('[data-slot="badge"]'));
    expect(lozenges.map((lozenge) => lozenge.textContent)).toEqual(["Approved", "Under review", "Overdue", "Draft"]);
    expect(classesOf(lozenges[0])).toContain("bg-ds-background-information");
    expect(classesOf(lozenges[2])).toContain("bg-ds-background-danger-bold");
    expect(lozenges[3]!.getAttribute("data-tone")).toBe("neutral");
    expect(slot("badge-dot", lozenges[1])?.getAttribute("aria-hidden")).toBe("true");
    for (const lozenge of lozenges) {
      expect(lozenge.hasAttribute("role")).toBe(false);
      // Sentence case at medium weight: never upper-cased, never semibold.
      expect(classesOf(lozenge).split(/\s+/)).toEqual(expect.arrayContaining(["text-body-small", "font-medium"]));
      expect(classesOf(lozenge)).not.toMatch(/uppercase|font-semibold/);
      expectTokens(lozenge);
    }
  });
});

describe("Separator", () => {
  it("is a separator horizontally and vertically, hidden when decorative, and text when labelled", () => {
    inLocale(
      <>
        <Separator />
        <div style={{ display: "flex" }}><span>List</span><Separator orientation="vertical" /><span>Calendar</span></div>
        <Separator decorative />
        <Separator>or continue with email</Separator>
      </>,
    );
    const separators = screen.getAllByRole("separator");
    expect(separators).toHaveLength(2);
    expect(separators[0]!.tagName).toBe("HR");
    expect(separators[1]!.getAttribute("aria-orientation")).toBe("vertical");
    expect(classesOf(separators[1])).toContain("w-px");
    const decorative = document.querySelectorAll('[data-slot="separator"]')[2]!;
    expect(decorative.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByText("or continue with email").getAttribute("data-slot")).toBe("separator-label");
    for (const separator of separators) expectTokens(separator);
  });
});

describe("Kbd", () => {
  it("renders each key as a keycap and the modifier for the platform", async () => {
    inLocale(<span><ModifierKbd /> <Kbd>K</Kbd></span>);
    const keys = Array.from(document.querySelectorAll("kbd"));
    expect(keys.map((key) => key.textContent)).toEqual(["Ctrl", "K"]);
    expect(classesOf(keys[1])).toContain("font-ds-mono");
    expect(classesOf(keys[1])).toContain("border-b-ds-border-bold");
    expectTokens(keys[1]);
    cleanup();
    const platform = vi.spyOn(navigator, "platform", "get").mockReturnValue("MacIntel");
    inLocale(<ModifierKbd />);
    await act(async () => {});
    // The glyph is hidden and the key's name is text, since aria-label is not allowed on <kbd>.
    const key = document.querySelector("kbd");
    expect(key?.querySelector('[aria-hidden="true"]')?.textContent).toBe("⌘");
    expect(key?.querySelector(".sr-only")?.textContent).toBe("Command");
    expect(key?.hasAttribute("aria-label")).toBe(false);
    platform.mockRestore();
  });
});

describe("strings and direction", () => {
  const people = (
    <AvatarGroup max={1}>
      <Avatar name="Ada Lovelace" presence="online" />
      <Avatar name="Grace Hopper" />
      <Avatar name="Alan Turing" />
    </AvatarGroup>
  );

  it("speaks a registered language, with English for a language nobody registered", () => {
    for (const key of ["selected", "online", "morePeople"] as const) expect(DS_STRINGS[key].en, key).toBeTruthy();
    registerDsStrings("de", { online: "verfügbar", morePeople: "{count} weitere" });
    // A regional tag uses its language's strings; a language nobody registered gets English.
    for (const [locale, online, more] of [
      ["de", "verfügbar", "2 weitere"], ["de-AT", "verfügbar", "2 weitere"], ["en", "online", "2 more"], ["nl", "online", "2 more"],
    ] as const) {
      inLocale(people, locale);
      expect(screen.getByRole("img", { name: `Ada Lovelace (${online})` }), locale).toBeTruthy();
      expect(slot("avatar-group-more")?.getAttribute("aria-label"), locale).toBe(more);
      cleanup();
    }
  });

  it("formats with the tag an app locale stands for, and keeps that locale's own words", () => {
    // An app tag that is not valid BCP 47 is handed to Intl and React Aria as its registered stand-in.
    registerLocaleAliases({ "x-shop": "sr-Latn-ME" });
    registerDsStrings("x-shop", { online: "na mreži" });
    expect(intlLocale("x-shop")).toBe("sr-Latn-ME");
    expect(intlLocale("sr-Cyrl")).toBe("sr-Cyrl");
    expect(intlLocale("en")).toBe("en");
    inLocale(people, "x-shop");
    // React Aria hands the components the formatting tag; the strings still come from the app locale's own table.
    expect(screen.getByRole("img", { name: "Ada Lovelace (na mreži)" })).toBeTruthy();
    // A string the app did not give stays English.
    expect(slot("avatar-group-more")?.getAttribute("aria-label")).toBe("2 more");
  });

  it("renders every part with logical classes", () => {
    const { container } = inLocale(
      <div dir="rtl">
        <Card href="/x"><CardMedia /><CardHeader title="ا" menu={<Button aria-label="ب" iconOnly iconBefore="ellipsis" />} /><CardBody>ج</CardBody><CardFooter>د</CardFooter></Card>
        <AvatarGroup><Avatar name="ز ح" presence="online" /><Avatar name="ط" /></AvatarGroup>
        <BadgeAnchor><span>ي</span><Badge variant="count" value={4} isOnIcon /></BadgeAnchor>
        <Badge hasDot>ك</Badge>
        <Separator>ل</Separator>
        <Kbd>م</Kbd>
      </div>,
      "ar",
    );
    const parts = Array.from(container.querySelectorAll("[data-slot]"));
    expect(parts.length).toBeGreaterThan(20);
    // Counts keep their order in RTL.
    expect(container.querySelector('[data-slot="badge"] bdi')?.textContent).toBe("4");
    for (const part of parts) expect(classesOf(part), part.getAttribute("data-slot") ?? "").not.toMatch(PHYSICAL);
  });
});
