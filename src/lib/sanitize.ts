import createDOMPurify from "dompurify";

// DOMPurify exports a factory function that needs a Window object.
// In the browser via Vite bundler, it auto-initializes. In test environments
// (happy-dom/jsdom), we need to call the factory with the global window.
// We use lazy init to ensure the environment (happy-dom) has set up globals first.
let _purify: { sanitize: (html: string, config: object) => string } | null =
  null;

function getPurify() {
  if (_purify) return _purify;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dp = createDOMPurify as any;
  if (typeof dp.sanitize === "function") {
    // Already initialized (browser via Vite)
    _purify = dp;
  } else if (typeof dp === "function") {
    // Factory function (test environments) — call with window
    _purify = dp(globalThis);
  } else {
    throw new Error("DOMPurify could not be initialized");
  }
  return _purify!;
}

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "br", "hr",
    "ul", "ol", "li",
    "strong", "em", "b", "i", "u", "s", "strike",
    "a", "blockquote", "pre", "code",
    "table", "thead", "tbody", "tr", "th", "td",
    "img", "figure", "figcaption",
    "div", "span", "sub", "sup",
  ],
  ALLOWED_ATTR: [
    "href", "target", "rel", "src", "alt", "title",
    "class", "style", "width", "height",
  ],
  ADD_ATTR: ["target"],
  FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "select", "textarea", "button"],
  FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onmouseout", "onfocus", "onblur"],
};

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Used for all user-generated rich text content rendered with dangerouslySetInnerHTML.
 */
export function sanitizeHtml(html: string | undefined | null): string {
  if (!html) return "";
  return getPurify().sanitize(html, SANITIZE_CONFIG);
}

/**
 * Strip HTML tags and return plain text.
 * Used for displaying richtext content as a text summary (cards, lists, previews).
 */
export function stripHtml(html: string | undefined | null): string {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
}
