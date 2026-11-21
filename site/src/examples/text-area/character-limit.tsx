import { TextArea } from "@senvenli/react/form";

export default function Example() {
  return (
    <TextArea
      label="Project summary"
      maxLength={160}
      defaultValue="A new storefront for the spring catalog, with faster checkout and saved carts."
    />
  );
}
