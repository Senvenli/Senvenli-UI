"use client";

import * as React from "react";
import { Slider as AriaSlider, SliderThumb, SliderTrack, useLocale } from "react-aria-components";

import { cn } from "../utils";
import { Button } from "../action/button";
import { formatFileSize } from "../action/files";
import { ColorSwatchPicker } from "../color/color";
import {
  cancelLabel,
  colorBlackLabel,
  colorLightGreyLabel,
  colorWhiteLabel,
  cropAspectLabel,
  cropBackgroundLabel,
  cropCenteredLabel,
  cropContainLabel,
  cropCoverLabel,
  cropFitLabel,
  cropHelpLabel,
  cropKeepsAlphaLabel,
  cropLoadFailedLabel,
  cropOutputLabel,
  cropPositionLabel,
  cropRotateLeftLabel,
  cropRotateRightLabel,
  cropSaveFailedLabel,
  cropSaveLabel,
  cropSmallLabel,
  cropStatusLabel,
  cropTooLargeLabel,
  cropZoomInLabel,
  cropZoomLabel,
  cropZoomOutLabel,
  intlLocale,
} from "../i18n";
import { SegmentedControl } from "../navigation/tabs";
import { SLIDER_FILL, SLIDER_RAIL, SLIDER_THUMB, SLIDER_TRACK } from "../selection/styles";
import { IconGlyph } from "./icon";
import {
  MAX_ZOOM,
  MIN_ZOOM,
  clampZoom,
  cropRegion,
  drawCrop,
  encodeWithin,
  extensionOf,
  hasAlpha,
  outputSize,
  rotatedSize,
  type CropFit,
  type CropOutputType,
  type CropRotation,
} from "./image-crop";

export type ImageCropperAspect = number | "free";

export type ImageCropperPreset = {
  id: string;
  /** "Cover 16:9". */
  label: string;
  aspectRatio: ImageCropperAspect;
  /** The fit this surface uses; the cropper's `fit` otherwise. */
  fit?: CropFit;
};

export type ImageCropperResult = { width: number; height: number; type: CropOutputType };

export type ImageCropperProps = {
  /**
   * The picked file (from FileTrigger, already checked for size and type), or an image URL. A URL from
   * another origin is loaded with CORS so the crop can be read back: its server must send
   * `Access-Control-Allow-Origin`, or the image does not open (rather than failing later at save).
   */
  src: Blob | string;
  /** What is being cropped ("Cover photo"); names the crop frame. */
  label: string;
  /** 16:9 by default; `"free"` keeps the image's own shape. Ignored when presets are given. */
  aspectRatio?: ImageCropperAspect;
  /** Two or more shapes to choose from (a segmented control); the first is selected. */
  aspectPresets?: readonly ImageCropperPreset[];
  /** `cover` (default) fills the frame; `contain` fits the whole image and leaves empty area. */
  fit?: CropFit;
  /** The empty area's colour in `contain` when the output has no alpha (JPEG). White by default. */
  background?: string;
  /** `image/jpeg` by default. PNG and WebP keep transparency. */
  outputType?: CropOutputType;
  /** 0–1, for JPEG and WebP. 0.9 by default. */
  quality?: number;
  /**
   * The largest file the surface takes, in bytes. A JPEG or WebP
   * over it is encoded again at a quality 0.1 lower each time, down to `minimumQuality`; when even that is over, or
   * a PNG is, nothing is handed to `onCrop` and the cropper says the image is over the limit (a smaller crop, by
   * zooming in, or another image fits).
   */
  maxBytes?: number;
  /** The lowest quality `maxBytes` may step down to (0.9 keeps a hero or slide sharp). 0.1 by default; at most `quality`. */
  minimumQuality?: number;
  /**
   * The output's long edge in px at most (a surface's size, 2560 for a full-width photo): larger crops scale down,
   * never up. 4096 by default, so a 48 MP phone photo stays within every browser's canvas limit.
   */
  maxOutputSize?: number;
  /** Under this long edge the warning shows; it never blocks. */
  minOutputSize?: number;
  /** The output file's name without extension; the source file's name by default. */
  fileName?: string;
  onCrop: (file: File, result: ImageCropperResult) => unknown;
  onCancel?: () => void;
};

