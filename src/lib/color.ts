/**
 * WCAG colour maths for the theme tokens.
 *
 * Colours are passed around as the bare "h s% l%" triple that Tailwind's
 * shadcn variables expect (e.g. "238 70% 56%"), not as full hsl() strings.
 */

/** The `--background` value under `.dark` in src/index.css. */
export const DARK_BACKGROUND_HSL = "0 0% 9%";

/** Highest lightness we will push a colour to before giving up. */
const MAX_LIGHTNESS = 95;

/** How much to raise lightness per attempt. */
const LIGHTNESS_STEP = 2;

interface HSL {
  h: number;
  s: number;
  l: number;
}

function parseHSL(hsl: string): HSL {
  const [h, s, l] = hsl.trim().split(/\s+/);
  return { h: parseFloat(h), s: parseFloat(s), l: parseFloat(l) };
}

function formatHSL({ h, s, l }: HSL): string {
  return `${h} ${s}% ${l}%`;
}

function hslToRGB({ h, s, l }: HSL): [number, number, number] {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;

  let rgb: [number, number, number];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];

  return [
    Math.round((rgb[0] + m) * 255),
    Math.round((rgb[1] + m) * 255),
    Math.round((rgb[2] + m) * 255),
  ];
}

/** Linearises one 0-255 sRGB channel, per the WCAG definition. */
function channelLuminance(value: number): number {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/** Converts a hex colour to the "h s% l%" triple used by our CSS variables. */
export function hexToHSL(hex: string): string {
  const value = hex.replace(/^#/, "");
  const r = parseInt(value.substring(0, 2), 16) / 255;
  const g = parseInt(value.substring(2, 4), 16) / 255;
  const b = parseInt(value.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** WCAG relative luminance (0–1) of an "h s% l%" colour. */
export function hslLuminance(hsl: string): number {
  const [r, g, b] = hslToRGB(parseHSL(hsl));
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

/** WCAG contrast ratio between two relative luminances. */
export function contrastRatio(a: number, b: number): number {
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Raises a colour's lightness until it clears `target` against the dark-mode
 * background, returning it unchanged if it already does.
 *
 * We step on measured luminance rather than clamping to a fixed lightness
 * because lightness is not hue-agnostic: a yellow and a blue at the same
 * lightness differ by several ratio points.
 */
export function ensureContrastOnDark(hsl: string, target: number = 4.5): string {
  const background = hslLuminance(DARK_BACKGROUND_HSL);
  const { h, s, l } = parseHSL(hsl);
  let lightness = l;

  for (;;) {
    const candidate = formatHSL({ h, s, l: lightness });
    if (contrastRatio(hslLuminance(candidate), background) >= target) return candidate;
    if (lightness >= MAX_LIGHTNESS) return candidate;
    lightness = Math.min(MAX_LIGHTNESS, lightness + LIGHTNESS_STEP);
  }
}
