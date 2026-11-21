import { DropZone, FileList, FileRow, type RejectedFile } from "@senvenli/react/action";
import { Stack } from "@senvenli/react/layout";
import { useState } from "react";

export default function Example() {
  const [files, setFiles] = useState<File[]>([]);
  const [rejected, setRejected] = useState<RejectedFile[]>([]);
  return (
    <Stack space="space-150">
      <DropZone
        label="Drag your invoices here"
        typesLabel="PDF"
        acceptedFileTypes={["application/pdf"]}
        maxSize={10_000_000}
        allowsMultiple
        onSelect={(accepted) => setFiles((current) => [...current, ...accepted])}
        onReject={setRejected}
      />
      {files.length + rejected.length > 0 && (
        <FileList aria-label="Invoices">
          {files.map((file, index) => (
            <FileRow key={`${index}-${file.name}`} file={file} onRemove={() => setFiles(files.filter((item) => item !== file))} />
          ))}
          {rejected.map(({ file, reason }, index) => (
            <FileRow key={`rejected-${index}-${file.name}`} file={file} error={reason} onRemove={() => setRejected(rejected.filter((item) => item.file !== file))} />
          ))}
        </FileList>
      )}
    </Stack>
  );
}
