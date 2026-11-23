import * as React from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Button } from "../action/index";
import { DropZone, FileTrigger } from "./index";

// A DS picker empties its hidden input once the files are handed on, so the same file
// picked again (after the app cancelled the first pick, e.g. a crop dialog) is a change and reaches
// the app again. jsdom fires change either way, so these tests watch the input's value being
// emptied and when.

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const photo = new File([new Uint8Array(2_000)], "photo.png", { type: "image/png" });
const RULES = { acceptedFileTypes: ["image/png"], maxSize: 10_000_000 };

function inProvider(ui: React.ReactElement) {
  return render(<DesignSystemProvider locale="en" navigate={vi.fn()}>{ui}</DesignSystemProvider>);
}

/** Watches every write to a file input's value. */
function watchValueWrites() {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!;
  const writes: { input: HTMLInputElement; value: string }[] = [];
  vi.spyOn(HTMLInputElement.prototype, "value", "set").mockImplementation(function (this: HTMLInputElement, value: string) {
    writes.push({ input: this, value });
    descriptor.set!.call(this, value);
  });
  return writes;
}

function pick(input: HTMLInputElement, files: File[]) {
  fireEvent.change(input, { target: { files } });
}

const wrappers = [
  {
    name: "DropZone",
    render: (onSelect: (files: File[]) => void, onReject: () => void) =>
      inProvider(<DropZone label="Drag photos here" {...RULES} onSelect={onSelect} onReject={onReject} />),
  },
  {
    name: "FileTrigger",
    render: (onSelect: (files: File[]) => void, onReject: () => void) =>
      inProvider(
        <FileTrigger {...RULES} onSelect={onSelect} onReject={onReject}>
          <Button>Upload document</Button>
        </FileTrigger>,
      ),
  },
];

describe.each(wrappers)("$name picks the same file again", ({ render: renderWrapper }) => {
  it("empties its input after the app has the files, and the same file picked again reaches the app again", () => {
    const writes = watchValueWrites();
    const seen: { files: File[]; clearedBefore: boolean }[] = [];
    const onSelect = vi.fn((files: File[]) => {
      seen.push({ files, clearedBefore: writes.some((write) => write.input === input && write.value === "") });
    });
    const { container } = renderWrapper(onSelect, vi.fn());
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    pick(input, [photo]);
    expect(onSelect).toHaveBeenCalledTimes(1);
    // The app got the file before the input was emptied, and the input was emptied once it had.
    expect(seen[0]).toEqual({ files: [photo], clearedBefore: false });
    expect(writes.filter((write) => write.input === input).map((write) => write.value)).toEqual([""]);

    // The app cancels (nothing kept); the same file picked again calls onSelect again.
    pick(input, [photo]);
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect.mock.calls[1][0]).toEqual([photo]);
    expect(writes.filter((write) => write.input === input).map((write) => write.value)).toEqual(["", ""]);
  });

  it("empties its input after a rejected pick too, so the same file can be picked again", () => {
    const writes = watchValueWrites();
    const onReject = vi.fn();
    const { container } = renderWrapper(vi.fn(), onReject);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const wrong = new File(["x"], "report.pdf", { type: "application/pdf" });

    pick(input, [wrong]);
    pick(input, [wrong]);
    expect(onReject).toHaveBeenCalledTimes(2);
    expect(writes.filter((write) => write.input === input).map((write) => write.value)).toEqual(["", ""]);
  });

  it("empties its input even when the app's callback throws", () => {
    const writes = watchValueWrites();
    const { container } = renderWrapper(() => {
      throw new Error("app failed");
    }, vi.fn());
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const swallow = (event: ErrorEvent) => event.preventDefault();
    window.addEventListener("error", swallow);
    vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      pick(input, [photo]);
    } catch {
      // React may rethrow the handler's error; the input must be empty either way.
    } finally {
      window.removeEventListener("error", swallow);
    }
    expect(writes.filter((write) => write.input === input).map((write) => write.value)).toEqual([""]);
  });
});
