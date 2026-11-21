import { InputAction, InputGroup } from "@senvenli/react/form";
import { useState } from "react";

const API_KEY = "key_live_3f9a7c21";

export default function Example() {
  const [copied, setCopied] = useState(false);
  return (
    <InputGroup>
      <input aria-label="API key" readOnly value={API_KEY} className="min-w-0 flex-1 bg-transparent outline-hidden" />
      <InputAction
        icon={copied ? "check" : "copy"}
        aria-label={copied ? "Copied" : "Copy API key"}
        onPress={() => navigator.clipboard.writeText(API_KEY).then(() => setCopied(true))}
      />
    </InputGroup>
  );
}
