// jsdom has no Web Animations API on elements; React Aria's shared-element transition (the sliding selection
// indicator of Tabs and SegmentedControl) asks every element for its running animations. Browsers have it.
if (typeof Element !== "undefined" && typeof Element.prototype.getAnimations !== "function") {
  Element.prototype.getAnimations = () => [];
}
