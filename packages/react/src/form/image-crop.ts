/**
 * ImageCropper's geometry and output, kept apart from the component so the rules the
 * cropper exists for are tested on their own:
 * - never upscale: the output is the crop region in source pixels, only ever scaled down;
 * - contain never paints black: an output without alpha (JPEG) fills the empty area with the
 *   background, white by default; PNG and WebP keep it transparent.
 *
 * Coordinates are in the source's pixels after rotation ("rotated space"): a 90° turn of a 4000 × 3000
 * photo is a 3000 × 4000 image to crop.
 */

export type CropFit = "cover" | "contain";
export type CropOutputType = "image/jpeg" | "image/png" | "image/webp";
export type CropRotation = 0 | 90 | 180 | 270;

export type CropState = {
  /** 1 shows the whole fit; up to 4. */
  zoom: number;
  /** The crop region's centre, in rotated-space pixels. */
  centerX: number;
  centerY: number;
  rotation: CropRotation;
};

export type CropRegion = { left: number; top: number; width: number; height: number };

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

/** Outputs that keep transparency; the rest get the background under empty areas. */
export const hasAlpha = (type: CropOutputType) => type !== "image/jpeg";

/** The source's size once turned. */
export function rotatedSize(width: number, height: number, rotation: CropRotation) {
  return rotation % 180 === 0 ? { width, height } : { width: height, height: width };
}

/**
 * The crop region for a frame aspect (width / height): at zoom 1, `cover` is the largest region of that
 * shape inside the image and `contain` the smallest that holds the whole image (the rest is empty area).
 * Zoom shrinks the region; the centre is kept so the region never leaves the image along a side it is
 * smaller than, and stays centred along a side it is larger than (only contain's empty area).
 */
export function cropRegion(image: { width: number; height: number }, aspect: number, fit: CropFit, state: Pick<CropState, "zoom" | "centerX" | "centerY">): CropRegion {
  const imageAspect = image.width / image.height;
  const widerFrame = aspect > imageAspect;
  // cover: limited by the image's short side for this shape; contain: by its long side.
  const baseWidth = fit === "cover" ? (widerFrame ? image.width : image.height * aspect) : widerFrame ? image.height * aspect : image.width;
  const zoom = clampZoom(state.zoom);
  const width = baseWidth / zoom;
  const height = width / aspect;
  const centerX = clampCenter(state.centerX, width, image.width);
  const centerY = clampCenter(state.centerY, height, image.height);
  return { left: centerX - width / 2, top: centerY - height / 2, width, height };
}

export const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number.isFinite(zoom) ? zoom : MIN_ZOOM));

function clampCenter(center: number, size: number, extent: number) {
  if (size >= extent) return extent / 2;
  return Math.min(extent - size / 2, Math.max(size / 2, center));
}

/**
 * The output size: the region in source pixels, scaled down to `maxOutputSize` on the long edge, never up.
 * `small` is true when the long edge is under `minOutputSize` (the warning; it never blocks).
 */
export function outputSize(region: CropRegion, { maxOutputSize, minOutputSize }: { maxOutputSize?: number; minOutputSize?: number }) {
  const long = Math.max(region.width, region.height);
  const scale = maxOutputSize && long > maxOutputSize ? maxOutputSize / long : 1;
  const width = Math.max(1, Math.round(region.width * scale));
  const height = Math.max(1, Math.round(region.height * scale));
  return { width, height, scale, small: Boolean(minOutputSize && Math.max(width, height) < minOutputSize) };
}

/** The 2D context calls the renderer makes; a canvas's context, or a recorder in tests. */
export type CropContext = Pick<
  CanvasRenderingContext2D,
  "fillStyle" | "fillRect" | "clearRect" | "save" | "restore" | "translate" | "rotate" | "scale" | "drawImage" | "imageSmoothingEnabled" | "imageSmoothingQuality"
>;

/**
 * Draws the crop on a context sized `size`: the background first when the output has no alpha (so empty
 * contain areas and transparent pixels never turn black), then the turned image mapped so the region fills
 * the canvas.
 */
export function drawCrop(
  context: CropContext,
  image: CanvasImageSource,
  source: { width: number; height: number },
  region: CropRegion,
  size: { width: number; height: number },
  { rotation, outputType, background = "#ffffff" }: { rotation: CropRotation; outputType: CropOutputType; background?: string },
) {
  context.clearRect(0, 0, size.width, size.height);
  if (!hasAlpha(outputType)) {
    context.fillStyle = background;
    context.fillRect(0, 0, size.width, size.height);
  }
  const turned = rotatedSize(source.width, source.height, rotation);
  // Each edge on its own: after rounding, width and height can differ by under a pixel, which would leave
  // a faint row of background (or transparency) along the bottom.
  context.save();
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.scale(size.width / region.width, size.height / region.height);
  context.translate(-region.left, -region.top);
  // Into rotated space: turn about the turned image's centre, then draw the source centred on it.
  context.translate(turned.width / 2, turned.height / 2);
  context.rotate((rotation * Math.PI) / 180);
  context.drawImage(image, -source.width / 2, -source.height / 2, source.width, source.height);
  context.restore();
}

/** The output file's extension for its type. */
export const extensionOf = (type: CropOutputType) => (type === "image/jpeg" ? "jpg" : type === "image/png" ? "png" : "webp");

/**
 * The qualities to try under a byte limit, as an image upload typically needs for a logo,
 * hero and slide uploads: from `quality` down in steps of 0.1, never under `minimumQuality` (0.1 by default, at most
 * `quality`), rounded to hundredths. Without a limit, or for PNG (lossless: its quality does nothing), one try.
 */
export function qualitySteps({ outputType, quality, minimumQuality, maxBytes }: { outputType: CropOutputType; quality: number; minimumQuality?: number; maxBytes?: number }) {
  if (!maxBytes || outputType === "image/png") return [quality];
  const floor = Math.min(quality, Math.max(0.1, minimumQuality ?? 0.1));
  const steps: number[] = [];
  for (let index = 0; ; index++) {
    const step = Math.round(Math.max(floor, quality - index * 0.1) * 100) / 100;
    if (steps[steps.length - 1] !== step) steps.push(step);
    if (step <= floor) break;
  }
  return steps;
}

export type EncodeResult = { blob: Blob; quality: number; fits: boolean };

/**
 * Encodes at each of `qualitySteps` until the file is at most `maxBytes`, and says whether it got there. `encode` is
 * the canvas's toBlob (a stub in tests); a null from it is a failed export and throws.
 */
export async function encodeWithin(
  encode: (quality: number | undefined) => Promise<Blob | null>,
  options: { outputType: CropOutputType; quality: number; minimumQuality?: number; maxBytes?: number },
): Promise<EncodeResult> {
  let last: { blob: Blob; quality: number } | undefined;
  for (const quality of qualitySteps(options)) {
    // PNG is lossless: the browser ignores a quality for it, so none is passed.
    const blob = await encode(options.outputType === "image/png" ? undefined : quality);
    if (!blob) throw new Error("export-failed");
    last = { blob, quality };
    if (!options.maxBytes || blob.size <= options.maxBytes) return { ...last, fits: true };
  }
  return { ...last!, fits: false };
}
