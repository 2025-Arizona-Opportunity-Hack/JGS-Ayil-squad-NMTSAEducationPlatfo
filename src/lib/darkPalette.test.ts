import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { contrastRatio, hslLuminance, DARK_BACKGROUND_HSL } from "./color";

/**
 * Parses the `.dark` block out of the real stylesheet so this suite fails if
 * someone regresses the palette, not just if today's numbers are wrong.
 */
function darkTokens(): Record<string, string> {
  const cssPath = fileURLToPath(new URL("../index.css", import.meta.url));
  const css = readFileSync(cssPath, "utf8");
  const block = css.match(/\.dark\s*\{([^}]*)\}/);
  if (!block) throw new Error("No .dark block found in src/index.css");

  const tokens: Record<string, string> = {};
  for (const line of block[1].split("\n")) {
    const declaration = line.match(/^\s*--([\w-]+):\s*([^;]+);/);
    if (declaration) tokens[declaration[1]] = declaration[2].trim();
  }
  return tokens;
}

/** Contrast between two token names in the dark palette. */
function ratio(tokens: Record<string, string>, a: string, b: string): number {
  return contrastRatio(hslLuminance(tokens[a]), hslLuminance(tokens[b]));
}

describe("dark palette contrast (WCAG 2.2 AA)", () => {
  const tokens = darkTokens();

  it("renders body text on the background at 4.5:1 or better", () => {
    expect(ratio(tokens, "foreground", "background")).toBeGreaterThanOrEqual(4.5);
  });

  it("renders muted text on the background at 4.5:1 or better", () => {
    expect(ratio(tokens, "muted-foreground", "background")).toBeGreaterThanOrEqual(4.5);
  });

  it("renders accent text (text-primary) on the background at 4.5:1 or better", () => {
    expect(ratio(tokens, "primary", "background")).toBeGreaterThanOrEqual(4.5);
  });

  it("renders button labels on the primary fill at 4.5:1 or better", () => {
    expect(ratio(tokens, "primary-foreground", "primary")).toBeGreaterThanOrEqual(4.5);
  });

  it("renders the focus ring against the background at 3:1 or better", () => {
    expect(ratio(tokens, "ring", "background")).toBeGreaterThanOrEqual(3);
  });

  it("renders client-portal body text on the client surface at 4.5:1 or better", () => {
    expect(ratio(tokens, "client-text", "client-surface")).toBeGreaterThanOrEqual(4.5);
    expect(ratio(tokens, "client-text-secondary", "client-surface")).toBeGreaterThanOrEqual(4.5);
  });

  it("pairs the primary fill with a foreground equal to the background", () => {
    // Load-bearing: because --primary-foreground and the background are the
    // same colour, "primary readable as text on the background" and "button
    // label readable on the primary fill" are one constraint, which is why a
    // single 4.5:1 adjustment in ensureContrastOnDark satisfies both.
    expect(tokens["primary-foreground"]).toBe(tokens["background"]);
    expect(tokens["primary-foreground"]).toBe(DARK_BACKGROUND_HSL);
  });
});
