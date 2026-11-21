import { Switch } from "@senvenli/react/selection";
import { useState } from "react";

export default function Example() {
  const [isOn, setIsOn] = useState(false);
  return (
    <Switch isSelected={isOn} onChange={setIsOn} description={isOn ? "A summary is sent every Monday at 9:00." : "No summary is sent."}>
      Weekly summary email
    </Switch>
  );
}
