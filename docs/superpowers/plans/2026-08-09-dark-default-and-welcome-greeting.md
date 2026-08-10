# Dark by Default + Welcome Greeting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make dark mode the default theme for all users who have not chosen one, greet users by name when they arrive at their portal, and fix the dark-mode contrast failure that defaulting to dark would otherwise expose to everyone.

**Architecture:** Three independent slices sharing one release. Colour math is extracted into pure, unit-tested functions in `src/lib/` so that both the static CSS palette and the runtime admin brand-colour override can be verified against WCAG ratios. The theme default is a one-word change to the `next-themes` provider plus a pre-paint script in `index.html` that prevents a white flash. The greeting is a pure message builder plus a thin hook, called once from `src/App.tsx` above the admin/client fork so staff and families both get it.

**Tech Stack:** React 19 + Vite, TypeScript, Tailwind + shadcn CSS variables, `next-themes` 0.4.6, `sonner` toasts, Convex backend, Vitest (node for `src/lib/*.test.ts`, happy-dom for `*.test.tsx`), `@testing-library/react` 16.3.2.

**Design doc:** `docs/superpowers/specs/2026-08-09-dark-default-and-welcome-greeting-design.md`

## Global Constraints

- **Versioning (required by `CLAUDE.md`):** bump `package.json` `version` to `0.6.0` and add a matching `CHANGELOG.md` entry dated `2026-08-09`, both in the final commit. One bump for the whole set — do not bump per task.
- **Commits:** never add `Co-Authored-By` lines to commit messages.
- **Accessibility:** WCAG 2.2 AA is a core organisational tenet. Text contrast target is **4.5:1**; non-text/focus-indicator target is **3:1**.
- **Dark background reference value:** `0 0% 9%` (the `--background` token under `.dark` in `src/index.css`).
- **Theme storage key:** `theme` (the `next-themes` default — do not change it).
- **Theme default value:** `dark`. This value appears in **two** places that must stay in sync: `defaultTheme` in `src/main.tsx` and the inline script in `index.html`.
- **Test commands:** `npm test` runs the full Vitest suite. Typecheck/build is `npx tsc -p convex --noEmit && npx tsc -p . --noEmit && npx vite build`.
- **Path alias:** `@/` resolves to `src/` (see `vite.config.ts`).

---

### Task 1: Colour contrast utilities

Pure WCAG maths, extracted so both the static palette (Task 2) and the runtime brand-colour override (Task 3) can be checked against real ratios. `hexToHSL` moves here out of `ThemeProvider.tsx` because it is now needed in two places and needs test coverage.

**Files:**
- Create: `src/lib/color.ts`
- Create: `src/lib/color.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `hexToHSL(hex: string): string` — returns `"h s% l%"`
  - `hslLuminance(hsl: string): number` — WCAG relative luminance, 0–1
  - `contrastRatio(a: number, b: number): number` — takes two luminances
  - `ensureContrastOnDark(hsl: string, target?: number): string`
  - `DARK_BACKGROUND_HSL: string` — `"0 0% 9%"`

- [ ] **Step 1: Write the failing test**

Create `src/lib/color.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/color.test.ts`
Expected: FAIL — `Failed to resolve import "./color"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/color.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/color.test.ts`
Expected: PASS — 9 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/color.ts src/lib/color.test.ts
git commit -m "feat(a11y): add WCAG contrast utilities for theme colours"
```

---

### Task 2: Fix the dark palette tokens

`--primary` is currently identical in light and dark (`src/index.css:14` and `:47`). As a *foreground* colour on the dark background it measures 2.66:1 against a 4.5:1 requirement, and it is used as text or border in 111 places — including the sign-in screen's links.

One token cannot serve both jobs at AA: at 68% lightness `text-primary` reaches 4.77:1, but white button labels on that indigo fall to 3.76:1. The fix flips the pairing in dark mode only — a light accent carrying dark text — so both readings land at 4.77:1 with no component changes.

The test reads the real stylesheet, so it guards the palette against future regressions rather than just asserting today's numbers.

