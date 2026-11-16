import {
  Avatar,
  AvatarGroup,
  Badge,
  BadgeAnchor,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Heading,
  Icon,
  Kbd,
  Lozenge,
  ModifierKbd,
  ScrollArea,
  Separator,
  Text,
} from "@senvenli/react/display";

const PEOPLE = ["Ada Lovelace", "Grace Hopper", "Alan Turing", "Katherine Johnson", "Linus Torvalds", "Margaret Hamilton"];

/** The display family rendered with the real components, on the current theme. */
export function ComponentsPreview() {
  return (
    <div className="flex flex-col gap-ds-300">
      <div className="flex flex-col gap-ds-100">
        <Heading level={2} size="heading-large">
          Components
        </Heading>
        <Text tone="subtle">The display family from @senvenli/react, on the theme you are building.</Text>
      </div>

      <div className="grid gap-ds-300 md:grid-cols-2">
        <Card>
          <CardHeader title="Typography" subtitle="Heading and Text" />
          <CardBody>
            <div className="flex flex-col gap-ds-150">
              <Heading level={3} size="heading-xlarge">
                Ship calmer interfaces
              </Heading>
              <Text size="body-large">A design system that themes itself from zero inputs.</Text>
              <Text tone="subtle">Every color pair meets WCAG AA in light and dark.</Text>
              <Text size="body-small" tone="subtlest">
                Updated 2 minutes ago
              </Text>
              <Text size="code">npx senvenli-ui theme</Text>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Lozenge and Badge" subtitle="Status at a glance" />
          <CardBody>
            <div className="flex flex-col gap-ds-200">
              <div className="flex flex-wrap gap-ds-100">
                <Lozenge>Draft</Lozenge>
                <Lozenge tone="information">In review</Lozenge>
                <Lozenge tone="brand">Featured</Lozenge>
                <Lozenge tone="success" hasDot>
                  Online
                </Lozenge>
                <Lozenge tone="warning">Pending</Lozenge>
                <Lozenge tone="danger">Failed</Lozenge>
              </div>
              <div className="flex flex-wrap gap-ds-100">
                <Lozenge tone="information" appearance="bold">
                  New
                </Lozenge>
                <Lozenge tone="success" appearance="bold">
                  Paid
                </Lozenge>
                <Lozenge tone="warning" appearance="bold">
                  Overdue
                </Lozenge>
                <Lozenge tone="danger" appearance="bold">
                  Blocked
                </Lozenge>
              </div>
              <div className="flex items-center gap-ds-300">
                <BadgeAnchor>
                  <Icon name="bell" size="large" label="Notifications" />
                  <Badge value={3} tone="danger" isOnIcon />
                </BadgeAnchor>
                <Badge value={12} />
                <Badge value={128} max={99} tone="brand" />
                <Badge value={7} tone="inverse" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Avatar" subtitle="People and companies" />
          <CardBody>
            <div className="flex flex-col gap-ds-200">
              <div className="flex items-center gap-ds-150">
                <Avatar name="Ada Lovelace" size="large" presence="online" />
                <Avatar name="Grace Hopper" />
                <Avatar name="Acme Inc" shape="square" />
                <Avatar name="Alan Turing" size="small" />
              </div>
              <AvatarGroup aria-label="Project members" max={4}>
                {PEOPLE.map((name) => (
                  <Avatar key={name} name={name} />
                ))}
              </AvatarGroup>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Icon and Kbd" subtitle="Any Lucide icon by name" />
          <CardBody>
            <div className="flex flex-col gap-ds-200">
              <div className="flex flex-wrap items-center gap-ds-200">
                <Icon name="house" />
                <Icon name="search" color="subtle" />
                <Icon name="star" color="brand" />
                <Icon name="circle-check" color="success" />
                <Icon name="triangle-alert" color="warning" />
                <Icon name="circle-x" color="danger" />
                <Icon name="info" color="information" size="large" />
              </div>
              <Text tone="subtle">
                Search with <ModifierKbd /> <Kbd>K</Kbd>, close with <Kbd label="Escape">Esc</Kbd>.
              </Text>
            </div>
          </CardBody>
        </Card>

        <Card variant="outline">
          <CardHeader title="Separator" subtitle="Outline card" />
          <CardBody>
            <div className="flex flex-col gap-ds-200">
              <Text>Account</Text>
              <Separator />
              <Text>Billing</Text>
              <Separator>or</Separator>
              <div className="flex h-ds-control items-center gap-ds-200">
                <Text>Left</Text>
                <Separator orientation="vertical" />
                <Text>Right</Text>
              </div>
            </div>
          </CardBody>
          <CardFooter>
            <Text size="body-small" tone="subtlest">
              Footer area
            </Text>
          </CardFooter>
        </Card>

        <Card variant="sunken">
          <CardHeader title="Scroll area" subtitle="Sunken card, thin scrollbar" />
          <CardBody>
            <ScrollArea maxHeight={180} aria-label="Activity">
              <ul className="flex flex-col gap-ds-150 pe-ds-200">
                {Array.from({ length: 14 }, (_, i) => (
                  <li key={i} className="flex items-center justify-between gap-ds-200">
                    <Text>Activity item {i + 1}</Text>
                    <Text size="body-small" tone="subtlest">
                      {i + 1}m ago
                    </Text>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
