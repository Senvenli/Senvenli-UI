import { Banner } from "@senvenli/react/feedback";
import { checkBrandColor, ColorPicker, formatRatio } from "@senvenli/react/color";
import { Stack } from "@senvenli/react/layout";
import { useState } from "react";

// The picker picks; checkBrandColor runs the theme engine's contrast check on what was picked, while dragging.
export default function Example() {
  const [color, setColor] = useState("#1E63D0");
  const checks = checkBrandColor(color);
  const failing = checks ? (["light", "dark"] as const).filter((theme) => !checks[theme].passes) : [];
  return (
    <Stack space="space-200">
      <ColorPicker label="Brand color" value={color} onChange={setColor} />
      {checks && failing.length > 0 ? (
        <Banner tone="warning" title="Low contrast on the primary button">
          {failing.map((theme) => `${theme === "light" ? "Light" : "Dark"} theme: ${formatRatio(checks[theme].ratio, "en")}; the theme uses ${checks[theme].fix?.hex ?? "a darker tone"} for fills.`).join(" ")}
        </Banner>
      ) : (
        <Banner tone="success" title="Text on this color passes WCAG AA in both themes" />
      )}
    </Stack>
  );
}
