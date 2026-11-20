import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { I18nProvider } from "react-aria-components";
import { registerDsStrings } from "../i18n";
import { ImageViewer, type ImageViewerImageProps } from "./index";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function TestImage({ fill: _fill, priority: _priority, ...props }: ImageViewerImageProps) {
  return <img {...props} />;
}

const labels = {
  positionLabel: (index: number, total: number) => `Photo ${index} of ${total}`,
  closeLabel: "Close photos",
  previousLabel: "Previous photo",
  nextLabel: "Next photo",
};

const photos = ["/a.jpg", "/b.jpg", "/c.jpg"];

function renderViewer(overrides: Partial<React.ComponentProps<typeof ImageViewer>> = {}) {
  return render(
    <ImageViewer
      image={TestImage}
      photos={photos}
      alt="Walnut desk lamp"
      title="Walnut desk lamp"
      onClose={vi.fn()}
      {...labels}
      {...overrides}
    />,
  );
}

/** The strip is the only region holding one button per photo. */
function strip() {
  return screen.getByRole("button", { name: "Photo 1 of 3" }).parentElement!;
}

describe("ImageViewer filmstrip", () => {
  it("offers a thumbnail per photo, named by the position caption", () => {
    // Reusing positionLabel is what keeps this feature free for consumers: no
    // new prop, so every surface gets the strip unchanged.
    renderViewer();
    for (const position of [1, 2, 3]) {
      expect(
        screen.getByRole("button", { name: `Photo ${position} of 3` }),
      ).toBeTruthy();
    }
    expect(within(strip()).getAllByRole("button")).toHaveLength(3);
  });

  it("marks the open photo and moves the mark when a thumbnail is picked", () => {
    renderViewer({ initialIndex: 0 });
    // Exact names: the chevrons are "Previous/Next photo", so a loose
    // pattern would pick those up too.
    const first = screen.getByRole("button", { name: "Photo 1 of 3" });
    const third = screen.getByRole("button", { name: "Photo 3 of 3" });
    expect(first.getAttribute("aria-current")).toBe("true");
    expect(third.getAttribute("aria-current")).toBe("false");

    fireEvent.click(third);
    expect(
      screen.getByRole("button", { name: "Photo 3 of 3" }).getAttribute("aria-current"),
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: "Photo 1 of 3" }).getAttribute("aria-current"),
    ).toBe("false");
  });

  it("follows the arrows, so the strip keeps saying where you are", () => {
    renderViewer({ initialIndex: 0 });
    fireEvent.click(screen.getByRole("button", { name: "Next photo" }));
    expect(
      screen.getByRole("button", { name: "Photo 2 of 3" }).getAttribute("aria-current"),
    ).toBe("true");
  });

  it("follows physical arrow keys and wraps at both ends", () => {
    renderViewer({ initialIndex: 0 });

    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(
      screen.getByRole("button", { name: "Photo 2 of 3" }).getAttribute("aria-current"),
    ).toBe("true");

    fireEvent.keyDown(document, { key: "ArrowLeft" });
    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect(
      screen.getByRole("button", { name: "Photo 3 of 3" }).getAttribute("aria-current"),
    ).toBe("true");
  });

  it("does not take arrow keys away from editable controls", () => {
    renderViewer({ initialIndex: 0 });
    const input = document.createElement("input");
    document.body.append(input);

    fireEvent.keyDown(input, { key: "ArrowRight" });

    expect(
      screen.getByRole("button", { name: "Photo 1 of 3" }).getAttribute("aria-current"),
    ).toBe("true");
    input.remove();
  });

  it("removes its document keyboard listener when the viewer unmounts", () => {
    const addSpy = vi.spyOn(document, "addEventListener");
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const { unmount } = renderViewer();
    const keyboardListener = addSpy.mock.calls.find(
      ([type, , options]) => type === "keydown" && options === true,
    )?.[1];

    expect(keyboardListener).toBeTypeOf("function");
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("keydown", keyboardListener, true);
  });

  it("sits below the stage, never over the photo", () => {
    // Everything laid on the photo hides part of what the reader opened the
    // viewer to see. The strip is a sibling of the stage, not an overlay.
    renderViewer();
    expect(strip().className).not.toContain("absolute");
    expect(strip().className).toContain("overflow-x-auto");
  });

  it("shows no strip for a single photo", () => {
    renderViewer({ photos: ["/only.jpg"] });
    expect(screen.queryByRole("button", { name: "Photo 1 of 1" })).toBeNull();
  });
});

