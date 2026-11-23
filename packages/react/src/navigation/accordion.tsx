"use client";

import * as React from "react";

import { MotionScope, type WithMotion } from "../defaults";
import {
  Button as AriaButton,
  Disclosure as AriaDisclosure,
  DisclosureGroup,
  DisclosurePanel,
  Heading,
  type Key,
} from "react-aria-components";

import { IconGlyph } from "../display/icon";

export type DisclosureProps = {
  /** A full question or a clear section name ("When is my deposit refunded?"). */
  title: React.ReactNode;
  children: React.ReactNode;
  isExpanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (isExpanded: boolean) => void;
  /** The heading level of the title in the page outline; the Accordion's, or 3 by default. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** Inside an Accordion: its key. */
  id?: Key;
};

const TRIGGER =
  "group flex min-h-12 w-full cursor-default items-center justify-between gap-ds-150 rounded-ds-small text-start text-body font-medium text-ds-text outline-hidden " +
  "data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused";

/**
 * Shows and hides one section. The trigger is a button inside a heading, so the page outline keeps the
 * title; its chevron turns as it opens. Never hide a required field or an error in a closed panel: open
 * it when it holds one.
 */
export function Disclosure({ motion, ...props }: DisclosureProps & WithMotion) {
  return (
    <MotionScope motion={motion}>
      <DisclosureBody {...props} />
    </MotionScope>
  );
}

/** The Accordion's heading level, for the Disclosures composed inside it. */
const HeadingLevelContext = React.createContext<DisclosureProps["headingLevel"]>(undefined);

function DisclosureBody({ title, children, isExpanded, defaultExpanded, onExpandedChange, headingLevel: own, id }: DisclosureProps) {
  const headingLevel = own ?? React.useContext(HeadingLevelContext) ?? 3;
  return (
    <AriaDisclosure
      id={id}
      isExpanded={isExpanded}
      defaultExpanded={defaultExpanded}
      onExpandedChange={onExpandedChange}
      data-slot="disclosure"
      className="border-b border-ds-border"
    >
      <Heading level={headingLevel} className="m-0">
        <AriaButton slot="trigger" data-slot="disclosure-trigger" className={TRIGGER}>
          <span className="min-w-0 flex-1">{title}</span>
          <IconGlyph
            name="chevron-down"
            data-slot="disclosure-chevron"
            className="text-ds-icon-subtle transition-transform duration-(--ds-duration-fast) ease-ds-standard group-aria-expanded:rotate-180 motion-reduce:transition-none"
          />
        </AriaButton>
      </Heading>
      <DisclosurePanel data-slot="disclosure-panel" className="text-body text-ds-text-subtle">
        <div className="pb-ds-200">{children}</div>
      </DisclosurePanel>
    </AriaDisclosure>
  );
}

export type AccordionItem = { id: Key; title: React.ReactNode; content: React.ReactNode };

export type AccordionProps = {
  /** FAQ entries, settings groups, long-form sections. Leave it out to compose `Disclosure`s as children instead. */
  items?: readonly AccordionItem[];
  /** With no `items`: `Disclosure`s, each with an `id` (the key `expandedKeys` uses). */
  children?: React.ReactNode;
  expandedKeys?: Iterable<Key>;
  defaultExpandedKeys?: Iterable<Key>;
  onExpandedChange?: (keys: Set<Key>) => void;
  /** Several open at once; by default opening one closes the others. */
  allowsMultipleExpanded?: boolean;
  headingLevel?: 2 | 3 | 4 | 5 | 6;
};

/** Stacked Disclosures with a 1px rule between them (FAQ, settings groups, long forms). */
function AccordionBody({ items, children, expandedKeys, defaultExpandedKeys, onExpandedChange, allowsMultipleExpanded, headingLevel }: AccordionProps) {
  return (
    <DisclosureGroup
      expandedKeys={expandedKeys}
      defaultExpandedKeys={defaultExpandedKeys}
      onExpandedChange={onExpandedChange}
      allowsMultipleExpanded={allowsMultipleExpanded}
      data-slot="accordion"
      className="border-t border-ds-border"
    >
      <HeadingLevelContext.Provider value={headingLevel}>
        {items
          ? items.map((item) => (
              <DisclosureBody key={item.id} id={item.id} title={item.title}>
                {item.content}
              </DisclosureBody>
            ))
          : children}
      </HeadingLevelContext.Provider>
    </DisclosureGroup>
  );
}

/** Accordion with its own `motion` (auto, reduce or none); see AccordionBody for the component itself. */
export function Accordion({ motion, ...props }: AccordionProps & WithMotion) {
  return (
    <MotionScope motion={motion}>
      <AccordionBody {...(props as AccordionProps)} />
    </MotionScope>
  );
}
