# UI Refactoring Design Spec

## Overview

Modernize the NMTSA Education Platform UI for accessibility, mobile-friendliness, and a professional yet fun feel. The platform serves two distinct audiences: **adults** (admin side) and **mixed ages 5-17** (client side), so the design splits into two visual systems sharing a common component foundation.

## Audience & Constraints

- **Admin side**: Adults only (teachers, admins, content creators). Desktop-primary, mobile functional but not a priority.
- **Client side**: Mixed ages 5-17 plus parent/guardian adults. Must work equally well on phones, tablets, and desktops.
- **Content**: Mixed text articles and media (video, PDFs, worksheets).
- **Existing stack**: React 19, Tailwind CSS 3.4, shadcn/ui (Radix), Lucide React icons, Framer Motion.

## Design System

### Client-Side Color Palette (Fixed)

The client portal uses a fixed "Friendly Teal" palette — not affected by admin's dynamic theme setting. Hex values shown below for reference; CSS variables must use the existing HSL convention (`H S% L%` without `hsl()` wrapper) to remain compatible with `hsl(var(...))` usage in Tailwind config.

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--client-primary` | `#0d9488` (teal-600) | `#2dd4bf` (teal-300) | Primary actions, active nav, links |
| `--client-accent` | `#6366f1` (indigo-500) | `#818cf8` (indigo-400) | Secondary accent, category color |
| `--client-surface` | `#f8fffe` | `#0f172a` (slate-900) | Page background |
| `--client-card` | `#ffffff` | `#1e293b` (slate-800) | Card backgrounds |
| `--client-border` | `#e2e8f0` (slate-200) | `#334155` (slate-700) | Borders, dividers |
| `--client-text` | `#0f172a` (slate-900) | `#f1f5f9` (slate-100) | Primary text |
| `--client-text-secondary` | `#64748b` (slate-500) | `#94a3b8` (slate-400) | Secondary text |
| `--client-success` | `#22c55e` (green-500) | `#4ade80` (green-400) | Success states |
| `--client-warm` | `#f97316` (orange-500) | `#fb923c` (orange-400) | Warm accent, warnings |

Additional category gradient pairs for content cards:
- Teal: `#0d9488 → #06b6d4`
- Indigo: `#6366f1 → #8b5cf6`
- Amber: `#f59e0b → #f97316`
- Green: `#22c55e → #10b981`

### Admin-Side Theming (Dynamic)

Admin keeps the existing dynamic theme system — the site owner picks a brand color in settings, it applies to the admin UI. Default is indigo (`--primary: 238 70% 56%`, approximately `#4045dd`). Dark mode supported.

### Icon Treatment — Gradient Glow Combo

All icons use Lucide React (already installed). The treatment makes them feel energetic without being childish:

**Active bottom nav icon:**
- White filled icon inside a gradient pill (primary gradient)
- Subtle drop shadow: `box-shadow: 0 3px 8px rgba(primary, 0.35)`

**Inactive bottom nav icon:**
- Outline stroke in `text-secondary` color
- No background

**Content list icons (type indicators):**
- Bold stroke (`stroke-width: 2.5`) in the category color
- Background: gradient pastel (e.g., `teal-100 → teal-200`) with rounded corners (12px)
- Subtle colored shadow: `box-shadow: 0 2px 6px rgba(category-color, 0.15)`

**Admin sidebar icons:**
- Standard 2px stroke Lucide icons, no special treatment
- Active item gets tinted background matching admin brand color

### Typography

- **Font**: Inter Variable (already configured)
- **Client heading**: `text-lg` (18px) semibold for section headers
- **Client body**: `text-sm` (14px) for content, `text-xs` (12px) for metadata
- **Admin**: Same scale, no changes needed
- **Touch targets**: Minimum 44px on client side (WCAG 2.2 Target Size)

### Corner Radius

- Cards: `rounded-xl` (12px) on client, `rounded-lg` (8px) on admin
- Icon badges: `rounded-xl` (12px)
- Buttons: `rounded-lg` (8px)
- Bottom nav pills: `rounded-xl` (12px)

## Client-Side Layout

### Mobile (< 768px)

