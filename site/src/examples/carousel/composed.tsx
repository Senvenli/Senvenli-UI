import { Carousel, CarouselSlide, Heading, Text } from "@senvenli/react/display";

const QUOTES = [
  { id: "ada", quote: "We closed the month two days earlier than before.", name: "Ada Lovelace, Finance lead" },
  { id: "grace", quote: "Our support queue finally fits on one screen.", name: "Grace Hopper, Support" },
  { id: "alan", quote: "Setting it up took one afternoon.", name: "Alan Turing, Operations" },
];

export default function Example() {
  return (
    <div className="w-full max-w-lg">
      <Carousel aria-label="What customers say" aspectRatio="16/9">
        {QUOTES.map((item) => (
          <CarouselSlide key={item.id} id={item.id}>
            <div className="flex size-full flex-col items-center justify-center gap-ds-150 px-ds-600 text-center">
              <Heading level={3} size="heading-medium">
                “{item.quote}”
              </Heading>
              <Text tone="subtle">{item.name}</Text>
            </div>
          </CarouselSlide>
        ))}
      </Carousel>
    </div>
  );
}
