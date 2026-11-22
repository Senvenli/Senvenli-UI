import { Image } from "@senvenli/react/display";

export default function Example() {
  return (
    <div className="w-48">
      <Image src="/missing-picture.webp" alt="The product photo" ratio="4/3" />
    </div>
  );
}