```
┌─────────────────────────┐
│ [Logo] Hi, Name!   [Av] │  ← Header with greeting
├─────────────────────────┤
│ [🔍 Search content...]  │  ← Sticky search bar
├─────────────────────────┤
│                         │
│  Section content        │  ← Scrollable main area
│  (varies by tab)        │
│                         │
├─────────────────────────┤
│ 🏠   🔍   🛒   •••    │  ← Fixed bottom nav
│ Home Browse Shop More   │
└─────────────────────────┘
```

**Bottom nav mapping (4 items):**
- **Home** (`House` icon): Welcome greeting, "Continue Learning" horizontal scroll cards, recent content list
- **Browse** (`Search` icon): All content + content groups (merged view)
- **Shop** (`ShoppingCart` icon): Purchaseable content
- **More** (`MoreHorizontal` icon): Opens a sheet/drawer with: Bundles, Orders, Shares, Requests, For You

### Desktop (≥ 768px)

```
┌──────────────────────────────────────────────────────┐
│ [Logo] NMTSA  [tabs: Home Browse Bundles ...]  [🔍] [Av]│
├──────────────────────────────────────────────────────┤
│                                                      │
│  Welcome back, Name!                                 │
│  Content grid (4 columns)                            │
│                                                      │
└──────────────────────────────────────────────────────┘
```

All 8 client features visible as icon+label tabs in the top nav bar. No "More" needed — there's space.

**Desktop tab labels:**
Home, Browse, Bundles, Shop, Orders, Shares, Requests, For You

### Client Route Paths

| Route | Page | Mobile Nav | Desktop Tab |
|-------|------|------------|-------------|
| `/` | Home (greeting, continue learning, recent) | Home | Home |
| `/browse` | All content + search/filter | Browse | Browse |
| `/bundles` | Content bundles — card grid of grouped content, reuses `ContentCard` | (via More) | Bundles |
| `/shop` | Purchaseable content | Shop | Shop |
| `/orders` | User's order history | (via More) | Orders |
| `/shares` | Share links the user has access to | (via More) | Shares |
| `/requests` | User's purchase requests (existing `purchaseRequests` tab) | (via More) | Requests |
| `/for-you` | Recommendations | (via More) | For You |
| `/view/:contentId` | Content viewer (existing route, kept as-is) | — | — |
| `/share/:accessToken` | Shared content viewer (existing, outside layout) | — | — |

**Standalone routes** (remain outside layout shells, unchanged): `/view/:contentId`, `/share/:accessToken`, `/verify-email`, `/checkout/success`, `/checkout/cancel`.

### Content Cards

Each content card shows:
- **Gradient header** with Lucide icon representing content type (FileText for articles, Play for video, Download for files)
- **Title** (semibold, 1-2 lines truncated)
- **Metadata** (type, duration/size)
- **Progress bar** (if partially completed, teal fill on gray track)
- **Badges** (New, Free, etc.) in pastel pill style

Horizontal scroll for "Continue Learning" on mobile. Grid (2 cols tablet, 4 cols desktop) for browse views.

### Content Viewer

The content viewing experience for rich text + media:
- Full-width on mobile with comfortable reading margins (px-4)
- Max-width constrained (`max-w-3xl`) and centered on desktop
- Media (images, video) responsive with `max-w-full`
- File downloads shown as prominent action cards
- Back button always visible

## Admin-Side Layout

### Desktop (Primary)

```
┌────────────────────────────────────────────────┐
│ [Logo] NMTSA [Admin badge]            [🌙] [Av]│
├──────────┬─────────────────────────────────────┤
│ CONTENT  │                                     │
│  Content │  Page Title                         │
│  Bundles │  [+ New Content]                    │
│  Shares  │                                     │
│  Archived│  Content grid / table               │
│          │                                     │
│ USERS    │                                     │
│  Users   │                                     │
│  Groups  │                                     │
│  Joins   │                                     │
│          │                                     │
│ COMMERCE │                                     │
│  Orders  │                                     │
│  Analytics│                                     │
│  Purchases│                                     │
│          │                                     │
│ SYSTEM   │                                     │
│  Settings│                                     │
│  Debug   │                                     │
└──────────┴─────────────────────────────────────┘
```

**Grouped sidebar** with 4 sections (Content, Users, Commerce, System), replacing the current 12-item vertical tab list. Each section has an uppercase label and indented items with Lucide icons (standard 2px stroke). Active item gets a tinted background.

