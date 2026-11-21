import { Autocomplete, type AutocompleteSuggestion } from "@senvenli/react/selection";
import { useState } from "react";

const COMPANIES: AutocompleteSuggestion[] = [
  { id: "analytical", label: "Analytical Engines Ltd", description: "London · 12 open invoices" },
  { id: "northwind", label: "Northwind Traders", description: "Seattle · 3 open invoices" },
  { id: "norfolk", label: "Norfolk Paper Co.", description: "Norwich · no open invoices" },
  { id: "acme", label: "Acme Supplies", description: "Chicago · 1 open invoice" },
];

// Stands in for a request to your API; pass `signal` to fetch so superseded requests abort.
async function getSuggestions(text: string) {
  const query = text.toLowerCase();
  return COMPANIES.filter((company) => company.label.toLowerCase().includes(query));
}

export default function Example() {
  const [company, setCompany] = useState("");
  return (
    <div className="max-w-80">
      <Autocomplete
        label="Company"
        icon="building-2"
        placeholder="Start typing a name"
        description="Pick a customer or type a new company."
        value={company}
        onChange={setCompany}
        getSuggestions={getSuggestions}
      />
    </div>
  );
}
