import fs from "node:fs";
import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createTheme, toCSS } from "@senvenli/tokens";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Button, Fab } from "./index";
import { DropZone, FileUploadList, FileRow, FileTrigger, formatFileSize, validateFiles } from "../form/index";
import { DS_STRINGS, registerDsStrings } from "../i18n";
import { filesFrom } from "../form/files";

const originalMatchMedia = window.matchMedia;
const originalCreate = URL.createObjectURL;
const originalRevoke = URL.revokeObjectURL;
afterEach(() => {
  window.matchMedia = originalMatchMedia;
  Object.assign(URL, { createObjectURL: originalCreate, revokeObjectURL: originalRevoke });
});

afterEach(cleanup);

// A helper, not an inline `new URL("…", import.meta.url)`: Vite rewrites that literal form into an asset URL.
const here = (file: string) => new URL(file, import.meta.url);
const theme = toCSS(createTheme(), { tailwind: true }) + fs.readFileSync(here("../../styles/theme.css"), "utf8");
const PHYSICAL = /(^|\s|:)(-?m[lr]-|p[lr]-|left-|right-|border-[lr](-|\s|$)|rounded-[lr]-|text-left|text-right)/;
const classesOf = (element: Element | null) => element?.getAttribute("class") ?? "";

function inProvider(ui: React.ReactElement, locale = "en") {
  return render(<DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>);
}

const file = (name: string, size: number, type: string) => new File([new Uint8Array(size)], name, { type });
const RULES = { acceptedFileTypes: ["image/jpeg", "image/png", ".heic"], maxSize: 10_000_000 };

function pick(container: HTMLElement, files: File[]) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files } });
  return input;
}

describe("validateFiles", () => {
  it("rejects each bad file with its reason and keeps the others", () => {
    const good = file("front.jpg", 2_000, "image/jpeg");
    const heic = file("side.HEIC", 3_000, "");
    const big = file("back.png", 12_400_000, "image/png");
    const pdf = file("report.pdf", 1_000, "application/pdf");
    const { accepted, rejected } = validateFiles([good, big, heic, pdf], RULES, "en");
    expect(accepted).toEqual([good, heic]);
    expect(rejected.map((entry) => entry.file)).toEqual([big, pdf]);
    expect(rejected[0].reason).toBe(`The file is over the ${formatFileSize(10_000_000, "en")} limit.`);
    expect(rejected[1].reason).toBe(DS_STRINGS.wrongType.en);
  });

  it("accepts wildcard types and anything when no rules are set", () => {
    const photo = file("a.webp", 10, "image/webp");
    expect(validateFiles([photo], { acceptedFileTypes: ["image/*"] }, "en").accepted).toEqual([photo]);
    expect(validateFiles([photo], {}, "en").rejected).toEqual([]);
  });

  it("writes sizes the way the locale does", () => {
    expect(formatFileSize(980_000, "en")).toBe("980 kB");
    expect(formatFileSize(2_400_000, "en")).toMatch(/^2\.4\sMB$/);
    expect(formatFileSize(2_400_000, "de")).toMatch(/^2,4\sMB$/);
    expect(formatFileSize(512, "en")).toMatch(/512\s?byte/);
    // Rounded before the unit is chosen: never "1,000 kB".
    expect(formatFileSize(999_700, "en")).toBe("1 MB");
    expect(formatFileSize(999_960_000, "en")).toBe("1 GB");
  });
});

describe("FileTrigger", () => {
  it("opens the picker from a DS button and splits accepted from rejected", () => {
    const onSelect = vi.fn();
    const onReject = vi.fn();
    const { container } = inProvider(
      <FileTrigger {...RULES} allowsMultiple onSelect={onSelect} onReject={onReject}>
        <Button iconBefore="upload">Upload document</Button>
      </FileTrigger>,
    );
    expect(screen.getByRole("button", { name: "Upload document" })).toBeTruthy();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.getAttribute("accept")).toBe("image/jpeg,image/png,.heic");
    const good = file("front.jpg", 10, "image/jpeg");
    const bad = file("notes.txt", 10, "text/plain");
    pick(container, [good, bad]);
    expect(onSelect).toHaveBeenCalledWith([good]);
    expect(onReject).toHaveBeenCalledWith([{ file: bad, reason: expect.any(String) }]);
  });
});

