// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect, beforeEach, vi } from "vitest";

function read(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

/**
 * Extracts the pre-paint theme script from index.html and runs it against the
 * current document, so these tests exercise the code that actually ships
 * rather than asserting on the file's text.
 */
function runThemeInitScript(): void {
  const html = read("../../index.html");
  const match = html.match(/<script id="theme-init">([\s\S]*?)<\/script>/);
  if (!match) throw new Error('No <script id="theme-init"> found in index.html');
  new Function(match[1])();
}

/** Forces window.matchMedia to report a fixed prefers-color-scheme result. */
function stubPrefersDark(prefersDark: boolean): void {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: prefersDark,
    media: query,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
    onchange: null,
  }));
}

describe("pre-paint theme script", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.style.colorScheme = "";
    vi.unstubAllGlobals();
  });

  it("applies dark when the user has never chosen a theme", () => {
    stubPrefersDark(false);
    runThemeInitScript();

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("keeps light for a user who deliberately chose it", () => {
    localStorage.setItem("theme", "light");
    stubPrefersDark(true);
    runThemeInitScript();

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it("keeps dark for a user who deliberately chose it", () => {
    localStorage.setItem("theme", "dark");
    runThemeInitScript();

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("follows the OS when the stored preference is 'system'", () => {
    localStorage.setItem("theme", "system");
    stubPrefersDark(true);
    runThemeInitScript();
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    document.documentElement.className = "";
    stubPrefersDark(false);
    runThemeInitScript();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});

describe("theme default", () => {
  it("defaults the next-themes provider to dark", () => {
    expect(read("../main.tsx")).toContain('defaultTheme="dark"');
  });

  it("uses the same default in the pre-paint script as in the provider", () => {
    // These two must agree; a mismatch makes next-themes correct the class
    // after mount, which is a worse flash than none.
    expect(read("../../index.html")).toContain("localStorage.getItem('theme') || 'dark'");
  });
});