**Files:**
- Modify: `src/index.css:41-69` (the `.dark` block)
- Create: `src/lib/darkPalette.test.ts`

**Interfaces:**
- Consumes: `contrastRatio`, `hslLuminance` from `src/lib/color.ts` (Task 1).
- Produces: no code exports. Establishes that `.dark` `--primary` is `238 70% 68%` and `--primary-foreground` is `0 0% 9%`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/darkPalette.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { contrastRatio, hslLuminance } from "./color";

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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/darkPalette.test.ts`
Expected: FAIL — three failures. `primary` on `background` is `2.66`, `ring` on `background` is `2.66`, and `primary-foreground` on `primary` is `6.75` (that one passes today). The two 2.66 assertions are the ones that must fail.

- [ ] **Step 3: Update the dark tokens**

In `src/index.css`, inside the `.dark` block only, change these three declarations:

```css
    --primary: 238 70% 68%;
    --primary-foreground: 0 0% 9%;
    --ring: 238 70% 68%;
```

Leave the `:root` (light) block completely untouched, and leave every `--client-*` token untouched — the client portal's teal palette already measures 9.44:1 for accents and 16.32:1 for body text.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/darkPalette.test.ts`
Expected: PASS — 6 tests passing.

- [ ] **Step 5: Confirm no other suite regressed**

Run: `npm test`
Expected: PASS — the whole suite green.

- [ ] **Step 6: Commit**

```bash
git add src/index.css src/lib/darkPalette.test.ts
git commit -m "fix(a11y): make dark-mode primary readable as text and focus ring"
```

---

### Task 3: Make the admin brand colour theme-aware

`BrandColorProvider` writes the admin's configured brand colour to `--primary` and `--ring` as an **inline style on `documentElement`**, which outranks the class-based rule from Task 2. Left alone, an admin choosing a dark navy makes accent text unreadable for every user in the new default theme.

The decision logic goes in a pure function so it can be tested in node without mounting React or Convex.

**Files:**
- Create: `src/lib/brandTheme.ts`
- Create: `src/lib/brandTheme.test.ts`
- Modify: `src/components/ThemeProvider.tsx` (whole file — remove the local `hexToHSL`, remove the unused `lightenHSL`, rewrite the effect)

**Interfaces:**
- Consumes: `hexToHSL`, `ensureContrastOnDark` from `src/lib/color.ts` (Task 1).
- Produces:
  - `interface BrandTokens { primary: string; ring: string; primaryForeground: string; primaryHex: string }`
  - `resolveBrandTokens(hex: string, isDark: boolean): BrandTokens`
  - `BrandColorProvider` keeps its existing props (`{ children: React.ReactNode }`) and its existing import path.

- [ ] **Step 1: Write the failing test**

Create `src/lib/brandTheme.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { resolveBrandTokens } from "./brandTheme";
import { DARK_BACKGROUND_HSL, contrastRatio, hexToHSL, hslLuminance } from "./color";

function ratioOnDark(hsl: string): number {
  return contrastRatio(hslLuminance(hsl), hslLuminance(DARK_BACKGROUND_HSL));
}

describe("resolveBrandTokens", () => {
  it("uses the brand colour as-is in light mode, with white foreground", () => {
    const tokens = resolveBrandTokens("#4f46e5", false);
    expect(tokens.primary).toBe(hexToHSL("#4f46e5"));
    expect(tokens.ring).toBe(tokens.primary);
    expect(tokens.primaryForeground).toBe("0 0% 100%");
  });

  it("lightens a dark brand colour in dark mode until it is readable", () => {
    const tokens = resolveBrandTokens("#1e3a8a", true);
    expect(ratioOnDark(tokens.primary)).toBeGreaterThanOrEqual(4.5);
  });

  it("pairs the dark-mode brand colour with a dark foreground", () => {
    const tokens = resolveBrandTokens("#1e3a8a", true);
    expect(tokens.primaryForeground).toBe("0 0% 9%");
    expect(
      contrastRatio(hslLuminance(tokens.primaryForeground), hslLuminance(tokens.primary))
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("applies the same adjusted value to the focus ring", () => {
    const tokens = resolveBrandTokens("#1e3a8a", true);
    expect(tokens.ring).toBe(tokens.primary);
  });

  it("always passes the raw hex through untouched", () => {
    expect(resolveBrandTokens("#1e3a8a", true).primaryHex).toBe("#1e3a8a");
    expect(resolveBrandTokens("#1e3a8a", false).primaryHex).toBe("#1e3a8a");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/brandTheme.test.ts`
