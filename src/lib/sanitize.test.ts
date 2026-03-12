// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "./sanitize";

describe("sanitizeHtml", () => {
  it("returns empty string for null/undefined", () => {
    expect(sanitizeHtml(null)).toBe("");
    expect(sanitizeHtml(undefined)).toBe("");
    expect(sanitizeHtml("")).toBe("");
  });

  it("preserves safe HTML tags", () => {
    const input = "<p>Hello <strong>world</strong></p>";
    expect(sanitizeHtml(input)).toBe(input);
  });

  it("preserves headings", () => {
    expect(sanitizeHtml("<h1>Title</h1>")).toBe("<h1>Title</h1>");
    expect(sanitizeHtml("<h2>Subtitle</h2>")).toBe("<h2>Subtitle</h2>");
  });

  it("preserves lists", () => {
    const input = "<ul><li>Item 1</li><li>Item 2</li></ul>";
    expect(sanitizeHtml(input)).toBe(input);
  });

  it("preserves links with href", () => {
    const input = '<a href="https://example.com">Link</a>';
    expect(sanitizeHtml(input)).toContain('href="https://example.com"');
  });

  it("preserves images with src and alt", () => {
    const input = '<img src="https://example.com/img.jpg" alt="Photo">';
    const result = sanitizeHtml(input);
    expect(result).toContain('src="https://example.com/img.jpg"');
    expect(result).toContain('alt="Photo"');
  });

  it("removes script tags", () => {
    const input = '<p>Hello</p><script>alert("xss")</script>';
    expect(sanitizeHtml(input)).toBe("<p>Hello</p>");
  });

  it("removes inline event handlers", () => {
    const input = '<img src="x" onerror="alert(1)">';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("onerror");
  });

  it("removes onclick attributes", () => {
    const input = '<div onclick="alert(1)">Click me</div>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("onclick");
  });

  it("removes iframe tags", () => {
    const input = '<iframe src="https://evil.com"></iframe>';
    expect(sanitizeHtml(input)).toBe("");
  });

  it("removes object/embed tags", () => {
    expect(sanitizeHtml('<object data="x"></object>')).toBe("");
    expect(sanitizeHtml('<embed src="x">')).toBe("");
  });

  it("removes form tags", () => {
    const input = '<form action="/steal">Submit data</form>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("<form");
    expect(result).not.toContain("action=");
  });

  it("removes javascript: URLs from links", () => {
    const input = '<a href="javascript:alert(1)">Click</a>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("javascript:");
  });

  it("handles nested malicious content", () => {
    const input = '<div><p>Safe content<script>alert("xss")</script></p></div>';
    expect(sanitizeHtml(input)).toBe("<div><p>Safe content</p></div>");
  });

  it("preserves table elements", () => {
    const input = "<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Cell</td></tr></tbody></table>";
    expect(sanitizeHtml(input)).toBe(input);
  });

  it("preserves code blocks", () => {
    const input = "<pre><code>const x = 1;</code></pre>";
    expect(sanitizeHtml(input)).toBe(input);
  });
});