describe("DropZone", () => {
  it("states the types and the size limit before the user picks", () => {
    inProvider(<DropZone label="Drag photos here" typesLabel="JPG, PNG, HEIC" {...RULES} />);
    const zone = document.querySelector('[data-slot="drop-zone"]');
    expect(zone?.textContent).toContain("Drag photos here");
    expect(zone?.textContent).toContain("JPG, PNG, HEIC");
    expect(zone?.textContent).toContain(`up to ${formatFileSize(10_000_000, "en")}`);
    expect(screen.getByRole("button", { name: DS_STRINGS.chooseFiles.en })).toBeTruthy();
  });

  it("keeps the first file on a single-file zone and rejects the extras with a reason", () => {
    const onSelect = vi.fn();
    const onReject = vi.fn();
    const { container } = inProvider(<DropZone label="Document" onSelect={onSelect} onReject={onReject} />);
    const a = file("a.jpg", 10, "image/jpeg");
    const b = file("b.jpg", 10, "image/jpeg");
    pick(container, [a, b]);
    expect(onSelect).toHaveBeenCalledWith([a]);
    expect(onReject).toHaveBeenCalledWith([{ file: b, reason: DS_STRINGS.onlyOne.en }]);
  });

  it("names its keyboard and paste target with the label", () => {
    inProvider(<DropZone label="Drag photos here" />);
    expect(screen.getByRole("button", { name: "Drag photos here" })).toBeTruthy();
  });

  it("reads dropped files and skips folders, text and unreadable files", async () => {
    const a = file("a.jpg", 10, "image/jpeg");
    const items = [
      { kind: "file", type: "image/jpeg", name: "a.jpg", getFile: () => Promise.resolve(a), getText: vi.fn() },
      { kind: "file", type: "image/png", name: "broken.png", getFile: () => Promise.reject(new Error("unreadable")), getText: vi.fn() },
      { kind: "directory", name: "folder", getEntries: vi.fn() },
      { kind: "text", types: new Set(["text/plain"]), getText: vi.fn() },
    ];
    await expect(filesFrom(items as never)).resolves.toEqual([a]);
  });

  it("shows a dragged file with the selected fill and border, and keyboard focus as the inner border", () => {
    inProvider(<DropZone label="Document" />);
    const classes = classesOf(document.querySelector('[data-slot="drop-zone"]'));
    expect(classes).toContain("data-[drop-target]:bg-ds-background-selected");
    expect(classes).toContain("data-[drop-target]:border-ds-border-selected");
    expect(classes).toContain("data-[focus-visible]:inset-ring-2");
    expect(classes).toContain("border-dashed");
  });

  it("disables the picker with the zone and shows both as disabled", () => {
    inProvider(<DropZone label="Document" isDisabled />);
    const zone = document.querySelector('[data-slot="drop-zone"]');
    expect(zone?.hasAttribute("data-disabled")).toBe(true);
    expect(classesOf(zone)).toContain("data-[disabled]:bg-ds-background-disabled");
    const choose = screen.getByRole("button", { name: DS_STRINGS.chooseFiles.en });
    expect(choose.hasAttribute("disabled")).toBe(true);
    expect(classesOf(choose)).toContain("data-[disabled]:text-ds-text-disabled");
    expect(classesOf(choose)).toContain("data-[disabled]:cursor-not-allowed");
  });
});