/** Closing, focus, right-to-left and the theme-proof dark stage. */
describe("ImageViewer dialog", () => {
  it("closes on Esc and on the close button", () => {
    const onClose = vi.fn();
    renderViewer({ onClose });
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Close photos" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("names the dialog by the title and describes it by the position", () => {
    renderViewer({ initialIndex: 1 });
    const dialog = screen.getByRole("dialog", { name: "Walnut desk lamp" });
    const description = document.getElementById(dialog.getAttribute("aria-describedby")!);
    expect(description?.textContent).toBe("Photo 2 of 3");
  });

  it("takes focus while open and returns it to what opened it", async () => {
    function Harness() {
      const [open, setOpen] = React.useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>Open photos</button>
          {open && <ImageViewer image={TestImage} photos={photos} alt="x" title="x" onClose={() => setOpen(false)} {...labels} />}
        </>
      );
    }
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Open photos" });
    act(() => opener.focus());
    fireEvent.click(opener);
    await waitFor(() => expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true));

    fireEvent.click(screen.getByRole("button", { name: "Close photos" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it("follows the reading direction for the arrow keys in right-to-left", () => {
    render(
      <I18nProvider locale="ar">
        <ImageViewer image={TestImage} photos={photos} alt="x" title="x" onClose={vi.fn()} {...labels} />
      </I18nProvider>,
    );
    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect(screen.getByRole("button", { name: "Photo 2 of 3" }).getAttribute("aria-current")).toBe("true");
  });

  it("is dark in both themes on DS tokens", () => {
    renderViewer();
    expect(document.querySelector('[data-slot="image-viewer"]')?.getAttribute("data-theme")).toBe("dark");
  });
});

describe("ImageViewer caption direction", () => {
  it("lets the caption's own script order it, so the position never reverses on a right-to-left page", () => {
    renderViewer();
    const caption = document.querySelector('[data-slot="image-viewer-caption"]')!;
    for (const line of Array.from(caption.querySelectorAll("p"))) expect(line.getAttribute("dir")).toBe("auto");
  });
});

/** Nothing injected: plain `<img>` elements and the DS strings. */
describe("ImageViewer defaults", () => {
  const stageImage = () => document.querySelector<HTMLImageElement>('[data-slot="image-viewer-stage"] img')!;
  const thumbnails = () => Array.from(document.querySelectorAll<HTMLImageElement>('[data-slot="image-viewer-thumbnail"] img'));

  it("renders plain img elements without an image prop: the stage photo with its alt, thumbnails with none", () => {
    render(<ImageViewer photos={photos} initialIndex={1} alt="Lamp on a desk" title="Walnut desk lamp" onClose={vi.fn()} />);
    expect(stageImage().tagName).toBe("IMG");
    expect(stageImage().getAttribute("src")).toBe("/b.jpg");
    expect(stageImage().getAttribute("alt")).toBe("Lamp on a desk");
    // The open photo is loaded eagerly and fills the stage.
    expect(stageImage().getAttribute("loading")).toBe("eager");
    for (const name of ["absolute", "inset-0", "size-full", "object-contain"]) expect(stageImage().className.split(/\s+/)).toContain(name);

    expect(thumbnails().map((thumb) => thumb.getAttribute("src"))).toEqual(photos);
    for (const thumb of thumbnails()) {
      expect(thumb.getAttribute("alt")).toBe("");
      expect(thumb.getAttribute("loading")).toBe("lazy");
      for (const name of ["absolute", "inset-0", "size-full"]) expect(thumb.className.split(/\s+/)).toContain(name);
    }
    // `fill`, `preload` and `priority` are the renderer's props, never attributes.
    for (const image of [stageImage(), ...thumbnails()]) {
      for (const attribute of ["fill", "preload", "priority"]) expect(image.hasAttribute(attribute)).toBe(false);
    }
  });

  it("uses the DS English strings without label props", () => {
    render(<ImageViewer photos={photos} initialIndex={1} alt="Lamp on a desk" title="Walnut desk lamp" onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Close" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Previous image" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Next image" })).toBeTruthy();
    for (const position of [1, 2, 3]) expect(screen.getByRole("button", { name: `Image ${position} of 3` })).toBeTruthy();
    const dialog = screen.getByRole("dialog", { name: "Walnut desk lamp" });
    expect(document.getElementById(dialog.getAttribute("aria-describedby")!)?.textContent).toBe("Image 2 of 3");
    expect(document.querySelector('[data-slot="image-viewer-caption"]')!.textContent).toContain("Image 2 of 3");
  });

  it("a label prop still wins over the DS string, one by one", () => {
    render(<ImageViewer photos={photos} alt="Lamp on a desk" title="Walnut desk lamp" onClose={vi.fn()} closeLabel="Close photos" />);
    expect(screen.getByRole("button", { name: "Close photos" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
    expect(screen.getByRole("button", { name: "Next image" })).toBeTruthy();
  });

  it("picks up an app's registered words for the locale; what it leaves out stays English", () => {
    // React Aria's own hidden dismiss button is "Schließen" in German: the app's word is told apart from it.
    registerDsStrings("de", { close: "Fenster schließen", previousImage: "Vorheriges Bild", imagePosition: "Bild {index} von {total}" });
    render(
      <I18nProvider locale="de">
        <ImageViewer photos={photos} alt="Lamp on a desk" title="Walnut desk lamp" onClose={vi.fn()} />
      </I18nProvider>,
    );
    expect(screen.getByRole("button", { name: "Fenster schließen" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Vorheriges Bild" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Bild 3 von 3" })).toBeTruthy();
    // Not registered: English.
    expect(screen.getByRole("button", { name: "Next image" })).toBeTruthy();
  });

  it("a locale with no words of its own falls back to English", () => {
    render(
      <I18nProvider locale="fr">
        <ImageViewer photos={photos} alt="Lamp on a desk" title="Walnut desk lamp" onClose={vi.fn()} />
      </I18nProvider>,
    );
    expect(screen.getByRole("button", { name: "Close" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Image 1 of 3" })).toBeTruthy();
  });
});