Expected: FAIL — `Failed to resolve import "./brandTheme"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/brandTheme.ts`:

```ts
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

/**
 * Derives the primary-colour CSS variables from the admin's configured brand
 * colour.
 *
 * In dark mode the brand colour is lightened until it is readable as text on
 * the dark background, and paired with a dark foreground so button labels stay
 * readable on the fill. Without this, an admin picking a dark brand colour
 * would make accent text unreadable for every user.
 */
export function resolveBrandTokens(hex: string, isDark: boolean): BrandTokens {
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/brandTheme.test.ts`
Expected: PASS — 5 tests passing.

- [ ] **Step 5: Confirm `lightenHSL` really is dead before deleting it**

Run: `grep -rn "lightenHSL" src convex`
Expected: exactly one hit, the definition at `src/components/ThemeProvider.tsx:52`. If there are other hits, stop and reassess rather than deleting it.

- [ ] **Step 6: Rewrite ThemeProvider to use the shared helpers**

Replace the entire contents of `src/components/ThemeProvider.tsx` with:

```tsx
import { useEffect } from "react";
import { useQuery } from "convex/react";
import { useTheme } from "next-themes";
import { api } from "../../convex/_generated/api";
import { resolveBrandTokens } from "@/lib/brandTheme";

interface BrandColorProviderProps {
  children: React.ReactNode;
}

/**
 * Applies the admin's configured brand colour to the primary CSS variables.
 *
 * Re-runs on theme change: the dark palette needs a lighter, dark-on-light
 * variant of the brand colour to stay readable (see src/lib/brandTheme.ts).
 */
export function BrandColorProvider({ children }: BrandColorProviderProps) {
  const siteSettings = useQuery(api.siteSettings.getSiteSettings);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!siteSettings?.primaryColor) return;

    const tokens = resolveBrandTokens(siteSettings.primaryColor, resolvedTheme === "dark");
    const root = document.documentElement;
    root.style.setProperty("--primary", tokens.primary);
    root.style.setProperty("--ring", tokens.ring);
    root.style.setProperty("--primary-foreground", tokens.primaryForeground);
    root.style.setProperty("--primary-hex", tokens.primaryHex);

    // Cached so index.html can apply it before first paint on the next load.
    localStorage.setItem("theme-primary-color", siteSettings.primaryColor);
  }, [siteSettings?.primaryColor, resolvedTheme]);

  return <>{children}</>;
}
```

- [ ] **Step 7: Typecheck and run the full suite**

Run: `npx tsc -p . --noEmit && npm test`
Expected: PASS — no type errors, whole suite green.

- [ ] **Step 8: Commit**

```bash
git add src/lib/brandTheme.ts src/lib/brandTheme.test.ts src/components/ThemeProvider.tsx
git commit -m "fix(a11y): keep the admin brand colour readable in dark mode"
```

---

### Task 4: Default the theme to dark

Dark becomes the default for every browser with no saved preference. Anyone who deliberately tapped the toggle to light keeps light, because `next-themes` writes `localStorage.theme` only when `setTheme` runs — the default itself is never persisted. No migration, no reset.

The pre-paint script is not optional polish. This is a client-rendered Vite SPA, so the anti-flash script that `next-themes` renders from inside its provider does not run until React mounts; `body` is `@apply bg-background`, which is white until `.dark` lands on `<html>`. Without the guard, dark-by-default produces a white flash on every cold load — exactly what this change exists to prevent.

**Files:**
- Modify: `src/main.tsx:30`
- Modify: `index.html:12-38`
- Create: `src/lib/themeDefault.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: no code exports. Establishes `dark` as the default in both files.

- [ ] **Step 1: Write the failing test**

The inline script cannot be imported, so the test guards the documented duplication instead: it reads both files and asserts they agree on the default.

Create `src/lib/themeDefault.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

