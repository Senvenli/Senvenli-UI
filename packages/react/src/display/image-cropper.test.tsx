import * as React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { registerDsStrings } from "../i18n";
import { DesignSystemProvider } from "../provider";
import { ImageCropper } from "./index";
import { cropRegion, drawCrop, outputSize, rotatedSize, type CropContext } from "./image-crop";

/** A 2D context that records what is drawn, in order. */
function recorder() {
  const calls: string[] = [];
  const context = {
    fillStyle: "",
    imageSmoothingEnabled: false,
    imageSmoothingQuality: "low",
    clearRect: () => calls.push("clearRect"),
    fillRect: (...args: number[]) => calls.push(`fillRect ${args.join(",")} ${context.fillStyle}`),
    save: () => calls.push("save"),
    restore: () => calls.push("restore"),
    translate: (x: number, y: number) => calls.push(`translate ${Math.round(x)},${Math.round(y)}`),
    rotate: (angle: number) => calls.push(`rotate ${Math.round((angle * 180) / Math.PI)}`),
    scale: (x: number) => calls.push(`scale ${x.toFixed(3)}`),
    drawImage: () => calls.push("drawImage"),
  };
  return { context: context as unknown as CropContext, calls };
}

describe("image-crop geometry", () => {
  const photo = { width: 4000, height: 3000 };

  it("cover at zoom 1 is the largest region of the frame's shape inside the image; zoom shrinks it", () => {
    expect(cropRegion(photo, 16 / 9, "cover", { zoom: 1, centerX: 2000, centerY: 1500 })).toEqual({ left: 0, top: 375, width: 4000, height: 2250 });
    const zoomed = cropRegion(photo, 16 / 9, "cover", { zoom: 2, centerX: 0, centerY: 0 });
    // The centre is clamped so the region stays on the image.
    expect(zoomed).toEqual({ left: 0, top: 0, width: 2000, height: 1125 });
  });

  it("contain at zoom 1 holds the whole image, the rest empty and centred", () => {
    const region = cropRegion(photo, 1, "contain", { zoom: 1, centerX: 4000, centerY: 0 });
    expect(region).toEqual({ left: 0, top: -500, width: 4000, height: 4000 });
  });

  it("never upscales: the output is the region in source pixels, only scaled down", () => {
    expect(outputSize({ left: 0, top: 0, width: 1280, height: 720 }, { maxOutputSize: 2560, minOutputSize: 1920 })).toEqual({ width: 1280, height: 720, scale: 1, small: true });
    expect(outputSize({ left: 0, top: 0, width: 4000, height: 2250 }, { maxOutputSize: 2560 })).toEqual({ width: 2560, height: 1440, scale: 0.64, small: false });
    expect(rotatedSize(4000, 3000, 90)).toEqual({ width: 3000, height: 4000 });
  });

  it("contain never paints black: JPEG fills the background first, white by default", () => {
    const region = cropRegion({ width: 380, height: 190 }, 1, "contain", { zoom: 1, centerX: 190, centerY: 95 });
    const size = outputSize(region, {});
    const jpeg = recorder();
    drawCrop(jpeg.context, {} as CanvasImageSource, { width: 380, height: 190 }, region, size, { rotation: 0, outputType: "image/jpeg" });
    expect(jpeg.calls.slice(0, 2)).toEqual(["clearRect", "fillRect 0,0,380,380 #ffffff"]);
    expect(jpeg.calls.indexOf("drawImage")).toBeGreaterThan(1);
    const grey = recorder();
    drawCrop(grey.context, {} as CanvasImageSource, { width: 380, height: 190 }, region, size, { rotation: 0, outputType: "image/jpeg", background: "#ebe9e6" });
    expect(grey.calls[1]).toBe("fillRect 0,0,380,380 #ebe9e6");
  });

  it("PNG and WebP keep the empty area transparent: nothing is filled", () => {
    for (const outputType of ["image/png", "image/webp"] as const) {
      const png = recorder();
      const region = cropRegion({ width: 380, height: 190 }, 1, "contain", { zoom: 1, centerX: 190, centerY: 95 });
      drawCrop(png.context, {} as CanvasImageSource, { width: 380, height: 190 }, region, outputSize(region, {}), { rotation: 0, outputType });
      expect(png.calls.some((call) => call.startsWith("fillRect"))).toBe(false);
    }
  });

  it("draws the turned image so the region fills the canvas", () => {
    const { context, calls } = recorder();
    const source = { width: 4000, height: 3000 };
    const turned = rotatedSize(4000, 3000, 90);
    const region = cropRegion(turned, 1, "cover", { zoom: 1, centerX: 1500, centerY: 2000 });
    drawCrop(context, {} as CanvasImageSource, source, region, { width: 3000, height: 3000 }, { rotation: 90, outputType: "image/png" });
    expect(calls).toEqual(["clearRect", "save", "scale 1.000", "translate 0,-500", "translate 1500,2000", "rotate 90", "drawImage", "restore"]);
  });
});