describe("FileRow and FileUploadList", () => {
  const create = vi.fn(() => "blob:thumb");
  const revoke = vi.fn();
  beforeEach(() => {
    create.mockClear();
    revoke.mockClear();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
  });

  it("shows a photo's thumbnail at once and revokes its URL on unmount", () => {
    const photo = file("front.jpg", 2_400_000, "image/jpeg");
    const { unmount } = inProvider(<FileUploadList aria-label="Files"><FileRow file={photo} onRemove={() => {}} /></FileUploadList>);
    expect(document.querySelector('[data-slot="file-thumbnail"] img')?.getAttribute("src")).toBe("blob:thumb");
    expect(screen.getByRole("list", { name: "Files" }).getAttribute("role")).toBe("list");
    unmount();
    expect(revoke).toHaveBeenCalledWith("blob:thumb");
  });

  it("falls back to the file icon when the browser cannot draw the image", () => {
    inProvider(<FileRow file={file("scan.heic", 10, "image/heic")} />);
    const img = document.querySelector('[data-slot="file-thumbnail"] img') as HTMLImageElement;
    fireEvent.error(img);
    expect(document.querySelector('[data-slot="file-thumbnail"] img')).toBeNull();
    expect(document.querySelector('[data-slot="file-thumbnail"] svg')).not.toBeNull();
  });

  it("revokes the old URL and makes a new one when the file changes", () => {
    create.mockReturnValueOnce("blob:first").mockReturnValueOnce("blob:second");
    const first = file("a.jpg", 10, "image/jpeg");
    const { rerender } = inProvider(<FileRow file={first} />);
    rerender(<DesignSystemProvider locale="en" navigate={vi.fn()}><FileRow file={file("b.jpg", 10, "image/jpeg")} /></DesignSystemProvider>);
    expect(revoke).toHaveBeenCalledWith("blob:first");
    expect(document.querySelector('[data-slot="file-thumbnail"] img')?.getAttribute("src")).toBe("blob:second");
  });

  it("never makes a URL for a non-image file", () => {
    inProvider(<FileRow file={file("report.pdf", 10, "application/pdf")} />);
    expect(create).not.toHaveBeenCalled();
    expect(document.querySelector('[data-slot="file-thumbnail"] img')).toBeNull();
  });

  it("reports upload progress and offers cancel while uploading", () => {
    const onCancel = vi.fn();
    inProvider(<FileRow name="side-view.jpg" size={2_400_000} progress={0.62} onCancel={onCancel} onRemove={() => {}} />);
    const bar = screen.getByRole("progressbar", { name: "side-view.jpg" });
    expect(bar.getAttribute("aria-valuenow")).toBe("62");
    expect(bar.getAttribute("aria-valuetext")).toBe(`${formatFileSize(2_400_000 * 0.62, "en")} / ${formatFileSize(2_400_000, "en")}`);
    fireEvent.click(screen.getByRole("button", { name: DS_STRINGS.cancelUpload.en }));
    expect(onCancel).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: DS_STRINGS.removeFile.en })).toBeNull();
    expect(document.querySelector('[data-slot="file-row"]')?.getAttribute("data-state")).toBe("uploading");
  });

  it("shows the per-file error in danger text with a replace action", () => {
    const onReplace = vi.fn();
    inProvider(<FileRow name="scan.heic" size={12_400_000} error="The file is over the 10 MB limit." onReplace={onReplace} />);
    const error = document.querySelector('[data-slot="file-error"]');
    expect(error?.textContent).toBe("The file is over the 10 MB limit.");
    expect(error?.getAttribute("role")).toBe("status");
    expect(classesOf(error)).toContain("text-ds-text-danger");
    fireEvent.click(screen.getByRole("button", { name: DS_STRINGS.replace.en }));
    expect(onReplace).toHaveBeenCalled();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("shows size in tabular figures once done, with remove", () => {
    inProvider(<FileRow name="contract.pdf" size={980_000} onRemove={() => {}} />);
    const meta = document.querySelector('[data-slot="file-meta"]');
    expect(meta?.textContent).toBe(`${formatFileSize(980_000, "en")} · ${DS_STRINGS.uploaded.en}`);
    expect(classesOf(meta)).toContain("tabular-nums");
    expect(screen.getByRole("button", { name: DS_STRINGS.removeFile.en })).toBeTruthy();
  });
});

