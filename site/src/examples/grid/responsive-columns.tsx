import { Card, CardBody, CardHeader, Text } from "@senvenli/react/display";
import { Grid } from "@senvenli/react/layout";

const CARDS = ["Traffic", "Signups", "Top pages", "Top countries"];

export default function Example() {
  return (
    <div className="w-[40rem] max-w-full">
      {/* One column on phones, two from 768px: a two-by-two grid of cards without pairing them by hand. */}
      <Grid columns={{ base: 1, md: 2 }} space="space-200">
        {CARDS.map((title) => (
          <Card key={title}>
            <CardHeader title={title} />
            <CardBody>
              <Text tone="subtle">Chart</Text>
            </CardBody>
          </Card>
        ))}
      </Grid>
    </div>
  );
}
