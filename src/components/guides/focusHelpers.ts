/**
 * The first element matching `selector` that the user can actually see.
 *
 * A responsive shell renders the same control once per breakpoint and hides
 * one with CSS; the hidden copy still matches a selector but measures 0x0.
 * Shared by target resolution and by focus restoration, which has the same
 * problem — the header's help button exists twice.
 */
export function firstVisibleMatch(selector: string): Element | null {
  return (
    Array.from(document.querySelectorAll(selector)).find((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }) ?? null
  );
}

/** Focusable only if it is still in the document and not the bare <body>. */
export function focusableOrNull(el: unknown): HTMLElement | null {
  return el instanceof HTMLElement && el.isConnected && el !== document.body
    ? el
    : null;
}
