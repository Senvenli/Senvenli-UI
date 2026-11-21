import { Prose } from "@senvenli/react/display";

export default function Example() {
  return (
    <Prose>
      <h2>Returns</h2>
      <p>
        You can return most items within <strong>30 days</strong> of delivery. Start from the order page and print the prepaid label.
      </p>
      <ul>
        <li>Items must be unused and in their original packaging.</li>
        <li>
          Refunds go back to the original payment method, quoting the order ID, such as <code>ORD-1042</code>.
        </li>
      </ul>
      <blockquote>
        <p>Custom orders cannot be returned unless they arrive damaged.</p>
      </blockquote>
    </Prose>
  );
}
