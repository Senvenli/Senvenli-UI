import { FileUploadList, FileRow } from "@senvenli/react/action";
import { useState } from "react";

// Stored documents have no File object: the row takes a name and a size in bytes.
const DOCUMENTS = [
  { name: "invoice-1042.pdf", size: 248_000 },
  { name: "packing-list.pdf", size: 3_600_000, progress: 0.4 },
  { name: "contract-scan.pdf", size: 18_400_000, error: "The file is larger than 10 MB." },
];

export default function Example() {
  const [documents, setDocuments] = useState(DOCUMENTS);
  const remove = (name: string) => setDocuments(documents.filter((item) => item.name !== name));
  return (
    <FileUploadList aria-label="Order documents">
      {documents.map((item) => (
        <FileRow key={item.name} {...item} onCancel={() => remove(item.name)} onRemove={() => remove(item.name)} />
      ))}
    </FileUploadList>
  );
}