describe("Fab", () => {
  it("iconOnly: a round icon button at every width, named by its label", () => {
    inProvider(<Fab iconBefore="plus" iconOnly placement="inline" onPress={() => {}}>New order</Fab>);
    const fab = screen.getByRole("button", { name: "New order" });
    expect(fab.hasAttribute("data-collapsed")).toBe(true);
    expect(fab.querySelector('[data-slot="fab-label"]')).toBeNull();
  });

  function setPhone(matches: boolean) {
    const listeners = new Set<() => void>();
    const media = { matches, addEventListener: (_: string, fn: () => void) => listeners.add(fn), removeEventListener: (_: string, fn: () => void) => listeners.delete(fn) };
    window.matchMedia = vi.fn(() => media) as unknown as typeof window.matchMedia;
  }
  afterEach(() => {
    Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
  });

  it("is a labelled button in the brand tone by default, fixed at the logical end above the safe area", () => {
    const onPress = vi.fn();
    inProvider(<Fab iconBefore="calendar-plus" onPress={onPress}>Create invoice</Fab>);
    const fab = screen.getByRole("button", { name: "Create invoice" });
    expect(fab.getAttribute("data-slot")).toBe("fab");
    const classes = classesOf(fab);
    for (const utility of ["fixed", "end-ds-300", "safe-area-inset-bottom", "rounded-ds-full", "shadow-ds-overlay", "bg-ds-background-brand-bold", "h-12"]) {
      expect(classes).toContain(utility);
    }
    fireEvent.click(fab);
    expect(onPress).toHaveBeenCalled();
  });

  it("is a link when it has an href, in the brand tone, and sits in the page flow when inline", () => {
    inProvider(<Fab placement="inline" iconBefore="message-circle" href="https://example.com/help">Chat with us</Fab>);
    const link = screen.getByRole("link", { name: "Chat with us (opens in a new tab)" });
    expect(link.getAttribute("href")).toBe("https://example.com/help");
    expect(classesOf(link)).toContain("bg-ds-background-brand-bold");
    expect(classesOf(link)).toContain("text-ds-text-on-brand");
    expect(classesOf(link)).not.toContain("fixed");
  });

  it("collapses to icon-only on phones after the first scroll and keeps its name", () => {
    setPhone(true);
    inProvider(<Fab iconBefore="message-circle" onPress={() => {}}>Chat with us</Fab>);
    const fab = screen.getByRole("button", { name: "Chat with us" });
    expect(fab.hasAttribute("data-collapsed")).toBe(false);
    act(() => {
      Object.defineProperty(window, "scrollY", { value: 120, configurable: true });
      window.dispatchEvent(new Event("scroll"));
    });
    expect(fab.getAttribute("data-collapsed")).toBe("true");
    expect(fab.getAttribute("aria-label")).toBe("Chat with us");
    expect(fab.querySelector('[data-slot="fab-label"]')).toBeNull();
  });

  it("stays extended on wider screens and when collapsing is off", () => {
    setPhone(false);
    inProvider(<Fab iconBefore="calendar-plus" onPress={() => {}}>Create invoice</Fab>);
    act(() => {
      Object.defineProperty(window, "scrollY", { value: 400, configurable: true });
      window.dispatchEvent(new Event("scroll"));
    });
    expect(screen.getByRole("button", { name: "Create invoice" }).hasAttribute("data-collapsed")).toBe(false);
    cleanup();
    setPhone(true);
    inProvider(<Fab iconBefore="calendar-plus" collapseOnScroll={false} onPress={() => {}}>Create invoice</Fab>);
    expect(screen.getByRole("button", { name: "Create invoice" }).hasAttribute("data-collapsed")).toBe(false);
  });
});

