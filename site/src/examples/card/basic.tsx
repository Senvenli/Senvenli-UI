import { Button } from "@senvenli/react/action";
import { Card, CardBody, CardFooter, CardHeader, Text } from "@senvenli/react/display";

export default function Example() {
  return (
    <div className="max-w-sm">
      <Card>
        <CardHeader title="Order #1042" subtitle="Placed March 18, 2026" />
        <CardBody>
          <Text elementType="p">Three items for Ada Lovelace, shipping to London by standard delivery.</Text>
        </CardBody>
        <CardFooter>
          <Button>Print label</Button>
          <Button variant="primary">Mark as shipped</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
