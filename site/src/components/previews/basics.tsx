import { Button, ButtonGroup, CloseButton, CopyButton, Link } from "@senvenli/react/action";
import { Avatar, AvatarGroup, Badge, Heading, Icon, Kbd, Separator, Stat, Text } from "@senvenli/react/display";
import { Meter, ProgressBar, Skeleton, SkeletonGroup, Spinner } from "@senvenli/react/feedback";
import type { ReactNode } from "react";
import { Block, Btn, IconBtn, Line, Photo, Word } from "./kit";

/** Display, action, layout and feedback. The small ones are the real component; the rest are drawn. */
export const BASICS: Record<string, ReactNode> = {
  // Display
  avatar: (
    <AvatarGroup aria-label="Team">
      <Avatar name="Ada Lovelace" src="/avatars/01.webp" />
      <Avatar name="Sofia Marin" src="/avatars/05.webp" />
      <Avatar name="Alan Turing" />
    </AvatarGroup>
  ),
  badge: (
    <div className="flex flex-wrap items-center justify-center gap-ds-100">
      <Badge tone="success">Paid</Badge>
      <Badge tone="warning">Pending</Badge>
      <Badge>Draft</Badge>
    </div>
  ),
  card: (
    <div className="flex w-32 flex-col gap-ds-100 rounded-ds-medium bg-ds-surface-sunken p-ds-100">
      <Photo className="h-10 w-full rounded-ds-small" />
      <Line w="w-16" strong />
      <Line w="w-24" />
    </div>
  ),
  carousel: (
    <div className="flex flex-col items-center gap-ds-100">
      <div className="flex items-center gap-ds-100">
        <Icon name="chevron-left" size="small" color="subtle" />
        <Photo className="h-16 w-28 rounded-ds-medium" />
        <Icon name="chevron-right" size="small" color="subtle" />
      </div>
      <div className="flex gap-ds-050">
        <span className="size-1.5 rounded-ds-full bg-ds-text-subtlest" />
        <span className="size-1.5 rounded-ds-full bg-ds-background-neutral-pressed" />
        <span className="size-1.5 rounded-ds-full bg-ds-background-neutral-pressed" />
      </div>
    </div>
  ),
  "description-list": (
    <div className="grid w-40 grid-cols-[auto_1fr] items-center gap-x-ds-200 gap-y-ds-150">
      <Line w="w-10" />
      <Line w="w-20" strong />
      <Line w="w-12" />
      <Line w="w-14" strong />
      <Line w="w-8" />
      <Line w="w-24" strong />
    </div>
  ),
  heading: (
    <div className="flex w-40 flex-col gap-ds-100">
      <Heading level={3} size="heading-large">
        Heading
      </Heading>
      <Line />
      <Line w="w-2/3" />
    </div>
  ),
  icon: (
    <div className="flex items-center gap-ds-200">
      <Icon name="circle-check" color="success" />
      <Icon name="triangle-alert" color="warning" />
      <Icon name="info" color="information" />
      <Icon name="star" color="subtle" />
    </div>
  ),
  "image-viewer": (
    <div className="flex h-28 w-44 flex-col items-center justify-center gap-ds-075 rounded-ds-medium bg-ds-blanket p-ds-100">
      <div className="flex w-full justify-end">
        <Icon name="x" size="small" color="subtle" />
      </div>
      <Photo className="h-12 w-24 rounded-ds-small" />
      <div className="flex gap-ds-050">
        <span className="h-3 w-4 rounded-ds-xsmall border border-ds-border-focused bg-ds-surface-overlay" />
        <span className="h-3 w-4 rounded-ds-xsmall bg-ds-surface-overlay" />
        <span className="h-3 w-4 rounded-ds-xsmall bg-ds-surface-overlay" />
      </div>
    </div>
  ),
  image: <Photo className="h-20 w-32 rounded-ds-medium" />,
  kbd: (
    <div className="flex items-center gap-ds-050">
      <Kbd isModifier />
      <Kbd>K</Kbd>
    </div>
  ),
  separator: (
    <div className="flex w-36 flex-col gap-ds-150">
      <Line w="w-20" />
      <Separator />
      <Line w="w-28" />
    </div>
  ),
  stat: <Stat label="Revenue" value="$48,920" delta={{ value: "12.4%", direction: "up" }} />,
  text: (
    <div className="flex w-40 flex-col gap-ds-050">
      <Text size="body-large">Body large</Text>
      <Text>Body text</Text>
      <Text size="body-small" tone="subtle">
        Small and subtle
      </Text>
    </div>
  ),
  timeline: (
    <div className="flex flex-col">
      {["w-20", "w-24", "w-16"].map((width, index) => (
        <div key={width} className="flex gap-ds-100">
          <div className="flex flex-col items-center">
            <span className={`size-2 rounded-ds-full ${index === 0 ? "bg-ds-background-brand-bold" : "bg-ds-background-neutral-pressed"}`} />
            {index < 2 && <span className="h-5 w-px bg-ds-border" />}
          </div>
          <Line w={width} strong={index === 0} className="mt-px" />
        </div>
      ))}
    </div>
  ),
  "visually-hidden": (
    <div className="flex items-center gap-ds-100">
      <IconBtn name="trash-2" />
      <span className="flex h-6 items-center gap-ds-050 rounded-ds-control-small border border-dashed border-ds-border-bold px-ds-100">
        <Icon name="eye-off" size="small" color="subtle" />
        <Word tone="subtlest">Delete</Word>
      </span>
    </div>
  ),

  // Action
  button: (
    <div className="flex items-center gap-ds-100">
      <Button variant="primary" size="small">
        Save
      </Button>
      <Button size="small">Cancel</Button>
    </div>
  ),
  "button-group": (
    <ButtonGroup aria-label="History">
      <Button size="small" iconOnly iconBefore="undo-2" aria-label="Undo" />
      <Button size="small" iconOnly iconBefore="redo-2" aria-label="Redo" />
      <Button size="small" iconOnly iconBefore="history" aria-label="History" />
    </ButtonGroup>
  ),
  "close-button": <CloseButton />,
  "copy-button": (
    <div className="flex items-center gap-ds-100">
      <Text isNumeric>INV-0318</Text>
      <CopyButton value="" aria-label="Copy" />
    </div>
  ),
  fab: (
    <div className="relative h-24 w-36 rounded-ds-medium bg-ds-surface-sunken p-ds-150">
      <div className="flex flex-col gap-ds-100">
        <Line w="w-12" strong />
        <Line w="w-20" />
        <Line w="w-16" />
      </div>
      <span className="absolute bottom-2 right-2 flex size-8 items-center justify-center rounded-ds-full bg-ds-background-brand-bold text-ds-text-on-brand shadow-ds-raised">
        <Icon name="plus" size="small" />
      </span>
    </div>
  ),
  "language-switcher": (
    <Btn className="gap-ds-075">
      <Icon name="globe" size="small" />
      English
      <Icon name="chevron-down" size="small" color="subtle" />
    </Btn>
  ),
  link: <Link href="/docs/components/link">View all orders</Link>,
  pressable: (
    <div className="flex w-40 items-center gap-ds-100 rounded-ds-medium bg-ds-surface-hovered p-ds-100">
      <span className="size-6 shrink-0 rounded-ds-full bg-ds-background-neutral-pressed" />
      <span className="flex min-w-0 flex-1 flex-col gap-ds-075">
        <Line w="w-14" strong />
        <Line w="w-20" />
      </span>
      <Icon name="chevron-right" size="small" color="subtle" />
    </div>
  ),
  "theme-switcher": (
    <div className="flex items-center gap-ds-025 rounded-ds-control-medium bg-ds-background-neutral p-ds-025">
      <span className="flex size-6 items-center justify-center rounded-ds-control-small bg-ds-background-segment-selected text-ds-text">
        <Icon name="sun" size="small" />
      </span>
      <span className="flex size-6 items-center justify-center text-ds-text-subtle">
        <Icon name="moon" size="small" />
      </span>
      <span className="flex size-6 items-center justify-center text-ds-text-subtle">
        <Icon name="monitor" size="small" />
      </span>
    </div>
  ),
  "toggle-button": (
    <div className="flex items-center gap-ds-050">
      <IconBtn name="bold" fill="selected" />
      <IconBtn name="italic" fill="none" />
      <IconBtn name="underline" fill="none" />
    </div>
  ),

  // Layout
  box: (
    <div className="rounded-ds-medium border border-dashed border-ds-border-bold p-ds-150">
      <Block className="h-12 w-24" />
    </div>
  ),
  grid: (
    <div className="grid w-36 grid-cols-3 gap-ds-075">
      {[0, 1, 2, 3, 4, 5].map((cell) => (
        <Block key={cell} className="h-8" />
      ))}
    </div>
  ),
  "scroll-area": (
    <div className="flex h-20 w-36 gap-ds-100 rounded-ds-medium bg-ds-surface-sunken p-ds-100">
      <div className="flex flex-1 flex-col justify-between">
        <Line w="w-16" strong />
        <Line />
        <Line w="w-5/6" />
        <Line />
        <Line w="w-2/3" />
      </div>
      <div className="flex w-1 flex-col rounded-ds-full">
        <span className="h-8 w-1 rounded-ds-full bg-ds-text-subtlest" />
      </div>
    </div>
  ),
  section: (
    <div className="flex w-40 flex-col gap-ds-100">
      <div className="flex flex-col gap-ds-075 rounded-ds-small bg-ds-surface-sunken p-ds-100">
        <Line w="w-12" strong />
        <Line w="w-24" />
      </div>
      <div className="flex flex-col gap-ds-075 rounded-ds-small bg-ds-surface-sunken p-ds-100">
        <Line w="w-16" strong />
        <Line w="w-20" />
      </div>
    </div>
  ),
  split: (
    <div className="flex h-20 w-40 items-stretch gap-ds-050">
      <Block className="w-12" />
      <span className="flex items-center">
        <span className="h-6 w-1 rounded-ds-full bg-ds-text-subtlest" />
      </span>
      <Block className="flex-1" />
    </div>
  ),
  stack: (
    <div className="flex w-28 flex-col gap-ds-100">
      <Block className="h-5" />
      <Block className="h-5" />
      <Block className="h-5" />
    </div>
  ),
  toolbar: (
    <div className="flex w-44 items-center gap-ds-050 rounded-ds-medium bg-ds-surface-sunken p-ds-075">
      <IconBtn name="bold" fill="none" />
      <IconBtn name="italic" fill="none" />
      <span className="mx-ds-025 h-4 w-px bg-ds-border-bold" />
      <IconBtn name="list" fill="none" />
      <span className="flex-1" />
      <Btn primary>Save</Btn>
    </div>
  ),

  // Feedback
  banner: (
    <div className="flex w-44 items-start gap-ds-100 rounded-ds-medium bg-ds-background-information p-ds-100">
      <Icon name="info" size="small" color="information" />
      <span className="flex min-w-0 flex-1 flex-col gap-ds-075 pt-ds-050">
        <Line w="w-16" strong />
        <Line w="w-24" />
      </span>
      <Icon name="x" size="small" color="subtle" />
    </div>
  ),
  "empty-state": (
    <div className="flex flex-col items-center gap-ds-100">
      <span className="flex size-8 items-center justify-center rounded-ds-full bg-ds-background-neutral text-ds-text-subtle">
        <Icon name="inbox" size="small" />
      </span>
      <Line w="w-20" strong />
      <Line w="w-28" />
      <Btn>Create</Btn>
    </div>
  ),
  meter: (
    <div className="w-40">
      <Meter label="Storage" value={62} maxValue={100} valueLabel="62%" />
    </div>
  ),
  progress: (
    <div className="w-40">
      <ProgressBar label="Uploading" value={64} />
    </div>
  ),
  skeleton: (
    <div className="w-40">
      <SkeletonGroup label="Loading" isLoading>
        <div className="flex items-center gap-ds-150">
          <Skeleton variant="circle" size={32} />
          <div className="min-w-0 flex-1">
            <Skeleton variant="text" lines={2} />
          </div>
        </div>
      </SkeletonGroup>
    </div>
  ),
  spinner: (
    <div className="flex items-center gap-ds-200">
      <Spinner size="small" aria-label="Loading" />
      <Spinner aria-label="Loading" />
      <Spinner size="large" aria-label="Loading" />
    </div>
  ),
};
