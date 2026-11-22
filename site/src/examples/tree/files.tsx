import { Tree } from "@senvenli/react/collection";

export default function Example() {
  return (
    <Tree
      aria-label="Files"
      defaultExpandedKeys={["src"]}
      items={[
        {
          id: "src",
          label: "src",
          icon: "folder",
          children: [
            { id: "components", label: "components", icon: "folder", children: [{ id: "button", label: "button.tsx", icon: "file-code" }] },
            { id: "index", label: "index.ts", icon: "file-code" },
          ],
        },
        { id: "readme", label: "README.md", icon: "file-text" },
      ]}
    />
  );
}