Sidebar width: ~200px. Collapsible to icon-only is a nice-to-have, not required.

### Mobile (Functional, Not Priority)

- Hamburger icon in header opens a Sheet (drawer) containing the same grouped sidebar navigation
- Main content area takes full width
- Existing mobile patterns (stacked cards, full-width buttons) are sufficient
- No bottom nav on admin — hamburger drawer is fine for occasional mobile use

## Dark Mode

**Current state:** Tailwind is configured with `darkMode: ["class"]` but nothing toggles the `dark` class on `<html>` today. The existing `ThemeProvider` only handles dynamic brand color — it has no dark mode logic. `next-themes` is in `package.json` (used by Sonner toasts) but is not wired up as an app-level provider.

**Implementation:**
- Adopt `next-themes` properly: import as `NextThemesProvider` (to avoid naming collision with the existing custom `ThemeProvider`) and wrap the app in `<NextThemesProvider attribute="class" defaultTheme="system">`. This handles toggling the `dark` class on `<html>` and persists the preference in localStorage.
- The existing custom `ThemeProvider` (renamed to `BrandColorProvider` for clarity) continues to run alongside `NextThemesProvider` — they don't conflict since one sets a class and the other sets CSS variables.
- Toggle via a `ThemeToggle` component (moon/sun icon) in the header on both admin and client.
- Client dark mode: slate-900 background, teal-300 primary, all text and borders shift to dark variants per the palette table above.
- Admin dark mode: same approach, follows the dynamic brand color.

## Accessibility

Accessibility is a core tenet of the organization this platform serves. The platform must be fully usable by people with disabilities — including screen reader users, keyboard-only users, users with motor impairments, users with cognitive disabilities, and users with low vision. Accessibility is not a final polish step; it is built into every component from the start. Target: **WCAG 2.2 Level AA** compliance across both client and admin sides.

### Semantic Structure & Landmarks

- Every page uses proper landmark regions: `<header>`, `<nav>`, `<main>`, `<aside>` (admin sidebar), `<footer>` (bottom nav)
- Only one `<main>` per page
- Headings follow a logical hierarchy (`h1` → `h2` → `h3`) — no skipped levels
- Lists of content use `<ul>`/`<ol>` + `<li>`, not bare `<div>` sequences
- Navigation uses `<nav>` with distinguishing `aria-label` when multiple navs exist (e.g., `aria-label="Main navigation"`, `aria-label="Bottom navigation"`)
- Skip-to-content link as the first focusable element: visually hidden, visible on focus, jumps to `<main>`

### Keyboard Navigation

- **All** interactive elements reachable via Tab in a logical order matching visual layout
- Bottom nav, sidebar items, tabs, cards, and buttons all keyboard-operable
- `Enter` and `Space` activate buttons and links; `Arrow` keys navigate within tab lists, radio groups, and menus
- Visible focus indicator on every interactive element: `focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary` — never removed or made invisible
- Focus ring color meets 3:1 contrast against adjacent backgrounds in both light and dark mode
- **Focus management on route changes**: when the client navigates between pages (bottom nav, tabs), move focus to the page heading or main content area so screen reader users are oriented
- **Modal/drawer focus trapping**: MoreDrawer, admin mobile drawer, and all modals trap focus inside while open, return focus to trigger element on close (shadcn Sheet/Dialog already handles this — verify it works)
- No keyboard traps anywhere — users can always Tab or Escape out of any component

### Screen Reader Support

