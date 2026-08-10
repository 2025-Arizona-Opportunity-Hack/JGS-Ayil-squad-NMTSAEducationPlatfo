import { describe, it, expect } from "vitest";
import {
  DARK_BACKGROUND_HSL,
  contrastRatio,
  ensureContrastOnDark,
  hexToHSL,
  hslLuminance,
} from "./color";

/** Contrast of an "h s% l%" colour against the dark-mode background. */
function ratioOnDark(hsl: string): number {
  return contrastRatio(hslLuminance(hsl), hslLuminance(DARK_BACKGROUND_HSL));
}

describe("hexToHSL", () => {
  it("converts hex to the 'h s% l%' triple used by our CSS variables", () => {
    expect(hexToHSL("#ffffff")).toBe("0 0% 100%");
    expect(hexToHSL("#000000")).toBe("0 0% 0%");
  });

  it("accepts a hex value with or without the leading #", () => {
    expect(hexToHSL("4f46e5")).toBe(hexToHSL("#4f46e5"));
  });
});

describe("contrastRatio", () => {
  it("returns 21 for black against white", () => {
    const black = hslLuminance("0 0% 0%");
    const white = hslLuminance("0 0% 100%");
    expect(contrastRatio(black, white)).toBeCloseTo(21, 1);
  });

  it("is order-independent", () => {
    const a = hslLuminance("238 70% 56%");
    const b = hslLuminance(DARK_BACKGROUND_HSL);
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 5);
  });
});

describe("ensureContrastOnDark", () => {
  it("lightens the current indigo primary until it is readable on dark", () => {
    // The shipped light-mode primary measures ~2.66:1 on the dark background.
    expect(ratioOnDark("238 70% 56%")).toBeLessThan(4.5);
    expect(ratioOnDark(ensureContrastOnDark("238 70% 56%"))).toBeGreaterThanOrEqual(4.5);
  });

  it("leaves a colour that already passes untouched", () => {
    expect(ensureContrastOnDark("0 0% 90%")).toBe("0 0% 90%");
  });

  it("handles a very dark brand colour", () => {
    // Dark navy — the worst realistic case an admin could pick.
    expect(ratioOnDark(ensureContrastOnDark(hexToHSL("#1e3a8a")))).toBeGreaterThanOrEqual(4.5);
  });

  it("preserves hue and saturation while adjusting lightness", () => {
    const result = ensureContrastOnDark("238 70% 56%");
    expect(result.startsWith("238 70% ")).toBe(true);
  });

  it("terminates at the ceiling instead of looping on an impossible target", () => {
    // 21:1 is unreachable for a saturated colour; must return, not hang.
    expect(ensureContrastOnDark("238 70% 56%", 21)).toBe("238 70% 95%");
  });
});