describe("tokens, strings and direction", () => {
  it("only uses colour utilities that exist in the theme", () => {
    setNoMatch();
    Object.assign(URL, { createObjectURL: () => "blob:x", revokeObjectURL: () => {} });
    const { container } = inProvider(
      <>
        <DropZone label="Document" typesLabel="PDF" maxSize={1000} />
        <FileUploadList><FileRow name="a.jpg" size={10} progress={0.3} onCancel={() => {}} /><FileRow name="b" error="x" /></FileUploadList>
        <Fab iconBefore="calendar-plus">New</Fab>
        <Fab iconBefore="message-circle" placement="inline">Chat</Fab>
      </>,
    );
    const utilities = Array.from(container.querySelectorAll("[class]")).flatMap((element) => classesOf(element).split(/\s+/));
    for (const utility of utilities) {
      const color = /(?:^|:)(?:bg|text|border|inset-ring)-(ds-[a-z-]*)$/.exec(utility);
      if (color) expect(theme, utility).toMatch(new RegExp(`--(color|text)-${color[1]}:`));
      const size = /(?:^|:)(?:size|h|w|p[xyse]?|gap|end|start)-(ds-[a-z0-9-]+)$/.exec(utility);
      if (size) expect(theme, utility).toContain(`--spacing-${size[1]}:`);
    }
    expect(utilities.filter((utility) => PHYSICAL.test(` ${utility}`))).toEqual([]);
  });

  it("has every file string in English with its placeholders, and uses a registered language for all of them", () => {
    for (const key of ["chooseFiles", "orChoose", "upTo", "tooLarge", "wrongType", "onlyOne", "cancelUpload", "removeFile", "replace", "uploaded"] as const) {
      const text = DS_STRINGS[key].en;
      expect(text, key).toBeTruthy();
      if (key === "orChoose") expect(text).toContain("{choose}");
      if (key === "upTo" || key === "tooLarge") expect(text, key).toContain("{size}");
    }
    registerDsStrings("de", {
      chooseFiles: "vom Computer hochladen", orChoose: "oder {choose}", upTo: "bis zu {size}", tooLarge: "Die Datei hat mehr als {size}.",
      wrongType: "Dieser Dateityp wird nicht akzeptiert.", onlyOne: "Hier passt nur eine Datei.", cancelUpload: "Upload abbrechen",
      removeFile: "Datei entfernen", replace: "Ersetzen", uploaded: "hochgeladen",
    });
    const limit = formatFileSize(10_000_000, "de");
    const big = file("back.png", 12_400_000, "image/png");
    const pdf = file("report.pdf", 1_000, "application/pdf");
    // A regional tag uses its language's strings.
    expect(validateFiles([big, pdf], RULES, "de-AT").rejected.map((entry) => entry.reason)).toEqual([
      `Die Datei hat mehr als ${limit}.`, "Dieser Dateityp wird nicht akzeptiert.",
    ]);
    const onReject = vi.fn();
    const { container } = inProvider(
      <>
        <DropZone label="Dokument" {...RULES} onReject={onReject} />
        <FileRow name="a.jpg" size={2_400_000} progress={0.5} onCancel={() => {}} />
        <FileRow name="b.pdf" size={980_000} onRemove={() => {}} />
        <FileRow name="c.pdf" error="x" onReplace={() => {}} />
      </>,
      "de",
    );
    const zone = container.querySelector('[data-slot="drop-zone"]');
    expect(zone?.textContent).toContain("oder vom Computer hochladen");
    expect(zone?.textContent).toContain(`bis zu ${limit}`);
    expect(screen.getByRole("button", { name: "vom Computer hochladen" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Upload abbrechen" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Datei entfernen" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ersetzen" })).toBeTruthy();
    expect(container.querySelectorAll('[data-slot="file-meta"]')[1]?.textContent).toBe(`${formatFileSize(980_000, "de")} · hochgeladen`);
    const a = file("a.jpg", 10, "image/jpeg");
    const b = file("b.jpg", 10, "image/jpeg");
    pick(container, [a, b]);
    expect(onReject).toHaveBeenCalledWith([{ file: b, reason: "Hier passt nur eine Datei." }]);
  });

  it("falls back to English in a right-to-left page whose language has no registered strings", () => {
    setNoMatch();
    inProvider(<div dir="rtl"><DropZone label="ملف" /><FileRow name="a.pdf" size={10} onRemove={() => {}} /></div>, "he");
    expect(screen.getByRole("button", { name: DS_STRINGS.chooseFiles.en })).toBeTruthy();
    expect(screen.getByRole("button", { name: DS_STRINGS.removeFile.en })).toBeTruthy();
  });
});

function setNoMatch() {
  window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} })) as unknown as typeof window.matchMedia;
}
