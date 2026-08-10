# Dark by default + welcome-back greeting — design

**Date:** 2026-08-09
**Status:** Approved, ready for planning
**Target version:** 0.6.0 (minor — user-facing behavior change)

## Background

Two requests from NMTSA:

1. Make dark mode the default for everyone. Many families and clients use the
   portal late at night, and several have vision conditions where a dark
   background is easier to read. They should still be able to switch to light.
2. Show a "Welcome back, Jen" notification when someone reaches their portal,
   so users who are tentative about technology get positive confirmation that
   their sign-in worked.

Delivering (1) responsibly surfaces a third item: the dark palette has a
contrast failure that today only reaches users who opt into dark mode, and
which defaulting to dark would hand to everyone — including the vision-impaired
users the request exists to serve. That fix is in scope.

## Current state

- Theme is `next-themes` v0.4.6, mounted in `src/main.tsx` with
  `defaultTheme="system" enableSystem`.
- `ThemeToggle` (`src/components/ThemeToggle.tsx`) flips light↔dark and is
  mounted in both `ClientHeader` and `AdminHeader`.
- Dark palettes already exist in `src/index.css` — the shared shadcn tokens
  under `.dark`, plus a separate `--client-*` teal palette for the client
  portal. No new visual design is required.
- `src/pages/client/HomePage.tsx:38` already renders a static
  `Welcome back, {firstName}!` `<h1>`, and `ClientHeader` shows
  `Hi, {firstName}!`. The words exist; a persistent heading reads as page
  furniture rather than as the system responding to the sign-in.
- `sonner` is already wired: `Toaster` is mounted in `src/main.tsx:45` and
  `toast` is used across ~10 components.
- `BrandColorProvider` (`src/components/ThemeProvider.tsx`) overwrites
  `--primary` and `--ring` with the admin's configured brand color as an
  **inline style on `documentElement`**, which outranks any class-based rule.
  `index.html` caches that color and re-applies it pre-paint.

## Feature 1 — Dark as the default theme

### Behavior

Dark becomes the default for every browser with no saved theme preference.
Anyone who has deliberately tapped the toggle to light keeps light. No user's
explicit choice is overridden, and there is no migration or one-time reset.

This works because of how next-themes persists state (verified by reading
`node_modules/next-themes/dist/index.js`): `setTheme` writes to
`localStorage.theme`, but the *default* value is never persisted. Users who
have never touched the toggle therefore have no stored key and fall through to
whatever `defaultTheme` says.

### Changes

**`src/main.tsx`** — change `defaultTheme="system"` to `defaultTheme="dark"`.
Leave `enableSystem` as-is: nothing in the UI sets the `"system"` value, and
keeping the flag preserves correct resolution for any browser that already has
`"system"` stored.

**`index.html`** — add an inline pre-paint script in `<head>`, beside the
existing brand-color script, that applies the resolved theme class before first
paint:

```js
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
```

This is required, not optional polish. This app is a client-rendered Vite SPA,
not Next.js, so the anti-flash script that next-themes renders from inside its
provider does not execute until React mounts. `body` is `@apply bg-background`,
which is white until `.dark` lands on `<html>`. Without the guard, defaulting to
dark produces a white flash on every cold load — precisely the experience this
change is meant to prevent for light-sensitive users.

The script's resolution logic must mirror next-themes' internal `I()` function
exactly (same storage key `theme`, same `defaultTheme`, same system fallback).
If it resolves differently, next-themes corrects it milliseconds later and the
result is a worse flash than doing nothing. The `defaultTheme` value is
duplicated between `main.tsx` and this script; the script carries a comment
pointing at `main.tsx` so the two stay in sync.

## Feature 2 — Welcome-back greeting

### Behavior

A toast reading "Welcome back, Jen!" appears once per browser session, for both
client-portal users and staff. It fires on a fresh sign-in and again whenever
someone returns to the portal in a new session. It does not re-fire when
navigating between pages or refreshing within a visit.

The existing static `<h1>` on `HomePage` stays. It is the focus target that
`ClientLayout` moves keyboard focus to on route change, and removing it would
regress that. The toast and the heading do different jobs: the heading orients,
the toast confirms.

### Changes

**New `src/lib/greeting.ts`** — a pure function, unit-testable in the default
node environment:

```ts
export interface Greeting {
  title: string;
  description?: string;
}

export function buildGreeting(firstName?: string): Greeting;
```

It must handle a missing or empty `firstName` — the portal has users whose
profile has no first name set, and "Welcome back, there!" is not acceptable
output.

**New `src/lib/useWelcomeGreeting.ts`** — a thin hook:

```ts
export function useWelcomeGreeting(
  profile: { userId: string; firstName?: string } | null | undefined
): void;
```

It no-ops while `profile` is null or undefined. Once a profile is present it
checks `sessionStorage` for `welcomeGreeted:<userId>`; if absent, it sets the
key and calls `toast.success(...)` with the result of `buildGreeting`.

Two properties of that key matter. **Session-scoped** storage clears when the
tab closes, which is what produces "once per arrival" rather than "once ever"
or "on every refresh". **Keyed by user ID** means a shared family device that
signs out and signs in as someone else greets the second person correctly,
without coupling this feature into `SignOutButton`.

**`src/App.tsx`** — call `useWelcomeGreeting(userProfile)` near the top of the
component, next to the existing `userProfile` query.

`App.tsx` is the correct call site because it is the single point above the
admin/client fork at `App.tsx:167`, so one call covers staff and families both
— the admin dashboard currently has no greeting at all. It must be called
unconditionally at the top, because `App` has six early returns below it for
the loading, setup-wizard, unauthenticated, profile-loading, join-request, and
role-selection states.

