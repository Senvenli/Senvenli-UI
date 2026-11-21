import { Button, FileList, FileRow, FileTrigger } from "@senvenli/react/action";
import { Stack } from "@senvenli/react/layout";
import { useState } from "react";

export default function Example() {
  const [file, setFile] = useState<File>();
  return (
    <Stack space="space-150" align="start">
      <FileTrigger acceptedFileTypes={["image/*"]} maxSize={5_000_000} onSelect={([picked]) => setFile(picked)}>
        <Button iconBefore="upload">Upload a logo</Button>
      </FileTrigger>
      {file && (
        <FileList aria-label="Logo">
          <FileRow file={file} onRemove={() => setFile(undefined)} />
        </FileList>
      )}
    </Stack>
  );
}
