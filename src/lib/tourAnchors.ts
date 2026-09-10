/**
 * The `data-tour` anchor for a client-portal navigation item.
 *
 * ClientHeader (desktop tabs) and BottomNav (mobile bar) render the same
 * destinations, and GuidedTour resolves one anchor to whichever copy is
 * visible at the current viewport. The two must therefore emit byte-identical
 * anchors, or a tour stop breaks on one viewport only — silently, since the
 * other viewport still works.
 *
 * They used to derive the anchor independently and agreed only by luck: every
 * label they share is a single word. A two-word item added to the bottom bar
 * would have emitted "client-nav-for you" against the header's
 * "client-nav-for-you". One helper, one derivation.
 */
export function navAnchor(label: string): string {
  return `client-nav-${label.toLowerCase().replace(/\s+/g, "-")}`;
}
