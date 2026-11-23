import * as React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { ImageCropper } from "./index";
import { encodeWithin, qualitySteps } from "./image-crop";

/**
 * ImageCropper's byte limit: `maxBytes` and `minimumQuality`, for logo, hero and slide uploads with a size limit;
 * and `maxOutputSize` 2560 for full-width photos.
 * The canvas is a stub whose file size follows the quality, so every step is deterministic.
 */

describe("qualitySteps and encodeWithin", () => {
  it("steps down by 0.1 from the quality to the minimum", () => {
    expect(qualitySteps({ outputType: "image/webp", quality: 1, minimumQuality: 0.9, maxBytes: 1024 * 1024 })).toEqual([1, 0.9]);
    expect(qualitySteps({ outputType: "image/jpeg", quality: 0.9, maxBytes: 1 })).toEqual([0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1]);
    expect(qualitySteps({ outputType: "image/jpeg", quality: 0.95, minimumQuality: 0.9, maxBytes: 1 })).toEqual([0.95, 0.9]);
    // 0.8 - 0.5 is 0.30000000000000004 in floating point: the minimum is tried once, not twice.
    expect(qualitySteps({ outputType: "image/jpeg", quality: 0.8, minimumQuality: 0.5, maxBytes: 1 })).toEqual([0.8, 0.7, 0.6, 0.5]);
  });

  it("one try without a limit, for PNG, or when the minimum is the quality or above it; never under 0.1", () => {
    expect(qualitySteps({ outputType: "image/jpeg", quality: 0.9 })).toEqual([0.9]);
    expect(qualitySteps({ outputType: "image/png", quality: 0.9, maxBytes: 1 })).toEqual([0.9]);
    expect(qualitySteps({ outputType: "image/webp", quality: 0.9, minimumQuality: 0.95, maxBytes: 1 })).toEqual([0.9]);
    expect(qualitySteps({ outputType: "image/webp", quality: 0.2, minimumQuality: 0, maxBytes: 1 })).toEqual([0.2, 0.1]);
  });

  it("stops at the first quality that fits; says when none does; a failed export throws", async () => {
    const sized = (quality: number | undefined) => Promise.resolve(new Blob([new Uint8Array(Math.round((quality ?? 1) * 1000))]));
    await expect(encodeWithin(sized, { outputType: "image/webp", quality: 1, minimumQuality: 0.5, maxBytes: 750 })).resolves.toMatchObject({ quality: 0.7, fits: true });
    const over = await encodeWithin(sized, { outputType: "image/webp", quality: 1, minimumQuality: 0.9, maxBytes: 500 });
    expect(over).toMatchObject({ quality: 0.9, fits: false });
    expect(over.blob.size).toBe(900);
    const png = vi.fn(sized);
    await expect(encodeWithin(png, { outputType: "image/png", quality: 0.9, maxBytes: 500 })).resolves.toMatchObject({ fits: false });
    expect(png.mock.calls).toEqual([[undefined]]);
    await expect(encodeWithin(() => Promise.resolve(null), { outputType: "image/jpeg", quality: 0.9 })).rejects.toThrow("export-failed");
  });
});