`getCurrentUserProfile` spreads the profile document, so `userId` is available
on the query result with no backend change.

### Accessibility

`toast.success` renders into sonner's `role="status"` live region, which is
polite. `ClientLayout`'s focus move to the `<h1>` is likewise non-interrupting,
so the two queue rather than collide for screen-reader users. Toast duration is
set to 5000ms rather than the 4000ms default, giving users who read slowly time
to register it before it dismisses.

## Feature 3 — Dark-mode contrast fix

### The problem

`--primary` is defined identically in `:root` and `.dark`
(`src/index.css:14` and `:47`): `238 70% 56%`, an indigo. Measured against the
dark background `0 0% 9%`:

| Pairing | Ratio | Required | Result |
| --- | --- | --- | --- |
| `text-primary` on dark background | 2.66:1 | 4.5:1 | **fails** |
| `--ring` focus indicator on dark background | 2.66:1 | 3:1 | **fails** |
| white on `bg-primary` (button label) | 6.75:1 | 4.5:1 | passes |

That token is used as a foreground or border color in 111 places across
`src/`, including `SignInForm.tsx:410` and `:436` — the "forgot password" and
sign-up links **on the sign-in screen itself**, which is the first thing every
user meets.

The client portal's own teal palette was measured separately and is fine:
`client-primary` on `client-surface` is 9.44:1, body text 16.32:1, secondary
text 6.97:1 on surface and 5.78:1 on cards. No changes there.

### The fix

A single token cannot satisfy both jobs at AA. At 68% lightness `text-primary`
reaches 4.77:1 against the background, but white button labels on that same
indigo fall to 3.76:1. The two requirements pull in opposite directions.

The resolution is to flip the pairing in dark mode rather than add a token — a
light accent carrying dark text, which is standard dark-mode practice:

**`src/index.css`**, inside `.dark` only:

```css
--primary: 238 70% 68%;
--primary-foreground: 0 0% 9%;
--ring: 238 70% 68%;
```

Both readings then measure 4.77:1, and no component markup changes.

### Making the brand color theme-aware

The CSS fix alone is defeated by `BrandColorProvider`, which writes the admin's
configured brand color to `--primary` as an inline style that outranks the
class rule. Left alone, a staff member choosing a dark navy brand color makes
accent text unreadable for every user in the new default theme.

**New `src/lib/color.ts`** — `hexToHSL` moves here from `ThemeProvider.tsx`
(it is now needed in two places and needs test coverage), joined by:

```ts
export function hslLuminance(hsl: string): number;
export function contrastRatio(a: number, b: number): number;
export function ensureContrastOnDark(hsl: string, target?: number): string;
```

`ensureContrastOnDark` raises the lightness component in 2% steps, up to a 95%
ceiling, until the color clears `target` (default 4.5) against the dark
background, then returns the adjusted HSL string. Stepping on measured
luminance rather than clamping lightness to a fixed number is necessary because
a fixed lightness is not hue-agnostic — a yellow and a blue at the same
lightness differ by several ratio points.

**`src/components/ThemeProvider.tsx`** — `BrandColorProvider` reads
`resolvedTheme` from `useTheme()`. In dark mode it writes
`ensureContrastOnDark(brandHSL)` to both `--primary` and `--ring`, and sets
`--primary-foreground` to `0 0% 9%`; in light mode it keeps today's behavior
with a white foreground. The effect re-runs when `resolvedTheme` changes, so
toggling themes re-derives the color. Note that `--ring` must receive the
adjusted value too — it is currently set alongside `--primary` at
`ThemeProvider.tsx:74`, and leaving it on the raw brand color would reintroduce
the focus-indicator failure the CSS change fixes.

**`index.html`** — the cached-brand-color script applies its value only when
the resolved theme is light. In dark mode it leaves the accessible CSS token in
place until React computes the adjusted brand color. The brief window affects
only dark-mode users on a site with a custom brand color, and it errs toward
the accessible value rather than away from it.

## Testing

Following the repo's existing split — pure logic in `src/lib/*.test.ts` under
node, component and hook behavior in `*.test.tsx` under happy-dom.

- **`src/lib/color.test.ts`** — `ensureContrastOnDark` returns a color clearing
  4.5:1 for a spread of input hues including dark navy, near-black, and colors
  that already pass (which must be returned unchanged); the 95% ceiling
  terminates rather than looping.
- **`src/lib/greeting.test.ts`** — `buildGreeting` with a normal name, with
  `undefined`, and with an empty string.
- **`src/lib/useWelcomeGreeting.test.tsx`** — fires once on first render with a
  profile; does not fire on re-render; does not fire while profile is null;
  fires again for a different `userId`.
- **Manual verification** — hard-reload with `localStorage` cleared and confirm
  no white flash; confirm a stored `light` preference survives the change; read
  the sign-in screen links in dark mode.

## Out of scope

- Any change to the client portal's `--client-*` teal palette (measured
  compliant).
- Removing or rewording the existing `HomePage` `<h1>`.
- Server-side per-user theme persistence. Theme stays per-browser in
  `localStorage`; a Convex-backed preference is a larger change and was not
  requested.
- A one-time "we switched to dark mode" announcement toast — considered and
  declined, to avoid competing with the welcome greeting.
- Auditing light-mode contrast, which this change does not affect.

## Release

Per the versioning policy in `CLAUDE.md`: bump `package.json` to **0.6.0**
(minor — user-facing behavior change) and add a matching `CHANGELOG.md` entry
dated 2026-08-09, in the same commit as the change.
