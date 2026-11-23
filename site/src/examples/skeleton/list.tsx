import { Skeleton, SkeletonGroup } from "@senvenli/react/feedback";
import { Stack } from "@senvenli/react/layout";

const ROWS = ["first", "second", "third"];

export default function Example() {
  return (
    <SkeletonGroup label="Loading customers" isLoading>
      <Stack space="space-200">
        {ROWS.map((row) => (
          <Stack direction="horizontal" key={row} space="space-150" wrap={false}>
            <Skeleton variant="circle" size={32} />
            <div className="min-w-0 flex-1">
              <Skeleton variant="text" lines={2} />
            </div>
          </Stack>
        ))}
      </Stack>
    </SkeletonGroup>
  );
}
