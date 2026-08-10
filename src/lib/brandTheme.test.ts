import { describe, it, expect } from "vitest";
import { resolveBrandTokens } from "./brandTheme";
import { DARK_BACKGROUND_HSL, contrastRatio, hexToHSL, hslLuminance } from "./color";

function ratioOnDark(hsl: string): number {
  return contrastRatio(hslLuminance(hsl), hslLuminance(DARK_BACKGROUND_HSL));
}

describe("resolveBrandTokens", () => {
  it("uses the brand colour as-is in light mode, with white foreground", () => {
    const tokens = resolveBrandTokens("#4f46e5", false);
    expect(tokens).not.toBeNull();
    expect(tokens!.primary).toBe(hexToHSL("#4f46e5"));
    expect(tokens!.ring).toBe(tokens!.primary);
    expect(tokens!.primaryForeground).toBe("0 0% 100%");
  });

  it("lightens a dark brand colour in dark mode until it is readable", () => {
    const tokens = resolveBrandTokens("#1e3a8a", true);
    expect(ratioOnDark(tokens!.primary)).toBeGreaterThanOrEqual(4.5);
  });

  it("pairs the dark-mode brand colour with a dark foreground", () => {
    const tokens = resolveBrandTokens("#1e3a8a", true);
    expect(tokens!.primaryForeground).toBe("0 0% 9%");
    expect(
      contrastRatio(hslLuminance(tokens!.primaryForeground), hslLuminance(tokens!.primary))
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("applies the same adjusted value to the focus ring", () => {
    const tokens = resolveBrandTokens("#1e3a8a", true);
    expect(tokens!.ring).toBe(tokens!.primary);
  });

  it("always passes the raw hex through untouched", () => {
    expect(resolveBrandTokens("#1e3a8a", true)!.primaryHex).toBe("#1e3a8a");
    expect(resolveBrandTokens("#1e3a8a", false)!.primaryHex).toBe("#1e3a8a");
  });

  it("leaves the stylesheet defaults in place when the brand colour is malformed", () => {
    // primaryColor is stored unvalidated, so these are all reachable values.
    expect(resolveBrandTokens("#fff", true)).toBeNull();
    expect(resolveBrandTokens("#fff", false)).toBeNull();
    expect(resolveBrandTokens("", true)).toBeNull();
    expect(resolveBrandTokens("not-a-colour", false)).toBeNull();
  });

  it("accepts a six-digit hex with or without the leading #", () => {
    expect(resolveBrandTokens("4f46e5", false)).not.toBeNull();
    expect(resolveBrandTokens("#4f46e5", false)).not.toBeNull();
  });
});