const STAGE_ASPECT = 16 / 10;
const FRAME_INSET = 0.06;
const ZOOM_STEP = 0.1;
/** Fixed paper and light grey: the frame and checkerboard draw on the photo, not on a theme surface. */
const CHECKER = "repeating-conic-gradient(#ebe9e6 0 25%, #fcfcfb 0 50%) 0 0 / 16px 16px";
const SWATCHES = ["#ffffff", "#ebe9e6", "#0e0c09"] as const;
const TYPE_NAMES: Record<CropOutputType, string> = { "image/jpeg": "JPEG", "image/png": "PNG", "image/webp": "WebP" };

type Loaded = { image: HTMLImageElement; width: number; height: number };

/** The image behind `src`, decoded; an object URL for a file, revoked when it changes. */
function useSourceImage(src: Blob | string) {
  const [state, setState] = React.useState<{ url?: string; loaded?: Loaded; failed?: boolean }>({});
  React.useEffect(() => {
    const url = typeof src === "string" ? src : URL.createObjectURL(src);
    let live = true;
    setState({ url });
    const image = new Image();
    image.decoding = "async";
    // A URL from a CDN must not taint the canvas, or the crop could never be read back.
    if (typeof src === "string" && !/^(data|blob):/.test(src)) image.crossOrigin = "anonymous";
    image.onload = () => live && setState({ url, loaded: { image, width: image.naturalWidth, height: image.naturalHeight } });
    image.onerror = () => live && setState({ url, failed: true });
    image.src = url;
    return () => {
      live = false;
      if (typeof src !== "string") URL.revokeObjectURL(url);
    };
  }, [src]);
  return state;
}

