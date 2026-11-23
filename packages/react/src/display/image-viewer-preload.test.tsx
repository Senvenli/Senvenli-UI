import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { ImageViewer, type ImageViewerImageProps } from "./index";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/**
 * Next 16 deprecates next/image `priority` in favour of `preload` (the same
 * eager load plus preload hint). The open viewer's stage photo hands the
 * injected renderer `preload`, never `priority`; the filmstrip thumbnails take
 * neither.
 */
function recordingImage() {
  const calls: ImageViewerImageProps[] = [];
  const Image = (props: ImageViewerImageProps) => {
    calls.push(props);
    const { priority: _priority, preload: _preload, fill: _fill, sizes: _sizes, ...rest } = props;
    // eslint-disable-next-line jsx-a11y/alt-text
    return <img {...rest} />;
  };
  return { Image, calls };
}

const labels = {
  labels: {
    position: (index: number, total: number) => `Photo ${index} of ${total}`,
    close: "Close photos",
    previous: "Previous photo",
    next: "Next photo",
  },
};

const photos = ["/a.jpg", "/b.jpg", "/c.jpg"];
const items = (alt: string) => photos.map((src) => ({ src, alt }));

function expectStagePreloadOnly(calls: ImageViewerImageProps[]) {
  const stage = calls.filter((props) => props.sizes === "100vw");
  const thumbs = calls.filter((props) => props.sizes === "96px");
  expect(stage.length).toBeGreaterThan(0);
  expect(thumbs.length).toBeGreaterThan(0);
  expect(stage.length + thumbs.length).toBe(calls.length);
  for (const props of stage) {
    expect(props.preload).toBe(true);
    expect(props).not.toHaveProperty("priority");
  }
  for (const props of thumbs) {
    expect(props).not.toHaveProperty("preload");
    expect(props).not.toHaveProperty("priority");
  }
}

describe("ImageViewer stage photo preload", () => {
  it("the stage photo gets preload, not priority; thumbnails get neither", () => {
    const { Image, calls } = recordingImage();
    render(<ImageViewer image={Image} items={items("Walnut desk lamp")} title="Walnut desk lamp" onOpenChange={vi.fn()} {...labels} />);
    expectStagePreloadOnly(calls);
  });

  it("puts preload on the photo it opens on (defaultIndex), not the first", () => {
    const { Image, calls } = recordingImage();
    render(<ImageViewer image={Image} items={items("Walnut desk lamp")} defaultIndex={2} title="Walnut desk lamp" onOpenChange={vi.fn()} {...labels} />);
    expect(calls.filter((props) => props.sizes === "100vw").at(-1)).toMatchObject({ src: "/c.jpg", preload: true });
    expectStagePreloadOnly(calls);
  });
});
