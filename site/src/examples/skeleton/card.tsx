import { Skeleton, SkeletonGroup, SkeletonText } from "@senvenli/react/feedback";
import { Box, Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    <div className="mx-auto max-w-xs">
      <SkeletonGroup label="Loading project" isLoading>
        <Box padding="space-200" radius="large" border>
          <Stack space="space-200">
            <Skeleton aspectRatio="16/9" radius="large" />
            <Skeleton width="50%" height={16} />
            <SkeletonText lines={3} />
            <Skeleton width={96} height={32} radius="medium" />
          </Stack>
        </Box>
      </SkeletonGroup>
    </div>
  );
}
