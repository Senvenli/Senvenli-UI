import { Icon, Text } from "@senvenli/react/display";
import { Tab, TabList, TabPanel, Tabs } from "@senvenli/react/navigation";

export default function Example() {
  return (
    <Tabs>
      <TabList aria-label="Settings">
        <Tab id="profile">
          <Icon name="user" size="small" />
          Profile
        </Tab>
        <Tab id="billing" count={1}>
          <Icon name="credit-card" size="small" />
          Billing
        </Tab>
        <Tab id="team" isDisabled>
          <Icon name="users" size="small" />
          Team
        </Tab>
      </TabList>
      <TabPanel id="profile">
        <Text>Your name, photo and the language the app speaks to you in.</Text>
      </TabPanel>
      <TabPanel id="billing">
        <Text>One invoice is waiting for payment.</Text>
      </TabPanel>
      <TabPanel id="team">
        <Text>Invite people once your plan includes seats.</Text>
      </TabPanel>
    </Tabs>
  );
}
