import { Button } from "@senvenli/react/action";
import { Avatar, Text } from "@senvenli/react/display";
import { SkeletonCircle, SkeletonGroup, SkeletonText } from "@senvenli/react/feedback";
import { Stack } from "@senvenli/react/layout";
import { useState } from "react";

export default function Example() {
  const [isLoading, setLoading] = useState(true);
  return (
    <Stack space="space-200" align="start">
      <div className="w-full">
        <SkeletonGroup label="Loading customer" loadedLabel="Customer" isLoading={isLoading}>
          <Stack direction="horizontal" space="space-150" wrap={false}>
            <SkeletonCircle size={32} isLoaded={!isLoading}>
              <Avatar name="Sofia Marin" src="/avatars/05.webp" />
            </SkeletonCircle>
            <div className="min-w-0 flex-1">
              <SkeletonText lines={2} isLoaded={!isLoading}>
                <Stack>
                  <Text weight="medium">Sofia Marin</Text>
                  <Text size="body-small" tone="subtle">ada@example.com</Text>
                </Stack>
              </SkeletonText>
            </div>
          </Stack>
        </SkeletonGroup>
      </div>
      <Button onPress={() => setLoading((current) => !current)}>{isLoading ? "Show the content" : "Show the skeleton"}</Button>
    </Stack>
  );
}
