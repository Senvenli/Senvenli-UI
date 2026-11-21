import { SkeletonCircle, SkeletonGroup, SkeletonText } from "@senvenli/react/feedback";
import { Inline, Stack } from "@senvenli/react/layout";

const ROWS = ["first", "second", "third"];

export default function Example() {
  return (
    <SkeletonGroup label="Loading customers" isLoading>
      <Stack space="space-200">
        {ROWS.map((row) => (
          <Inline key={row} space="space-150" wrap={false}>
            <SkeletonCircle size={32} />
            <div className="min-w-0 flex-1">
              <SkeletonText lines={2} />
            </div>
          </Inline>
        ))}
      </Stack>
    </SkeletonGroup>
  );
}
