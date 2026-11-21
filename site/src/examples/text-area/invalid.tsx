import { TextArea } from "@senvenli/react/form";

export default function Example() {
  return (
    <TextArea
      label="Reason for the refund"
      defaultValue="Late"
      isInvalid
      errorMessage="Describe what happened in a sentence or two, so finance can approve it."
    />
  );
}
