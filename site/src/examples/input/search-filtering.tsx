import { Text } from "@senvenli/react/display";
import { Input } from "@senvenli/react/form";
import { Stack } from "@senvenli/react/layout";
import { useState } from "react";

const CUSTOMERS = ["Ada Lovelace", "Alan Turing", "Grace Hopper", "Katherine Johnson", "Margaret Hamilton"];

export default function Example() {
  const [query, setQuery] = useState("");
  const matches = CUSTOMERS.filter((name) => name.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <Stack space="space-150">
      <Input type="search" aria-label="Search customers" placeholder="Customer name" value={query} onChange={setQuery} />
      {matches.length > 0 ? (
        <Stack as="ul" space="space-050">
          {matches.map((name) => (
            <li key={name}>
              <Text>{name}</Text>
            </li>
          ))}
        </Stack>
      ) : (
        <Text tone="subtle">No customers match “{query}”.</Text>
      )}
    </Stack>
  );
}
