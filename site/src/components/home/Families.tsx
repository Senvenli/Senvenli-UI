import { CalendarDate } from "@internationalized/date";
import { Button } from "@senvenli/react/action";
import { Sparkline } from "@senvenli/react/charts";
import { GridList, GridListItem } from "@senvenli/react/collection";
import { ColorSwatch } from "@senvenli/react/color";
import { DateField } from "@senvenli/react/date";
import { Avatar, AvatarGroup, Badge, Card, CardBody, CardHeader, Kbd } from "@senvenli/react/display";
import { ProgressBar } from "@senvenli/react/feedback";
import { Input } from "@senvenli/react/form";
import { Stack } from "@senvenli/react/layout";
import { Breadcrumb, Breadcrumbs } from "@senvenli/react/navigation";
import { Checkbox, Switch } from "@senvenli/react/selection";
import { familyTitle } from "../../lib/manifest";

/** One small live component per family, the same size in every card. */
const PREVIEW: Record<string, React.ReactNode> = {
  display: (
    <Stack direction="horizontal" space="space-150">
      <AvatarGroup aria-label="Team">
        <Avatar name="Ada Lovelace" src="/avatars/01.webp" />
        <Avatar name="Sofia Marin" src="/avatars/05.webp" />
        <Avatar name="Alan Turing" />
      </AvatarGroup>
      <Badge tone="success">Paid</Badge>
    </Stack>
  ),
  action: (
    <Stack direction="horizontal" space="space-100">
      <Button variant="primary" size="small">
        Save
      </Button>
      <Button size="small">Cancel</Button>
    </Stack>
  ),
  layout: (
    <div className="grid w-full max-w-40 grid-cols-3 gap-ds-075">
      {Array.from({ length: 6 }, (_, index) => (
        <span key={index} className={index === 0 ? "col-span-2 h-6 rounded-ds-small bg-ds-background-neutral" : "h-6 rounded-ds-small bg-ds-background-neutral"} />
      ))}
    </div>
  ),
  feedback: (
    <div className="w-full max-w-48">
      <ProgressBar label="Uploading" value={64} />
    </div>
  ),
  form: (
    <div className="w-full max-w-52">
      <Input label="Email" placeholder="you@example.com" size="small" />
    </div>
  ),
  selection: (
    <Stack space="space-100">
      <Switch defaultSelected size="small">
        Notifications
      </Switch>
      <Checkbox defaultSelected size="small">
        Remember me
      </Checkbox>
    </Stack>
  ),
  overlay: (
    <span className="flex items-center gap-ds-100 rounded-ds-medium border border-ds-border bg-ds-surface-raised px-ds-150 py-ds-100 text-body-small text-ds-text-subtle shadow-ds-raised">
      Search
      <Kbd isModifier />
      <Kbd>K</Kbd>
    </span>
  ),
  navigation: (
    <Breadcrumbs aria-label="Location">
      <Breadcrumb href="#">Projects</Breadcrumb>
      <Breadcrumb>Launch</Breadcrumb>
    </Breadcrumbs>
  ),
  date: (
    <div className="w-full max-w-44">
      <DateField label="Due" defaultValue={new CalendarDate(2026, 3, 18)} />
    </div>
  ),
  color: (
    <Stack direction="horizontal" space="space-075">
      {["#996a00", "#1268ae", "#6e56cf", "#2f6f4f"].map((color) => (
        <ColorSwatch key={color} color={color} name={color} />
      ))}
    </Stack>
  ),
  collection: (
    <div className="w-full max-w-52">
      <GridList aria-label="People">
        <GridListItem id="ada" title="Ada Lovelace" description="Owner" />
      </GridList>
    </div>
  ),
  charts: (
    <div className="w-full max-w-48">
      <Sparkline aria-label="Orders this week" data={[4, 6, 5, 8, 7, 10, 12]} />
    </div>
  ),
};

/**
 * Every family as a card that is a link: a small live component (inert and hidden from assistive tech, since the card
 * itself is the link), the family's name and its count. Four columns from 1024px, three from 768px, two below; under
 * 640px a card is too narrow for a whole component, so it is the name and the count alone, never a cut-off preview.
 */
export function Families({ families }: { families: { family: string; count: number }[] }) {
  return (
    <ul className="m-0 grid list-none grid-cols-2 gap-ds-200 p-0 md:grid-cols-3 lg:grid-cols-4">
      {families.map(({ family, count }) => (
        <li key={family} className="flex [&>*]:w-full">
          <Card href={`/docs/components#family-${family}`} variant="raised">
            <div aria-hidden inert className="pointer-events-none max-sm:hidden">
              <CardBody>
                <div className="flex h-24 items-center justify-center overflow-hidden">
                  <div className="flex w-full justify-center">{PREVIEW[family] ?? null}</div>
                </div>
              </CardBody>
            </div>
            <CardHeader title={familyTitle(family)} subtitle={`${count} ${count === 1 ? "component" : "components"}`} />
          </Card>
        </li>
      ))}
    </ul>
  );
}
