import { Button, useThemePreference, type ThemeChoice } from "@senvenli/react/action";
import { Form, FormFooter, FormGroup, FormSection, Input } from "@senvenli/react/form";
import { Select, Switch } from "@senvenli/react/selection";

export default function Example() {
  const theme = useThemePreference();
  return (
    <Form width="wide" onSubmit={(event) => event.preventDefault()}>
      <FormSection legend="Workspace" description="How your workspace appears to the team." layout="split">
        <Input label="Workspace name" defaultValue="Acme" />
        <Input label="Support email" type="email" defaultValue="help@acme.example" description="Replies to customers come from this address." />
      </FormSection>
      <FormSection legend="Appearance" description="Applies to you on this device." layout="split" separator>
        <FormGroup orientation="horizontal" separated>
          <Select
            label="Theme"
            description="System follows your device."
            selectedKey={theme.choice}
            onSelectionChange={(key) => theme.setChoice(key as ThemeChoice)}
            items={[
              { id: "system", label: "System" },
              { id: "light", label: "Light" },
              { id: "dark", label: "Dark" },
            ]}
          />
          <Select
            label="Density"
            description="Compact fits more rows on screen."
            defaultSelectedKey="comfortable"
            items={[
              { id: "comfortable", label: "Comfortable" },
              { id: "compact", label: "Compact" },
            ]}
          />
          <Switch description="Shorter animations across the app.">Reduce motion</Switch>
        </FormGroup>
      </FormSection>
      <FormSection legend="Notifications" description="What we email you about." layout="split" separator>
        <FormGroup orientation="horizontal" separated>
          <Switch defaultSelected description="Every morning, the day's new orders.">Daily summary</Switch>
          <Switch description="When someone mentions you in a note.">Mentions</Switch>
        </FormGroup>
      </FormSection>
      <FormFooter>
        <Button type="submit" variant="primary">Save changes</Button>
      </FormFooter>
    </Form>
  );
}