/** The element's width in whole px, following resizes. */
function useWidth() {
  const [element, setElement] = React.useState<HTMLElement | null>(null);
  const [width, setWidth] = React.useState(0);
  React.useLayoutEffect(() => {
    if (!element) return;
    setWidth(Math.floor(element.getBoundingClientRect().width));
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry!.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return [setElement, width, element] as const;
}

/**
 * Frames one picked image to the shape a surface needs (a 16:9 cover photo, a square logo) and hands
 * back the cropped file at the source's own pixel density: never upscaled, only scaled down to
 * `maxOutputSize`. In `contain`, the empty area takes `background` when the output has no
 * alpha, white by default, never black. A sunken stage dims what falls outside a white frame
 * with thirds guides; the toolbar holds the shapes, zoom, rotation and fit. The frame is one focusable
 * group: arrows move the image (Shift for 10%), + and − zoom, [ and ] rotate, and each change is announced.
 * The toolbar mirrors in RTL; the image and the arrows never do.
 */
export function ImageCropper({
  src,
  label,
  aspectRatio = 16 / 9,
  aspectPresets,
  fit: fitProp = "cover",
  background: backgroundProp = "#ffffff",
  outputType = "image/jpeg",
  quality = 0.9,
  maxBytes,
  minimumQuality,
  maxOutputSize = 4096,
  minOutputSize,
  fileName,
  onCrop,
  onCancel,
}: ImageCropperProps) {
  const { locale } = useLocale();
  const source = useSourceImage(src);
  const presets = aspectPresets && aspectPresets.length > 1 ? aspectPresets : undefined;
  const [presetId, setPresetId] = React.useState(presets?.[0]?.id);
  const preset = presets?.find((item) => item.id === presetId) ?? presets?.[0];
  const [fit, setFit] = React.useState<CropFit>(preset?.fit ?? fitProp);
  const [background, setBackground] = React.useState(backgroundProp);
  // Props changed later win again: a new fit or background from the surface.
  React.useEffect(() => setFit(preset?.fit ?? fitProp), [fitProp]); // preset changes set fit themselves
  React.useEffect(() => setBackground(backgroundProp), [backgroundProp]);
  // `true` a failed save; "too-large" a crop over `maxBytes` at the lowest quality allowed.
  const [saveError, setSaveError] = React.useState<boolean | "too-large">(false);
  const [rotation, setRotation] = React.useState<CropRotation>(0);
  const [zoom, setZoom] = React.useState(1);
  const [center, setCenter] = React.useState<{ x: number; y: number } | null>(null);
  const [status, setStatus] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [stageRef, stageWidth, stageElement] = useWidth();
  const helpId = React.useId();

  const loaded = source.loaded;
  // A new picture starts afresh: upright, whole, centred.
  React.useEffect(() => {
    setRotation(0);
    setZoom(1);
    setCenter(null);
    setStatus("");
    setSaveError(false);
  }, [source.url]);
  const turned = loaded ? rotatedSize(loaded.width, loaded.height, rotation) : { width: 1, height: 1 };
  const shape = preset ? preset.aspectRatio : aspectRatio;
  const aspect = shape === "free" ? turned.width / turned.height : shape;
  const centerX = center?.x ?? turned.width / 2;
  const centerY = center?.y ?? turned.height / 2;
  const region = cropRegion(turned, aspect, fit, { zoom, centerX, centerY });
  const size = outputSize(region, { maxOutputSize, minOutputSize });
  // The warning is about the source, not the zoom: shown when even the whole fit is under the surface's size.
  const sourceTooSmall = outputSize(cropRegion(turned, aspect, fit, { zoom: 1, centerX, centerY }), { maxOutputSize, minOutputSize }).small;
  const alpha = hasAlpha(outputType);

  // The frame inside the stage: the largest rectangle of the crop's shape, inset from the edges.
  const stageHeight = Math.round(stageWidth / STAGE_ASPECT);
  const roomWidth = stageWidth * (1 - 2 * FRAME_INSET);
  const roomHeight = stageHeight * (1 - 2 * FRAME_INSET);
  const frameWidth = Math.min(roomWidth, roomHeight * aspect);
  const frameHeight = frameWidth / aspect;
  const frameLeft = (stageWidth - frameWidth) / 2;
  const frameTop = (stageHeight - frameHeight) / 2;
  const scale = region.width > 0 ? frameWidth / region.width : 0;

  const percent = React.useMemo(() => new Intl.NumberFormat(intlLocale(locale), { style: "percent", maximumFractionDigits: 0 }), [locale]);
  const describe = (nextZoom: number, x: number, y: number, dims: { width: number; height: number } = turned) => {
    const across = x / dims.width;
    const down = y / dims.height;
    const position = Math.abs(across - 0.5) < 0.005 && Math.abs(down - 0.5) < 0.005 ? cropCenteredLabel(locale) : cropPositionLabel(locale, percent.format(across), percent.format(down));
    return cropStatusLabel(locale, percent.format(nextZoom), position);
  };

  // The latest position, ahead of React's render: several keys or wheel ticks in one task each build on the
  // one before instead of the same rendered state.
  const live = React.useRef({ zoom, x: centerX, y: centerY, rotation });
  live.current = { zoom, x: centerX, y: centerY, rotation };
  const turnedFor = (turn: CropRotation) => (loaded ? rotatedSize(loaded.width, loaded.height, turn) : turned);

  // Every change keeps the centre where the region can be, then says where things are.
  const apply = (next: { zoom?: number; x?: number; y?: number; rotation?: CropRotation }, announce = true) => {
    const base = live.current;
    const nextRotation = next.rotation ?? base.rotation;
    const nextTurned = turnedFor(nextRotation);
    const nextAspect = shape === "free" ? nextTurned.width / nextTurned.height : shape;
    const nextZoom = clampZoom(next.zoom ?? base.zoom);
    const settled = cropRegion(nextTurned, nextAspect, fit, { zoom: nextZoom, centerX: next.x ?? base.x, centerY: next.y ?? base.y });
    const x = settled.left + settled.width / 2;
    const y = settled.top + settled.height / 2;
    live.current = { zoom: nextZoom, x, y, rotation: nextRotation };
    setZoom(nextZoom);
    setCenter({ x, y });
    if (next.rotation !== undefined) setRotation(nextRotation);
    if (announce) setStatus(describe(nextZoom, x, y, nextTurned));
  };
  const zoomBy = (delta: number, announce = true) => apply({ zoom: live.current.zoom + delta }, announce);
  const nudge = (dx: number, dy: number) => {
    const size = turnedFor(live.current.rotation);
    apply({ x: live.current.x - dx * size.width, y: live.current.y - dy * size.height });
  };
  const rotate = (turn: 90 | -90) => {
    const next = ((((live.current.rotation + turn) % 360) + 360) % 360) as CropRotation;
    // The new shape starts centred.
    const nextTurned = turnedFor(next);
    apply({ rotation: next, x: nextTurned.width / 2, y: nextTurned.height / 2 });
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    // Browser zoom (Ctrl/Cmd with + and −) and other shortcuts stay the browser's.
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const step = event.shiftKey ? 0.1 : 0.01;
    // Spatial, so never mirrored in RTL: the image moves the way the arrow points.
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[event.key]) nudge(...moves[event.key]!);
    else if (event.key === "+" || event.key === "=") zoomBy(ZOOM_STEP);
    else if (event.key === "-" || event.key === "_") zoomBy(-ZOOM_STEP);
    else if (event.key === "[") rotate(-90);
    else if (event.key === "]") rotate(90);
    else return;
    event.preventDefault();
  };

  // Pointer: drag moves, the wheel zooms.
  const drag = React.useRef<{ x: number; y: number; centerX: number; centerY: number } | null>(null);
  const onPointerDown = (event: React.PointerEvent) => {
    if (!loaded || event.button !== 0) return;
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, centerX, centerY };
  };
  const onPointerMove = (event: React.PointerEvent) => {
    if (!drag.current || scale <= 0) return;
    apply({ x: drag.current.centerX - (event.clientX - drag.current.x) / scale, y: drag.current.centerY - (event.clientY - drag.current.y) / scale }, false);
  };
  const onPointerUp = () => {
    if (drag.current) setStatus(describe(live.current.zoom, live.current.x, live.current.y, turnedFor(live.current.rotation)));
    drag.current = null;
  };

  // The wheel zooms in proportion to how far it turns (a trackpad sends many small steps) and never scrolls
  // the page underneath: React's wheel listener is passive, so this one is native.
  const wheelRef = React.useRef<(event: WheelEvent) => void>(() => {});
  wheelRef.current = (event: WheelEvent) => {
    if (!loaded || event.deltaY === 0) return;
    const pixels = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * 400 : event.deltaY;
    const zoomingIn = pixels < 0;
    // At a limit in the wheel's direction the page scrolls on, as it does over any other part of it.
    if ((zoomingIn && live.current.zoom >= MAX_ZOOM) || (!zoomingIn && live.current.zoom <= MIN_ZOOM)) return;
    event.preventDefault();
    zoomBy(Math.max(-0.5, Math.min(0.5, -pixels / 500)), false);
  };
  React.useEffect(() => {
    if (!stageElement) return;
    const onWheel = (event: WheelEvent) => wheelRef.current(event);
    stageElement.addEventListener("wheel", onWheel, { passive: false });
    return () => stageElement.removeEventListener("wheel", onWheel);
  }, [stageElement]);

  const save = async () => {
    if (!loaded) return;
    setSaving(true);
    setSaveError(false);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = size.width;
      canvas.height = size.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("canvas-unavailable");
      drawCrop(context, loaded.image, loaded, region, size, { rotation, outputType, background });
      const encoded = await encodeWithin((step) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, outputType, step)), {
        outputType,
        quality,
        minimumQuality,
        maxBytes,
      });
      if (!encoded.fits) {
        setSaveError("too-large");
        return;
      }
      const blob = encoded.blob;
      const base = fileName ?? (typeof src !== "string" && "name" in src ? String((src as File).name).replace(/\.[^.]+$/, "") : "image");
      await onCrop(new File([blob], `${base}.${extensionOf(outputType)}`, { type: outputType }), { width: size.width, height: size.height, type: outputType });
    } catch {
      // No canvas, a tainted canvas (a cross-origin image), a canvas too large for the device, or the app's
      // own save failing: say so and keep the crop, so it can be tried again.
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  const showBackground = fit === "contain" && !alpha;
  const swatches = [...new Set<string>([...SWATCHES, backgroundProp.toLowerCase()])].map((value) => ({
    value,
    name: value === "#ffffff" ? colorWhiteLabel(locale) : value === "#ebe9e6" ? colorLightGreyLabel(locale) : value === "#0e0c09" ? colorBlackLabel(locale) : value,
  }));
  const sizeText = `${size.width} × ${size.height} px`;

  return (
    <div data-slot="image-cropper" className="flex min-w-0 flex-col gap-ds-150">
      <div
        ref={stageRef}
        // Spatial: the photo and its frame never mirror; logical classes inside resolve as left and right.
        dir="ltr"
        data-slot="image-cropper-stage"
        className="relative w-full touch-none overflow-hidden rounded-ds-large bg-ds-surface-sunken select-none"
        // Whole pixels once measured: a fractional height would shift everything below it off the pixel grid.
        style={stageWidth > 0 ? { height: stageHeight } : { aspectRatio: String(STAGE_ASPECT) }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {source.failed && (
          <p data-slot="image-cropper-error" role="alert" className="absolute inset-0 m-0 grid place-items-center p-ds-300 text-center text-body text-ds-text-subtle">
            {cropLoadFailedLabel(locale)}
          </p>
        )}
        {loaded && stageWidth > 0 && (
          <>
            {/* What the empty area of the output will be: kept transparent (checkerboard) or the background. */}
            <div
              aria-hidden
              data-slot="image-cropper-fill"
              className="absolute"
              style={{ left: frameLeft, top: frameTop, width: frameWidth, height: frameHeight, background: alpha ? CHECKER : background }}
            />
            <div
              aria-hidden
              data-slot="image-cropper-image"
              className="absolute"
              style={{ left: frameLeft - region.left * scale, top: frameTop - region.top * scale, width: turned.width * scale, height: turned.height * scale }}
            >
              <img
                src={source.url}
                alt=""
                draggable={false}
                className="absolute start-1/2 top-1/2 max-w-none"
                style={{ width: loaded.width * scale, height: loaded.height * scale, transform: `translate(-50%, -50%) rotate(${rotation}deg)` }}
              />
            </div>
          </>
        )}
        <div
          role="group"
          aria-label={label}
          aria-describedby={helpId}
          tabIndex={loaded ? 0 : -1}
          data-slot="image-cropper-frame"
          onKeyDown={onKeyDown}
          className="absolute border border-[#fcfcfb] outline-hidden focus-visible:inset-ring-2 focus-visible:inset-ring-ds-border-focused"
          // The blanket dims everything outside the frame.
          style={{ left: frameLeft, top: frameTop, width: frameWidth, height: frameHeight, boxShadow: "0 0 0 9999px var(--ds-blanket)" }}
        >
          {/* Rule-of-thirds guides, paper at 40%. */}
          <span aria-hidden className="absolute inset-y-0 start-1/3 w-px bg-[#fcfcfb]/40" />
          <span aria-hidden className="absolute inset-y-0 start-2/3 w-px bg-[#fcfcfb]/40" />
          <span aria-hidden className="absolute inset-x-0 top-1/3 h-px bg-[#fcfcfb]/40" />
          <span aria-hidden className="absolute inset-x-0 top-2/3 h-px bg-[#fcfcfb]/40" />
          {(["-start-1.5 -top-1.5", "-end-1.5 -top-1.5", "-start-1.5 -bottom-1.5", "-end-1.5 -bottom-1.5"] as const).map((corner) => (
            <span key={corner} aria-hidden data-slot="image-cropper-handle" className={cn("absolute size-3 rounded-[2px] bg-[#fcfcfb] shadow-ds-raised", corner)} />
          ))}
        </div>
        <span id={helpId} className="sr-only">
          {cropHelpLabel(locale)}
        </span>
        <span role="status" data-slot="image-cropper-status" className="sr-only">
          {status}
        </span>
      </div>

      <div data-slot="image-cropper-toolbar" className="flex flex-wrap items-center gap-ds-150">
        {presets && (
          <SegmentedControl
            label={cropAspectLabel(locale)}
            items={presets.map((item) => ({ id: item.id, label: item.label }))}
            value={preset?.id}
            onChange={(id) => {
              const next = presets.find((item) => item.id === id);
              setPresetId(String(id));
              if (next?.fit) setFit(next.fit);
              setCenter(null);
              setZoom(1);
            }}
          />
        )}
        <div data-slot="image-cropper-zoom" className="flex min-w-48 flex-1 items-center gap-ds-100">
          <Button size="compact" variant="subtle" iconOnly iconBefore="minus" aria-label={cropZoomOutLabel(locale)} isDisabled={!loaded || zoom <= MIN_ZOOM} onPress={() => zoomBy(-ZOOM_STEP)} />
          <AriaSlider
            aria-label={cropZoomLabel(locale)}
            minValue={MIN_ZOOM}
            maxValue={MAX_ZOOM}
            // Fine enough that a wheel or keyboard zoom is always a value the slider can show.
            step={0.01}
            value={zoom}
            onChange={(value) => apply({ zoom: value as number }, false)}
            onChangeEnd={() => setStatus(describe(live.current.zoom, live.current.x, live.current.y, turnedFor(live.current.rotation)))}
            isDisabled={!loaded}
            formatOptions={{ style: "percent" }}
            data-slot="image-cropper-zoom-slider"
            className="min-w-24 flex-1"
          >
            <SliderTrack className={SLIDER_TRACK}>
              {({ state }) => (
                <>
                  <span aria-hidden className={SLIDER_RAIL} />
                  <span aria-hidden className={SLIDER_FILL} style={{ insetInlineStart: 0, insetInlineEnd: `${100 - state.getThumbPercent(0) * 100}%` }} />
                  <SliderThumb className={SLIDER_THUMB} />
                </>
              )}
            </SliderTrack>
          </AriaSlider>
          <Button size="compact" variant="subtle" iconOnly iconBefore="plus" aria-label={cropZoomInLabel(locale)} isDisabled={!loaded || zoom >= MAX_ZOOM} onPress={() => zoomBy(ZOOM_STEP)} />
          <span data-slot="image-cropper-zoom-value" className="w-12 text-body-small tabular-nums text-ds-text-subtle">
            {percent.format(zoom)}
          </span>
        </div>
        <span aria-hidden className="h-5 w-px bg-ds-border" />
        <Button size="compact" variant="subtle" iconOnly iconBefore="rotate-ccw" aria-label={cropRotateLeftLabel(locale)} isDisabled={!loaded} onPress={() => rotate(-90)} />
        <Button size="compact" variant="subtle" iconOnly iconBefore="rotate-cw" aria-label={cropRotateRightLabel(locale)} isDisabled={!loaded} onPress={() => rotate(90)} />
        {presets && (
          <SegmentedControl
            label={cropFitLabel(locale)}
            items={[
              { id: "cover", label: cropCoverLabel(locale) },
              { id: "contain", label: cropContainLabel(locale) },
            ]}
            value={fit}
            onChange={(value) => {
              setFit(value as CropFit);
              setCenter(null);
              setZoom(1);
            }}
          />
        )}
      </div>

      {showBackground && (
        <ColorSwatchPicker label={cropBackgroundLabel(locale)} items={swatches} value={background.toLowerCase()} onChange={setBackground} />
      )}

      <div data-slot="image-cropper-meta" className="flex flex-col gap-ds-050 text-body-small tabular-nums">
        {loaded && (
          <span className="text-ds-text-subtlest">
            {cropOutputLabel(locale, sizeText, TYPE_NAMES[outputType])}
            {alpha && fit === "contain" ? ` (${cropKeepsAlphaLabel(locale)})` : ""}
          </span>
        )}
        {loaded && sourceTooSmall && (
          <span data-slot="image-cropper-warning" className="flex items-center gap-ds-050 text-ds-text-warning">
            <IconGlyph name="triangle-alert" size="small" />
            {cropSmallLabel(locale, String(turned.width), sizeText)}
          </span>
        )}
      </div>

      {saveError && (
        <p
          role="alert"
          data-slot="image-cropper-save-error"
          data-reason={saveError === "too-large" ? "too-large" : undefined}
          className="m-0 flex items-center gap-ds-050 text-body-small text-ds-text-danger"
        >
          <IconGlyph name="circle-alert" size="small" />
          {saveError === "too-large" && maxBytes ? cropTooLargeLabel(locale, formatFileSize(maxBytes, intlLocale(locale))) : cropSaveFailedLabel(locale)}
        </p>
      )}

      <div data-slot="image-cropper-actions" className="flex flex-wrap justify-end gap-ds-100">
        {onCancel && <Button onPress={onCancel}>{cancelLabel(locale)}</Button>}
        <Button variant="primary" isPending={saving} isDisabled={!loaded} onPress={() => void save()}>
          {cropSaveLabel(locale)}
        </Button>
      </div>
    </div>
  );
}
