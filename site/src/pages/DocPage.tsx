import { Heading, Text } from "@senvenli/react/display";

export function DocPage({ title, body }: { title: string; body: string }) {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-ds-200 px-ds-300 py-ds-600">
      <Heading level={1} size="heading-xlarge">
        {title}
      </Heading>
      <Text>{body}</Text>
    </main>
  );
}