- All icon-only buttons include `aria-label` (bottom nav icons, hamburger menu, search, ThemeToggle, close buttons)
- Active navigation items use `aria-current="page"`
- Content cards are announced meaningfully: each card is a link/button with an accessible name derived from its title, not its decorative gradient header
- Progress bars use `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and `aria-label` (e.g., "65% complete")
- Loading states announced with `aria-live="polite"` regions or `aria-busy="true"` on the updating container
- Error messages and toast notifications use `role="alert"` or `aria-live="assertive"` so they are announced immediately
- Badges (New, Free, etc.) are part of the accessible name or use `aria-label`, not conveyed by color alone
- Empty states ("No content found") are announced to screen readers, not just visually displayed
- Admin sidebar section labels (CONTENT, USERS, etc.) use `role="group"` with `aria-label` or visible headings with `aria-labelledby`

### Touch & Motor Accessibility

- Minimum 44×44px touch targets on all interactive elements (client and admin) per WCAG 2.2 Success Criterion 2.5.8
- Adequate spacing between touch targets (minimum 8px gap) to prevent mis-taps
- No interactions that require precise gestures (drag-and-drop, pinch, multi-finger) without an accessible alternative
- Horizontal scroll areas ("Continue Learning") include visible scroll buttons as an alternative to swipe
- No time-limited interactions — users have unlimited time to complete any action

### Visual & Color Accessibility

- **Color contrast**: WCAG AA minimum — 4.5:1 for normal text (< 18px), 3:1 for large text (≥ 18px bold or ≥ 24px) and UI components/graphical objects
- **Never convey information by color alone**: badges include text labels, progress bars have numeric labels available, status indicators use icons + text
- Content type indicators use both icon shape and text label, not just color
- **Dark mode contrast**: all dark mode color pairs verified to AA standards (the palette table values are pre-validated)
- **High contrast mode**: ensure the UI remains usable when Windows High Contrast Mode or `forced-colors` media query is active — borders and focus rings should remain visible
- **Text resizing**: UI remains functional when text is resized up to 200% (browser zoom). No content clipped or overlapping. Test at 1280px viewport width with 200% zoom.
- **Text spacing**: content readable when letter-spacing, word-spacing, line-height, and paragraph spacing are increased per WCAG 1.4.12

### Reduced Motion

- All Framer Motion animations respect `prefers-reduced-motion`:
  ```tsx
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Use instant transitions instead of animated ones
  ```
- Page transitions, nav state animations, card hover effects, and gradient animations are disabled or replaced with simple opacity fades when reduced motion is preferred
- No content that flashes more than 3 times per second (WCAG 2.3.1)

### Cognitive Accessibility

- Clear, consistent navigation — same nav structure on every page within client/admin
- Plain language in UI labels and error messages (remember: ages 5-17 on client side)
- Error messages explain what went wrong AND what to do next
- Confirmation dialogs for destructive actions (delete, archive) with clear cancel option
- Current location always visible in navigation (active state styling + `aria-current`)
- No unexpected context changes — navigation only happens on explicit user action

### Forms & Interactive Content (Admin)

- All form inputs have visible labels (not just placeholders)
- Required fields marked with both visual indicator and `aria-required="true"`
- Form validation errors associated with their fields via `aria-describedby`
- Error summary at top of form with links to each invalid field
- Autocomplete attributes on appropriate fields (`autocomplete="email"`, etc.)
- Admin tables include `<caption>`, proper `<th scope="col/row">`, and are navigable via screen reader table commands

### Media Accessibility

- Video content: require captions/subtitles (enforce during content creation)
- Audio content: require transcript availability
- Images: require meaningful `alt` text (enforced in content creation form — empty `alt=""` only for purely decorative images)
- PDF downloads: note in metadata whether the PDF is tagged/accessible
- Auto-playing media: none. All media requires explicit user action to play.

### Testing Requirements

- **Automated**: Run `axe-core` (via `@axe-core/react` in dev mode) on every page — zero violations at "critical" and "serious" levels
- **Keyboard**: Every page manually tested with keyboard-only navigation (Tab, Shift+Tab, Enter, Space, Escape, Arrow keys)
- **Screen reader**: Test with VoiceOver (macOS/iOS) on key flows: navigate to content, open content, use bottom nav, switch themes, use admin sidebar
- **Zoom**: Verify layout at 200% and 400% zoom
- **Reduced motion**: Verify animations are suppressed with `prefers-reduced-motion: reduce`

## Component Architecture

### New Components to Create

| Component | Purpose | Location |
|-----------|---------|----------|
| `ClientLayout` | Bottom nav (mobile) + top tabs (desktop) shell | `src/components/client/ClientLayout.tsx` |
| `BottomNav` | Fixed bottom navigation bar | `src/components/client/BottomNav.tsx` |
| `MoreDrawer` | Sheet with overflow nav items | `src/components/client/MoreDrawer.tsx` |
| `ContentCard` | Unified content card with gradient header + icon | `src/components/client/ContentCard.tsx` |
| `AdminLayout` | Grouped sidebar shell | `src/components/admin/AdminLayout.tsx` |
| `AdminSidebar` | Grouped sidebar navigation | `src/components/admin/AdminSidebar.tsx` |
| `IconBadge` | Reusable gradient-glow icon wrapper | `src/components/ui/icon-badge.tsx` |
| `ThemeToggle` | Dark/light mode toggle button | `src/components/ThemeToggle.tsx` |

### Components to Refactor

| Component | Change | Reason |
|-----------|--------|--------|
| `ContentManager.tsx` (2,367 lines) | Decompose into ContentList, ContentFilters, ContentActions (see below) | Too large to maintain |
| `ClientDashboard.tsx` (570 lines) | Refactor to use ClientLayout + page components | Replace tab interface with routed pages |
| `AdminDashboard.tsx` (451 lines) | Refactor to use AdminLayout + page components | Replace tab interface with sidebar nav |
| `App.tsx` | Update routing to support client/admin layout shells | New layout structure |
| `Navbar.tsx` | Split into AdminHeader and ClientHeader | Different nav patterns per audience |
| `ThemeProvider.tsx` | Rename to `BrandColorProvider`; add client palette CSS variables alongside admin dynamic ones | Dual theme system + naming clarity with `next-themes` |
| `index.css` | Add client palette CSS variables, dark mode variants | New color tokens |

### ContentManager Decomposition

`ContentManager.tsx` (2,367 lines) splits into three focused components. The parent `ContentManager` remains as an orchestrator that owns the content list state and passes data down.

**`ContentFilters`** — Search, category, type, and status filter controls.
- Props: `filters: FilterState`, `onFiltersChange: (filters: FilterState) => void`, `categories: string[]`
- Pure presentational — no data fetching. Parent owns filter state.

**`ContentList`** — Renders the filtered content as a table (admin) or card grid.
- Props: `items: Content[]`, `loading: boolean`, `onSelect: (id: string) => void`, `onAction: (id: string, action: ContentAction) => void`
- Handles display only. Selection and bulk actions are callbacks to parent.

**`ContentActions`** — Toolbar with create, bulk edit, archive, and delete actions.
- Props: `selectedIds: string[]`, `onAction: (action: ContentAction, ids: string[]) => void`, `permissions: Permission[]`
- Disables/hides actions based on `permissions`. Confirms destructive actions before calling `onAction`.

**State ownership:** `ContentManager` fetches the content list via Convex query, holds `filterState` and `selectedIds` in React state, and passes filtered results to children. Modal state (edit, review) stays in `ContentManager` since modals need access to the mutation context.

### Components Unchanged

All shadcn/ui primitives, modals (ContentEditModal, ContentReviewModal, etc.), the Lexical editor, and admin sub-pages (SiteSettings, DebugTools, etc.) remain as-is. They receive the improved theming automatically through CSS variables.

## Implementation Priority

Accessibility is built into every step — not deferred to a late pass. Each step below must meet the accessibility requirements before moving to the next.

1. **Foundation**: CSS variables, BrandColorProvider update, IconBadge component, ThemeToggle, skip-to-content link, `@axe-core/react` integration in dev mode
2. **Client layout**: ClientLayout, BottomNav, MoreDrawer, ContentCard — with full keyboard nav, ARIA labels, landmarks, focus management on route changes
3. **Client pages**: Refactor ClientDashboard into routed pages using ClientLayout — screen reader tested per page
4. **Admin layout**: AdminLayout, AdminSidebar, AdminHeader — with sidebar keyboard navigation, grouped ARIA labels, focus trapping in mobile drawer
5. **Admin pages**: Refactor AdminDashboard to use AdminLayout with sidebar — table accessibility, form labels
6. **ContentManager decomposition**: Break into focused sub-components — maintain all existing keyboard/screen reader behavior
7. **Accessibility audit**: Full manual audit with VoiceOver, keyboard-only testing, zoom testing, reduced motion verification, axe-core zero-violation check
8. **Polish**: Animations (Framer Motion for page transitions, nav state with `prefers-reduced-motion` support), responsive fine-tuning

## Out of Scope

- New features (quizzes, progress tracking backend, notifications)
- Backend changes — this is purely frontend
- Redesigning modal content (edit, review modals keep current layouts)
- Admin mobile optimization beyond functional hamburger drawer
- Custom icon library — Lucide covers all needs
