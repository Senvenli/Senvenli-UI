import { Button } from "@senvenli/react/action";
import { FileTrigger } from "@senvenli/react/form";
import { Text } from "@senvenli/react/display";
import { ImageCropper } from "@senvenli/react/form";
import { Stack } from "@senvenli/react/layout";
import { useState } from "react";

export default function Example() {
  const [picked, setPicked] = useState<File>();
  const [saved, setSaved] = useState<File>();
  return (
    <div className="flex max-w-xl flex-col gap-ds-150">
      <Stack space="space-150" align="start">
        <FileTrigger acceptedFileTypes={["image/jpeg", "image/png", "image/webp"]} maxSize={10_000_000} onSelect={([file]) => setPicked(file)}>
          <Button iconBefore="image-up">Choose a profile photo</Button>
        </FileTrigger>
        {saved && <Text tone="subtle">Saved {saved.name}</Text>}
      </Stack>
      {picked && (
        <ImageCropper
          src={picked}
          label="Profile photo"
          aspectRatio={1}
          maxOutputSize={512}
          onCrop={(file) => {
            setSaved(file);
            setPicked(undefined);
          }}
          onCancel={() => setPicked(undefined)}
        />
      )}
    </div>
  );
}
