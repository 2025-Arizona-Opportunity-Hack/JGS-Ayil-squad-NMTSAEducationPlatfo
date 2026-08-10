import { ensureContrastOnDark, hexToHSL } from "./color";

export interface BrandTokens {
  /** Value for --primary, as an "h s% l%" triple. */
  primary: string;
  /** Value for --ring. Matches primary. */
  ring: string;
  /** Value for --primary-foreground: what sits on top of the primary fill. */
  primaryForeground: string;
  /** The raw hex, exposed as --primary-hex for gradients and canvases. */
  primaryHex: string;
}

/** Six-digit hex, with or without a leading #. 3-digit shorthand is rejected. */
const SIX_DIGIT_HEX = /^#?[0-9a-fA-F]{6}$/;

/**
 * Derives the primary-colour CSS variables from the admin's configured brand
 * colour.
 *
 * In dark mode the brand colour is lightened until it is readable as text on
 * the dark background, and paired with a dark foreground so button labels stay
 * readable on the fill. Without this, an admin picking a dark brand colour
 * would make accent text unreadable for every user.
 *
 * `siteSettings.primaryColor` is stored without format validation, so this
 * also validates the hex and returns null when it is malformed (e.g. 3-digit
 * shorthand, empty string, a named colour). Returning null lets the caller
 * leave the accessible stylesheet defaults in place rather than writing an
 * invalid CSS custom property value.
 */
export function resolveBrandTokens(hex: string, isDark: boolean): BrandTokens | null {
  if (!SIX_DIGIT_HEX.test(hex)) return null;

  const base = hexToHSL(hex);

  if (!isDark) {
    return {
      primary: base,
      ring: base,
      primaryForeground: "0 0% 100%",
      primaryHex: hex,
    };
  }

  const adjusted = ensureContrastOnDark(base);
  return {
    primary: adjusted,
    ring: adjusted,
    primaryForeground: "0 0% 9%",
    primaryHex: hex,
  };
}
