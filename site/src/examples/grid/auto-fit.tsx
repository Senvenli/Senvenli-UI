import { Text } from "@senvenli/react/display";
import { Box, Grid, Stack } from "@senvenli/react/layout";

const PROJECTS = [
  { name: "Website redesign", tasks: "12 open tasks" },
  { name: "Mobile app", tasks: "8 open tasks" },
  { name: "Billing migration", tasks: "3 open tasks" },
  { name: "Help center", tasks: "5 open tasks" },
];

export default function Example() {
  return (
    <Grid minColumnWidth={180} space="space-200">
      {PROJECTS.map((project) => (
        <Box key={project.name} padding="space-200" radius="large" border>
          <Stack space="space-050">
            <Text weight="medium">{project.name}</Text>
            <Text size="body-small" tone="subtle">{project.tasks}</Text>
          </Stack>
        </Box>
      ))}
    </Grid>
  );
}
