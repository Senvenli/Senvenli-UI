import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Carousel, CarouselSlide } from "./index";

// Carousel composed from CarouselSlide children: any content per slide, the same frame and controls as `items`.

afterEach(cleanup);

const wrap = (ui: React.ReactElement) => <DesignSystemProvider>{ui}</DesignSystemProvider>;

describe("Carousel composed from slides", () => {
  it("renders the same markup as items when the slides are the same images", () => {
    const data = <Carousel aria-label="Photos" showThumbnails items={[{ id: "a", src: "/a.webp", alt: "Front" }, { id: "b", src: "/b.webp", alt: "Back" }]} />;
    const composed = (
      <Carousel aria-label="Photos" showThumbnails>
        <CarouselSlide id="a" label="Front" thumbnail="/a.webp">
          <img src="/a.webp" alt="Front" draggable={false} className="size-full object-cover" />
        </CarouselSlide>
        <CarouselSlide id="b" label="Back" thumbnail="/b.webp">
          <img src="/b.webp" alt="Back" draggable={false} className="size-full object-cover" />
        </CarouselSlide>
      </Carousel>
    );
    expect(renderToStaticMarkup(wrap(composed))).toBe(renderToStaticMarkup(wrap(data)));
  });

  it("shows any content, with the position on every slide and controls for more than one", () => {
    render(
      wrap(
        <Carousel aria-label="Quotes">
          <CarouselSlide>
            <p>First quote</p>
          </CarouselSlide>
          <CarouselSlide>
            <p>Second quote</p>
          </CarouselSlide>
        </Carousel>,
      ),
    );
    expect(screen.getByText("First quote")).toBeTruthy();
    expect(document.querySelectorAll('[data-slot="carousel-slide"]')).toHaveLength(2);
    expect(document.querySelector('[data-slot="carousel-next"]')).not.toBeNull();
  });

  it("leaves the thumbnail strip out unless every slide has a thumbnail", () => {
    render(
      wrap(
        <Carousel aria-label="Mixed" showThumbnails>
          <CarouselSlide thumbnail="/a.webp">A</CarouselSlide>
          <CarouselSlide>B</CarouselSlide>
        </Carousel>,
      ),
    );
    expect(document.querySelector('[data-slot="carousel-thumbnails"]')).toBeNull();
  });
});
