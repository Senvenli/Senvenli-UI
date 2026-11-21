import { Button } from "@senvenli/react/action";
import { Banner } from "@senvenli/react/feedback";
import { useState } from "react";

export default function Example() {
  const [isOpen, setOpen] = useState(false);
  return (
    <>
      <Button onPress={() => setOpen(true)} isDisabled={isOpen}>Show the cookie notice</Button>
      {isOpen && (
        <Banner
          placement="floating"
          aria-label="Cookie notice"
          icon="cookie"
          title="We use cookies"
          actions={<Button onPress={() => setOpen(false)}>Accept</Button>}
          onDismiss={() => setOpen(false)}
          dismissLabel="Close cookie notice"
        >
          They keep you signed in and show us which pages are used.
        </Banner>
      )}
    </>
  );
}
