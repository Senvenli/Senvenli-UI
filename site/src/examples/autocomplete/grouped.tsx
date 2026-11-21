import { Autocomplete, type AutocompleteSuggestion } from "@senvenli/react/selection";
import { useState } from "react";

const PLACES: AutocompleteSuggestion[] = [
  { id: "hq", label: "Head office", description: "1 Market Street, San Francisco", icon: "building-2", group: "Saved addresses" },
  { id: "warehouse", label: "Main warehouse", description: "480 Harbor Road, Oakland", icon: "warehouse", group: "Saved addresses" },
  { id: "sfo", label: "San Francisco International Airport", description: "Cargo terminal", icon: "plane", group: "Places" },
  { id: "sjc", label: "San Jose", description: "California", icon: "map-pin", group: "Places" },
  { id: "sac", label: "Sacramento", description: "California", icon: "map-pin", group: "Places" },
];

async function getSuggestions(text: string) {
  const query = text.toLowerCase();
  return PLACES.filter((place) => `${place.label} ${place.description}`.toLowerCase().includes(query));
}

export default function Example() {
  const [address, setAddress] = useState("");
  const [picked, setPicked] = useState<AutocompleteSuggestion | null>(null);
  return (
    <div className="max-w-80">
      <Autocomplete
        label="Ship to"
        icon="map-pin"
        placeholder="Address or place"
        description={picked ? `Picked: ${picked.label}` : "Try “sa” or “market”."}
        groups={["Saved addresses", "Places"]}
        value={address}
        onChange={(text) => {
          setAddress(text);
          setPicked(null);
        }}
        onSelectSuggestion={setPicked}
        getSuggestions={getSuggestions}
      />
    </div>
  );
}