describe("ImageCropper maxBytes, minimumQuality and maxOutputSize 2560", () => {
  const NativeImage = globalThis.Image;
  let size = { width: 6000, height: 4500 };
  beforeAll(() => {
    // jsdom decodes no images: this one reports a size and loads on the next tick.
    globalThis.Image = class {
      get naturalWidth() {
        return size.width;
      }
      get naturalHeight() {
        return size.height;
      }
      decoding = "auto";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        setTimeout(() => this.onload?.(), 0);
      }
    } as unknown as typeof Image;
    globalThis.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: 640, height: 400, top: 0, left: 0, right: 640, bottom: 400, x: 0, y: 0, toJSON() {} } as DOMRect);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      clearRect() {}, fillRect() {}, save() {}, restore() {}, translate() {}, rotate() {}, scale() {}, drawImage() {},
    } as unknown as CanvasRenderingContext2D);
  });
  afterAll(() => {
    globalThis.Image = NativeImage;
    vi.restoreAllMocks();
  });
  afterEach(() => {
    cleanup();
    size = { width: 6000, height: 4500 };
  });

  /** toBlob whose file has `bytesAt(quality)` bytes; records each canvas size and quality. */
  function stubToBlob(bytesAt: (quality: number | undefined) => number) {
    const calls: { width: number; height: number; type?: string; quality?: number }[] = [];
    const spy = vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (this: HTMLCanvasElement, done: BlobCallback, type?: string, quality?: number) {
      calls.push({ width: this.width, height: this.height, type, quality });
      done(new Blob([new Uint8Array(bytesAt(quality))], { type }));
    });
    return { calls, restore: () => spy.mockRestore() };
  }

  function inLocale(ui: React.ReactElement, locale = "en") {
    return render(<DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>);
  }
  const frame = () => screen.getByRole("group", { name: "Cover photo" });
  const save = async (name = "Crop and save") => {
    await waitFor(() => expect(frame().tabIndex).toBe(0));
    await act(async () => fireEvent.click(screen.getByRole("button", { name })));
  };

  it("a full-width photo at maxOutputSize 2560: a 6000 × 4500 source is saved at 2560 × 1920, never larger", async () => {
    const blob = stubToBlob(() => 900_000);
    const onCrop = vi.fn();
    inLocale(<ImageCropper src="photo.jpg" label="Cover photo" aspectRatio={4 / 3} outputType="image/webp" quality={1} maxOutputSize={2560} onCrop={onCrop} />);
    expect(await screen.findByText(/2560 × 1920 px/)).toBeTruthy();
    await save();
    expect(onCrop.mock.calls[0]![1]).toEqual({ width: 2560, height: 1920, type: "image/webp" });
    expect(blob.calls).toEqual([{ width: 2560, height: 1920, type: "image/webp", quality: 1 }]);
    blob.restore();
  });

  it("over maxBytes the crop is encoded again 0.1 lower until it fits, and that file is handed back", async () => {
    // 2 MB at 0.9, 1.8 MB at 0.8 … 1 MB from 0.5 down.
    const blob = stubToBlob((quality) => ((quality ?? 1) > 0.5 ? 2_000_000 : 1_000_000));
    const onCrop = vi.fn();
    inLocale(<ImageCropper src="hero.jpg" label="Cover photo" maxBytes={1024 * 1024} onCrop={onCrop} />);
    await save();
    expect(blob.calls.map((call) => call.quality)).toEqual([0.9, 0.8, 0.7, 0.6, 0.5]);
    const [file] = onCrop.mock.calls[0]!;
    expect((file as File).size).toBe(1_000_000);
    expect((file as File).type).toBe("image/jpeg");
    expect(screen.queryByRole("alert")).toBeNull();
    blob.restore();
  });

  it("never under minimumQuality: when even that is over, nothing is handed back and the cropper says so, naming the limit", async () => {
    const blob = stubToBlob(() => 1_500_000);
    const onCrop = vi.fn();
    inLocale(<ImageCropper src="hero.jpg" label="Cover photo" outputType="image/webp" quality={1} minimumQuality={0.9} maxBytes={1024 * 1024} onCrop={onCrop} />);
    await save();
    expect(blob.calls.map((call) => call.quality)).toEqual([1, 0.9]);
    expect(onCrop).not.toHaveBeenCalled();
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe("The cropped image is over the 1 MB limit. Zoom in to crop a smaller area, or choose another image.");
    expect(alert.getAttribute("data-reason")).toBe("too-large");
    // The crop is kept: Save is still there to try again after zooming in.
    expect(screen.getByRole("button", { name: "Crop and save" }).hasAttribute("disabled")).toBe(false);
    blob.restore();
  });

  it("the next save that fits clears the message", async () => {
    let bytes = 1_500_000;
    const blob = stubToBlob(() => bytes);
    const onCrop = vi.fn();
    inLocale(<ImageCropper src="hero.jpg" label="Cover photo" outputType="image/webp" quality={1} minimumQuality={0.9} maxBytes={1024 * 1024} onCrop={onCrop} />);
    await save();
    expect(screen.getByRole("alert")).toBeTruthy();
    bytes = 600_000;
    await save();
    expect(onCrop).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).toBeNull();
    blob.restore();
  });

  it("PNG is lossless: one encode with no quality; over the limit it says so", async () => {
    size = { width: 800, height: 800 };
    const blob = stubToBlob(() => 3_000_000);
    const onCrop = vi.fn();
    inLocale(<ImageCropper src="logo.png" label="Cover photo" aspectRatio={1} fit="contain" outputType="image/png" maxBytes={2_000_000} onCrop={onCrop} />, "en-US");
    await save();
    expect(blob.calls.map((call) => call.quality)).toEqual([undefined]);
    expect(onCrop).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toBe("The cropped image is over the 2 MB limit. Zoom in to crop a smaller area, or choose another image.");
    blob.restore();
  });

  it("without maxBytes one encode at the quality, as before, whatever the size; minimumQuality alone does nothing", async () => {
    const blob = stubToBlob(() => 50_000_000);
    const onCrop = vi.fn();
    inLocale(<ImageCropper src="photo.jpg" label="Cover photo" minimumQuality={0.5} onCrop={onCrop} />);
    await save();
    expect(blob.calls.map((call) => call.quality)).toEqual([0.9]);
    expect(onCrop).toHaveBeenCalledTimes(1);
    blob.restore();
  });
});