describe("ImageCropper", () => {
  const NativeImage = globalThis.Image;
  let size = { width: 4000, height: 3000 };
  beforeAll(() => {
    // jsdom decodes no images: this one reports a size and loads on the next tick.
    globalThis.Image = class {
      naturalWidth = size.width;
      naturalHeight = size.height;
      decoding = "auto";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(value: string) {
        setTimeout(() => (value.includes("broken") ? this.onerror?.() : this.onload?.()), 0);
      }
    } as unknown as typeof Image;
    // jsdom has no object URLs: a picked file needs one to be shown.
    URL.createObjectURL ??= () => "blob:picked";
    URL.revokeObjectURL ??= () => {};
    globalThis.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: 640, height: 400, top: 0, left: 0, right: 640, bottom: 400, x: 0, y: 0, toJSON() {} } as DOMRect);
  });
  afterAll(() => {
    globalThis.Image = NativeImage;
    vi.restoreAllMocks();
  });
  afterEach(() => {
    cleanup();
    size = { width: 4000, height: 3000 };
  });

  function inLocale(ui: React.ReactElement, locale = "en") {
    return render(
      <DesignSystemProvider locale={locale} navigate={vi.fn()}>
        {ui}
      </DesignSystemProvider>,
    );
  }
  const frame = () => screen.getByRole("group", { name: "Cover photo" });

  it("the frame is one focusable group named by the label, described by the keys; the output size is stated", async () => {
    inLocale(<ImageCropper src="photo.jpg" label="Cover photo" maxOutputSize={1920} onCrop={vi.fn()} onCancel={vi.fn()} />);
    await waitFor(() => expect(frame().tabIndex).toBe(0));
    expect(document.getElementById(frame().getAttribute("aria-describedby")!)!.textContent).toBe("Arrow keys move the image (Shift for more), plus and minus zoom, square brackets rotate.");
    expect(frame().className).toContain("focus-visible:inset-ring-ds-border-focused");
    expect(document.querySelector("[data-slot='image-cropper-meta']")!.textContent).toBe("Output: 1920 × 1080 px · JPEG");
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
  });

  it("keyboard: arrows move the image (not mirrored in RTL), + and − zoom, [ and ] rotate; each change is announced", async () => {
    for (const locale of ["en", "ar-AE"]) {
      inLocale(<ImageCropper src="photo.jpg" label="Cover photo" onCrop={vi.fn()} />, locale);
      await waitFor(() => expect(frame().tabIndex).toBe(0));
      const status = () => document.querySelector("[data-slot='image-cropper-status']")!.textContent;
      const image = () => document.querySelector<HTMLElement>("[data-slot='image-cropper-image']")!;
      fireEvent.keyDown(frame(), { key: "+" });
      fireEvent.keyDown(frame(), { key: "+" });
      expect(document.querySelector("[data-slot='image-cropper-zoom-value']")!.textContent).toMatch(/120/);
      const before = parseFloat(image().style.left);
      fireEvent.keyDown(frame(), { key: "ArrowRight" });
      // The image moves right in both directions: spatial, never mirrored.
      expect(parseFloat(image().style.left)).toBeGreaterThan(before);
      if (locale === "en") expect(status()).toMatch(/^Zoom 120%, position 4\d% across, 50% down$/);
      fireEvent.keyDown(frame(), { key: "]" });
      expect(image().querySelector("img")!.style.transform).toContain("rotate(90deg)");
      if (locale === "en") expect(status()).toBe("Zoom 120%, position centered");
      cleanup();
    }
  });

  it("a small source is never enlarged: the warning says what is saved", async () => {
    size = { width: 1280, height: 720 };
    inLocale(<ImageCropper src="small.jpg" label="Cover photo" minOutputSize={1920} onCrop={vi.fn()} />);
    await screen.findByText("The image is 1280 px wide; it is saved at 1280 × 720 px without enlarging.");
    cleanup();
    // A large source zoomed in is not "too small": the warning is about the source, not the zoom.
    size = { width: 1600, height: 900 };
    inLocale(<ImageCropper src="photo.jpg" label="Cover photo" minOutputSize={1280} onCrop={vi.fn()} />);
    await waitFor(() => expect(frame().tabIndex).toBe(0));
    for (let i = 0; i < 5; i++) fireEvent.keyDown(frame(), { key: "+" });
    expect(document.querySelector("[data-slot='image-cropper-meta']")!.textContent).toBe("Output: 1067 × 600 px · JPEG");
    expect(document.querySelector("[data-slot='image-cropper-warning']")).toBeNull();
  });

  it("contain with JPEG offers the empty area colour; PNG keeps transparency and says so", async () => {
    size = { width: 380, height: 190 };
    inLocale(<ImageCropper src="logo.png" label="Cover photo" aspectRatio={1} fit="contain" onCrop={vi.fn()} />);
    expect(screen.getByText("Empty area color")).toBeTruthy();
    await waitFor(() => expect(document.querySelector("[data-slot='image-cropper-fill']")).not.toBeNull());
    expect(document.querySelector<HTMLElement>("[data-slot='image-cropper-fill']")!.style.background).toMatch(/255, 255, 255|#ffffff/);
    cleanup();
    inLocale(<ImageCropper src="logo.png" label="Cover photo" aspectRatio={1} fit="contain" outputType="image/png" onCrop={vi.fn()} />);
    await screen.findByText(/transparent area kept/);
    expect(screen.queryByText("Empty area color")).toBeNull();
  });

  it("presets switch the shape and fit; saving hands back a file at the source density", async () => {
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(recorder().context as unknown as CanvasRenderingContext2D);
    const toBlob = vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (this: HTMLCanvasElement, done: BlobCallback, type?: string) {
      done(new Blob(["x"], { type }));
    });
    const onCrop = vi.fn();
    inLocale(
      <ImageCropper
        src={new File(["x"], "cover.heic", { type: "image/heic" })}
        label="Cover photo"
        aspectPresets={[
          { id: "cover", label: "Cover 16:9", aspectRatio: 16 / 9, fit: "cover" },
          { id: "logo", label: "Logo 1:1", aspectRatio: 1, fit: "contain" },
        ]}
        onCrop={onCrop}
      />,
    );
    await waitFor(() => expect(frame().tabIndex).toBe(0));
    fireEvent.click(screen.getByRole("radio", { name: "Logo 1:1" }));
    // In English the fit group and its "contain" option are both "Fit": the role tells them apart.
    expect(screen.getByRole("radiogroup", { name: "Fit" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Fit" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: "Fill" }).getAttribute("aria-checked")).toBe("false");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Crop and save" })));
    const [file, result] = onCrop.mock.calls[0]!;
    expect(result).toEqual({ width: 4000, height: 4000, type: "image/jpeg" });
    expect((file as File).name).toBe("cover.jpg");
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), "image/jpeg", 0.9);
    getContext.mockRestore();
    toBlob.mockRestore();
  });

  it("an image that cannot be opened says so instead of failing silently", async () => {
    inLocale(<ImageCropper src="broken.jpg" label="Cover photo" onCrop={vi.fn()} />);
    await screen.findByRole("alert");
    expect(screen.getByRole("alert").textContent).toBe("The image could not be opened. Choose another file.");
    expect(screen.getByRole("button", { name: "Crop and save" }).hasAttribute("disabled") || screen.getByRole("button", { name: "Crop and save" }).getAttribute("aria-disabled") === "true").toBe(true);
  });

  it("keys pressed in one go each build on the last (no stale zoom)", async () => {
    inLocale(<ImageCropper src="photo.jpg" label="Cover photo" onCrop={vi.fn()} />);
    await waitFor(() => expect(frame().tabIndex).toBe(0));
    act(() => {
      for (let i = 0; i < 5; i++) frame().dispatchEvent(new KeyboardEvent("keydown", { key: "+", bubbles: true }));
      frame().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    });
    expect(document.querySelector("[data-slot='image-cropper-zoom-value']")!.textContent).toMatch(/150/);
  });

  it("the slider says the zoom as a percent; Ctrl/Cmd zoom stays the browser's; nothing is stated before load", async () => {
    inLocale(<ImageCropper src="photo.jpg" label="Cover photo" onCrop={vi.fn()} />);
    expect(document.querySelector("[data-slot='image-cropper-meta']")!.textContent).toBe("");
    await waitFor(() => expect(frame().tabIndex).toBe(0));
    expect(screen.getByRole("slider", { name: "Zoom" }).getAttribute("aria-valuetext")).toBe("100%");
    fireEvent.keyDown(frame(), { key: "+" });
    expect(screen.getByRole("slider", { name: "Zoom" }).getAttribute("aria-valuetext")).toBe("110%");
    expect(fireEvent.keyDown(frame(), { key: "=", ctrlKey: true })).toBe(true);
    expect(document.querySelector("[data-slot='image-cropper-zoom-value']")!.textContent).toMatch(/110/);
  });

  it("the wheel zooms in proportion and never scrolls the page", async () => {
    inLocale(<ImageCropper src="photo.jpg" label="Cover photo" onCrop={vi.fn()} />);
    await waitFor(() => expect(frame().tabIndex).toBe(0));
    const stage = document.querySelector("[data-slot='image-cropper-stage']")!;
    const small = new WheelEvent("wheel", { deltaY: -5, bubbles: true, cancelable: true });
    act(() => void stage.dispatchEvent(small));
    expect(small.defaultPrevented).toBe(true);
    // A small trackpad step is a small zoom, not a full 10%.
    expect(document.querySelector("[data-slot='image-cropper-zoom-value']")!.textContent).toMatch(/101/);
  });

  it("a failed save says so and keeps the crop; a URL image is loaded for a clean canvas", async () => {
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const onCrop = vi.fn();
    inLocale(<ImageCropper src="https://cdn.example/photo.jpg" label="Cover photo" onCrop={onCrop} />);
    await waitFor(() => expect(frame().tabIndex).toBe(0));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Crop and save" })));
    expect(onCrop).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toBe("The image could not be saved. Try again, or choose a smaller image.");
    getContext.mockRestore();
  });

  it("an uppercase background keeps the three named swatches; a new picture starts afresh", async () => {
    size = { width: 380, height: 190 };
    const view = inLocale(<ImageCropper src="logo.png" label="Cover photo" aspectRatio={1} fit="contain" background="#FFFFFF" onCrop={vi.fn()} />);
    await waitFor(() => expect(frame().tabIndex).toBe(0));
    const swatches = document.querySelectorAll("[data-slot='color-swatch-picker-item']");
    expect(swatches).toHaveLength(3);
    expect(document.querySelector("[data-slot='color-swatch-picker']")!.textContent).toContain("White");
    fireEvent.keyDown(frame(), { key: "]" });
    fireEvent.keyDown(frame(), { key: "+" });
    view.rerender(
      <DesignSystemProvider locale="en" navigate={vi.fn()}>
        <ImageCropper src="other.png" label="Cover photo" aspectRatio={1} fit="contain" onCrop={vi.fn()} />
      </DesignSystemProvider>,
    );
    await waitFor(() => expect(document.querySelector("[data-slot='image-cropper-image'] img")!.getAttribute("style")).toContain("rotate(0deg)"));
    expect(document.querySelector("[data-slot='image-cropper-zoom-value']")!.textContent).toMatch(/100/);
  });

  it("wheel zooms show on the slider; horizontal moves and zoom limits let the page scroll", async () => {
    inLocale(<ImageCropper src="photo.jpg" label="Cover photo" onCrop={vi.fn()} />);
    await waitFor(() => expect(frame().tabIndex).toBe(0));
    const stage = document.querySelector("[data-slot='image-cropper-stage']")!;
    act(() => void stage.dispatchEvent(new WheelEvent("wheel", { deltaY: -5, bubbles: true, cancelable: true })));
    expect(screen.getByRole("slider", { name: "Zoom" }).getAttribute("aria-valuetext")).toBe("101%");
    const sideways = new WheelEvent("wheel", { deltaX: 40, deltaY: 0, bubbles: true, cancelable: true });
    act(() => void stage.dispatchEvent(sideways));
    expect(sideways.defaultPrevented).toBe(false);
    const out = new WheelEvent("wheel", { deltaY: 400, bubbles: true, cancelable: true });
    act(() => void stage.dispatchEvent(out));
    const pastMinimum = new WheelEvent("wheel", { deltaY: 400, bubbles: true, cancelable: true });
    act(() => void stage.dispatchEvent(pastMinimum));
    expect(pastMinimum.defaultPrevented).toBe(false);
  });

  it("an app's own words replace the English ones; what it leaves out stays English", async () => {
    registerDsStrings("de", { cropSave: "Zuschneiden und speichern", cropZoom: "Zoomen", cropOutput: "Ausgabe: {size} · {type}" });
    inLocale(<ImageCropper src="photo.jpg" label="Cover photo" maxOutputSize={1920} onCrop={vi.fn()} onCancel={vi.fn()} />, "de");
    await waitFor(() => expect(frame().tabIndex).toBe(0));
    expect(screen.getByRole("button", { name: "Zuschneiden und speichern" })).toBeTruthy();
    expect(screen.getByRole("slider", { name: "Zoomen" })).toBeTruthy();
    expect(document.querySelector("[data-slot='image-cropper-meta']")!.textContent).toBe("Ausgabe: 1920 × 1080 px · JPEG");
    // Not registered: English.
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
  });

  it("a locale with no words of its own falls back to English", async () => {
    inLocale(<ImageCropper src="photo.jpg" label="Cover photo" onCrop={vi.fn()} />, "fr");
    await waitFor(() => expect(frame().tabIndex).toBe(0));
    expect(screen.getByRole("button", { name: "Crop and save" })).toBeTruthy();
    expect(screen.getByRole("slider", { name: "Zoom" })).toBeTruthy();
  });
});
