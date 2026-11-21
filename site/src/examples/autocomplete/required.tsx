import { Autocomplete } from "@senvenli/react/selection";
import { useState } from "react";

const CITIES = ["Amsterdam", "Berlin", "Lisbon", "London", "Madrid", "Paris", "Vienna"];

async function getSuggestions(text: string) {
  return CITIES.filter((city) => city.toLowerCase().startsWith(text.toLowerCase())).map((city) => ({ id: city, label: city }));
}

export default function Example() {
  const [city, setCity] = useState("");
  return (
    <div className="max-w-80">
      <Autocomplete label="City" isRequired minLength={1} value={city} onChange={setCity} getSuggestions={getSuggestions} />
    </div>
  );
}