function read(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

describe("theme default", () => {
  it("defaults the next-themes provider to dark", () => {
    expect(read("../main.tsx")).toContain('defaultTheme="dark"');
  });

  it("applies the theme class before first paint to avoid a white flash", () => {
    const html = read("../../index.html");
    expect(html).toContain("localStorage.getItem('theme')");
    expect(html).toContain("classList.add('dark')");
  });

  it("uses the same default in the pre-paint script as in the provider", () => {
    // These two must agree; a mismatch makes next-themes correct the class
    // after mount, which is a worse flash than none.
    expect(read("../../index.html")).toContain("localStorage.getItem('theme') || 'dark'");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/themeDefault.test.ts`
Expected: FAIL — all three assertions fail (`main.tsx` still says `defaultTheme="system"`, and `index.html` has no theme script).

- [ ] **Step 3: Change the provider default**

In `src/main.tsx:30`, change:

```tsx
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
```

to:

```tsx
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem>
```

Leave `enableSystem` in place. Nothing in the UI sets the `"system"` value, and keeping the flag preserves correct resolution for any browser that already has `"system"` stored.

- [ ] **Step 4: Add the pre-paint theme script**

In `index.html`, insert this block immediately **before** the existing `<!-- Apply cached theme color immediately to prevent flash -->` comment:

```html
    <!--
      Apply the resolved theme before first paint. This mirrors next-themes'
      own resolution logic (storage key "theme"); it must stay in sync with
      defaultTheme in src/main.tsx, or next-themes will correct the class
      after mount and the flash gets worse rather than better.
    -->
    <script>
      (function () {
        try {
          var stored = localStorage.getItem('theme') || 'dark';
          var resolved = stored === 'system'
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : stored;
          if (resolved === 'dark') document.documentElement.classList.add('dark');
          document.documentElement.style.colorScheme = resolved;
        } catch (e) {}
      })();
    </script>
```

- [ ] **Step 5: Gate the cached brand colour on light mode**

The cached brand colour is the *unadjusted* value, so replaying it in dark mode would undo Task 3 for the first frame. In `index.html`, in the existing brand-colour script, change:

```js
        var cached = localStorage.getItem('theme-primary-color');
        if (cached) {
```

to:

```js
        var cached = localStorage.getItem('theme-primary-color');
        // Skip in dark mode: the cached value is the unadjusted light-mode
        // colour. BrandColorProvider computes the readable dark variant once
        // React mounts; until then the accessible CSS token stands.
        if (cached && !document.documentElement.classList.contains('dark')) {
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/lib/themeDefault.test.ts`
Expected: PASS — 3 tests passing.

- [ ] **Step 7: Verify in a real browser**

Run: `npm run dev:frontend`

Then check all four by hand:
1. In DevTools console run `localStorage.removeItem('theme')`, then hard-reload. Expected: the page loads dark with **no white flash**.
2. Click the sun/moon toggle to light, then hard-reload. Expected: it stays light with no dark flash.
3. In the console run `localStorage.setItem('theme','light')`, reload, and confirm light survives — this is the existing-user case.
4. Sign out to reach the sign-in screen in dark mode and confirm the "Forgot password?" and sign-up links are comfortably readable (this is the Task 2 fix in situ).

- [ ] **Step 8: Commit**

```bash
git add src/main.tsx index.html src/lib/themeDefault.test.ts
git commit -m "feat(theme): default to dark mode with a pre-paint flash guard"
```

---

### Task 5: Greeting message builder

A pure function, split out from the hook so the wording is testable without React and easy to revise later.

Note on the empty-name case: `userProfiles.firstName` is `v.string()` in `convex/schema.ts:36`, so it is always present but **can be an empty string**. `HomePage` currently falls back to `"there"`, which is acceptable as a heading but produces "Welcome back, there!" as a toast — worse than no name at all. This builder drops the name entirely instead.

**Files:**
- Create: `src/lib/greeting.ts`
- Create: `src/lib/greeting.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface Greeting { title: string; description?: string }`
  - `buildGreeting(firstName?: string): Greeting`

- [ ] **Step 1: Write the failing test**

Create `src/lib/greeting.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildGreeting } from "./greeting";

describe("buildGreeting", () => {
  it("greets the user by first name", () => {
    expect(buildGreeting("Jen").title).toBe("Welcome back, Jen!");
  });

  it("drops the name rather than saying 'Welcome back, there!'", () => {
    expect(buildGreeting("").title).toBe("Welcome back!");
    expect(buildGreeting(undefined).title).toBe("Welcome back!");
  });

  it("treats a whitespace-only name as no name", () => {
    expect(buildGreeting("   ").title).toBe("Welcome back!");
  });

  it("trims surrounding whitespace from a real name", () => {
    expect(buildGreeting("  Jen  ").title).toBe("Welcome back, Jen!");
  });

  it("confirms the sign-in succeeded in the description", () => {
    expect(buildGreeting("Jen").description).toBe("You're signed in.");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/greeting.test.ts`
Expected: FAIL — `Failed to resolve import "./greeting"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/greeting.ts`:

```ts
export interface Greeting {
  title: string;
  description?: string;
}

/**
 * Builds the arrival greeting shown as a toast when a user reaches the portal.
 *
 * The audience includes users who are tentative about technology, so the
 * description explicitly confirms the sign-in worked rather than leaving them
 * to infer it.
 */
export function buildGreeting(firstName?: string): Greeting {
  const name = firstName?.trim();

  return {
    title: name ? `Welcome back, ${name}!` : "Welcome back!",
    description: "You're signed in.",
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/greeting.test.ts`
Expected: PASS — 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/greeting.ts src/lib/greeting.test.ts
git commit -m "feat(portal): add the welcome-back greeting message builder"
```

---

### Task 6: Fire the greeting on arrival

The hook fires a toast once per browser session per user. Session-scoped storage clears when the tab closes, which is what produces "once per arrival" rather than "once ever" or "on every refresh". Keying on user ID means a shared family device that switches accounts greets the second person correctly, without coupling this feature into `SignOutButton`.

**Files:**
- Create: `src/lib/useWelcomeGreeting.ts`
- Create: `src/lib/useWelcomeGreeting.test.tsx`
- Modify: `src/App.tsx` (add import, add one call after the existing queries around line 30)

**Interfaces:**
- Consumes: `buildGreeting` from `src/lib/greeting.ts` (Task 5).
- Produces:
  - `interface GreetableProfile { userId: string; firstName?: string }`
  - `useWelcomeGreeting(profile: GreetableProfile | null | undefined): void`

- [ ] **Step 1: Write the failing test**

The `.test.tsx` extension matters — `vite.config.ts` maps `src/**/*.test.tsx` to happy-dom, and this test needs `sessionStorage` and a React renderer.

Create `src/lib/useWelcomeGreeting.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useWelcomeGreeting } from "./useWelcomeGreeting";

const success = vi.fn();
vi.mock("sonner", () => ({
  toast: { success: (...args: unknown[]) => success(...args) },
}));

describe("useWelcomeGreeting", () => {
  beforeEach(() => {
    success.mockClear();
    sessionStorage.clear();
  });

  it("greets the user by name on arrival", () => {
    renderHook(() => useWelcomeGreeting({ userId: "u1", firstName: "Jen" }));

    expect(success).toHaveBeenCalledTimes(1);
    expect(success.mock.calls[0][0]).toBe("Welcome back, Jen!");
  });

  it("does not greet again on re-render within the same session", () => {
    const { rerender } = renderHook(() =>
      useWelcomeGreeting({ userId: "u1", firstName: "Jen" })
    );
    rerender();
    rerender();

    expect(success).toHaveBeenCalledTimes(1);
  });

  it("stays silent while the profile is still loading", () => {
    renderHook(() => useWelcomeGreeting(undefined));
    expect(success).not.toHaveBeenCalled();

    renderHook(() => useWelcomeGreeting(null));
    expect(success).not.toHaveBeenCalled();
  });

  it("greets a different user on a shared device", () => {
    renderHook(() => useWelcomeGreeting({ userId: "u1", firstName: "Jen" }));
    renderHook(() => useWelcomeGreeting({ userId: "u2", firstName: "Sam" }));

    expect(success).toHaveBeenCalledTimes(2);
    expect(success.mock.calls[1][0]).toBe("Welcome back, Sam!");
  });

  it("gives the toast extra time for users who read slowly", () => {
    renderHook(() => useWelcomeGreeting({ userId: "u1", firstName: "Jen" }));

    expect(success.mock.calls[0][1]).toMatchObject({
      description: "You're signed in.",
      duration: 5000,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/useWelcomeGreeting.test.tsx`
Expected: FAIL — `Failed to resolve import "./useWelcomeGreeting"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/useWelcomeGreeting.ts`:

```ts
import { useEffect } from "react";
import { toast } from "sonner";
import { buildGreeting } from "./greeting";

/** Longer than sonner's 4s default, to give slower readers time to register it. */
const GREETING_DURATION_MS = 5000;

export interface GreetableProfile {
  userId: string;
  firstName?: string;
}

/**
 * Shows a "Welcome back" toast once per browser session, per user.
 *
 * Session-scoped storage is what makes this fire on every arrival but not on
 * navigation or refresh. Keying on user id means a shared family device that
 * switches accounts greets the second person too.
 *
 * Safe to call before the profile has loaded — it no-ops until one is present.
 */
export function useWelcomeGreeting(profile: GreetableProfile | null | undefined): void {
  useEffect(() => {
    if (!profile) return;

    const key = `welcomeGreeted:${profile.userId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Storage blocked (private browsing, locked-down device). Skip the
      // greeting rather than risk repeating it on every render.
      return;
    }

    const { title, description } = buildGreeting(profile.firstName);
    toast.success(title, { description, duration: GREETING_DURATION_MS });
  }, [profile?.userId, profile?.firstName]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/useWelcomeGreeting.test.tsx`
Expected: PASS — 5 tests passing.

- [ ] **Step 5: Wire it into App.tsx**

`src/App.tsx` is the right call site because it sits above the admin/client fork at `App.tsx:167`, so one call covers staff and families both — the admin dashboard has no greeting at all today. It must be called unconditionally near the top, because `App` has six early returns below it (loading, setup wizard, unauthenticated, profile loading, join request, role selection).

Add the import alongside the other `@/lib` imports:

```tsx
import { useWelcomeGreeting } from "@/lib/useWelcomeGreeting";
```

Then, immediately after the `siteSettings` query (currently `src/App.tsx:31`), add:

```tsx
  // Confirms arrival for users who are unsure their sign-in worked. Fires once
  // per browser session; no-ops until the profile resolves.
  useWelcomeGreeting(userProfile);
```

- [ ] **Step 6: Typecheck and run the full suite**

Run: `npx tsc -p . --noEmit && npm test`
Expected: PASS — no type errors, whole suite green.

- [ ] **Step 7: Verify in a real browser**

Run: `npm run dev` and sign in as a client user.

Expected: a toast reading "Welcome back, <name>!" with "You're signed in." appears on arrival. Navigate between Home/Browse/Shop — it must **not** re-fire. Reload the page — it must **not** re-fire. Close the tab, open a new one, and sign in — it **must** fire again. Repeat once as an admin user to confirm staff get it too.

- [ ] **Step 8: Commit**

```bash
git add src/lib/useWelcomeGreeting.ts src/lib/useWelcomeGreeting.test.tsx src/App.tsx
git commit -m "feat(portal): greet users by name when they arrive"
```

---

### Task 7: Release 0.6.0

Per the versioning policy in `CLAUDE.md`, every push to `main` bumps the version and records it. Minor, because this is a user-facing behaviour change.

**Files:**
- Modify: `package.json` (the `version` field, currently `0.5.0`)
- Modify: `CHANGELOG.md` (new entry at the top, below the intro paragraph)

**Interfaces:**
- Consumes: everything from Tasks 1–6.
- Produces: nothing.

- [ ] **Step 1: Run the full verification suite**

Run: `npx tsc -p convex --noEmit && npx tsc -p . --noEmit && npx vite build && npm test`
Expected: PASS on all four. Do not proceed to the bump on any failure.

- [ ] **Step 2: Bump the version**

In `package.json`, change `"version": "0.5.0"` to `"version": "0.6.0"`.

- [ ] **Step 3: Add the changelog entry**

In `CHANGELOG.md`, insert directly above the `## 0.5.0 — 2026-06-26` heading:

```markdown
## 0.6.0 — 2026-08-09

- New: dark mode is now the default. Anyone who has previously chosen light
  keeps light, and the sun/moon toggle in the header still switches at any
  time. A pre-paint script applies the theme before the first frame, so there
  is no white flash on load.
- New: a "Welcome back, <name>!" notification when you reach your portal,
  confirming your sign-in worked. It appears once per visit for clients and
  staff alike, and does not repeat as you move between pages.
- Fix: dark-mode accent colour is now readable. The primary colour was
  unchanged between light and dark and measured 2.66:1 as text on the dark
  background, against the 4.5:1 WCAG AA requirement — affecting 111 usages
  including the sign-in screen's links. It now measures 4.77:1, and an admin's
  configured brand colour is automatically adjusted for dark mode so a dark
  brand colour cannot make accent text unreadable.
```

- [ ] **Step 4: Verify the version landed**

Run: `node -e "console.log(require('./package.json').version)"`
Expected: `0.6.0`

- [ ] **Step 5: Commit**

```bash
git add package.json CHANGELOG.md
git commit -m "chore: release v0.6.0 — dark by default, welcome greeting, dark contrast fix"
```

---

## Self-Review

**Spec coverage**

| Spec section | Task |
| --- | --- |
| Feature 1 — `main.tsx` default | Task 4, Step 3 |
| Feature 1 — `index.html` pre-paint script | Task 4, Step 4 |
| Feature 2 — `src/lib/greeting.ts` | Task 5 |
| Feature 2 — `src/lib/useWelcomeGreeting.ts` | Task 6, Steps 1–4 |
| Feature 2 — `App.tsx` wiring | Task 6, Step 5 |
| Feature 2 — toast duration 5000ms | Task 6, Step 3 (asserted in Step 1) |
| Feature 3 — `.dark` token change | Task 2, Step 3 |
| Feature 3 — `src/lib/color.ts` | Task 1 |
| Feature 3 — theme-aware `BrandColorProvider` incl. `--ring` | Task 3, Steps 3 and 6 |
| Feature 3 — `index.html` brand script gated on light | Task 4, Step 5 |
| Testing — `color.test.ts` | Task 1, Step 1 |
| Testing — `greeting.test.ts` | Task 5, Step 1 |
| Testing — `useWelcomeGreeting.test.tsx` | Task 6, Step 1 |
| Testing — manual flash/preference/sign-in checks | Task 4, Step 7 |
| Release — 0.6.0 + changelog | Task 7 |

Two additions beyond the spec, both guarding documented risks rather than adding scope: `darkPalette.test.ts` (Task 2) parses the real stylesheet so the AA ratios cannot silently regress, and `themeDefault.test.ts` (Task 4) asserts that `main.tsx` and `index.html` agree on the default, which the spec calls out as a sync hazard.

**Placeholder scan:** no TBD/TODO markers; every code step carries complete code; every command has an expected result. Task 3 Step 5 is a verification gate before a deletion rather than an instruction to "check things look right".

**Type consistency:** `hexToHSL`, `hslLuminance`, `contrastRatio`, `ensureContrastOnDark`, and `DARK_BACKGROUND_HSL` are defined in Task 1 and used with matching signatures in Tasks 2 and 3. `BrandTokens` field names (`primary`, `ring`, `primaryForeground`, `primaryHex`) match between the Task 3 test, implementation, and `ThemeProvider` consumption. `Greeting` (`title`, `description`) is defined in Task 5 and destructured identically in Task 6. `GreetableProfile.userId` is `string`; Convex's `Id<"users">` is a branded string and assignable to it.
