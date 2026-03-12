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

### Required

- All interactive elements: minimum 44px touch target on client side
- Focus-visible ring on all interactive elements (`focus-visible:ring-2 focus-visible:ring-offset-2`)
- ARIA labels on icon-only buttons (bottom nav, hamburger, search)
- `aria-current="page"` on active nav items
- Semantic HTML: `<nav>`, `<main>`, `<header>`, `<aside>` landmarks
- Skip-to-content link (hidden, visible on focus)
- Color contrast: WCAG AA minimum (4.5:1 for normal text, 3:1 for large text) — the teal palette is pre-validated

### Progressive Enhancement

- Bottom nav items: icon + visible label (not icon-only)
- Content type badges include text, not just color
- All images require `alt` attributes (enforce in content creation)

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

1. **Foundation**: CSS variables, ThemeProvider update, IconBadge component, ThemeToggle
2. **Client layout**: ClientLayout, BottomNav, MoreDrawer, ContentCard
3. **Client pages**: Refactor ClientDashboard into routed pages using ClientLayout
4. **Admin layout**: AdminLayout, AdminSidebar, AdminHeader
5. **Admin pages**: Refactor AdminDashboard to use AdminLayout with sidebar
6. **ContentManager decomposition**: Break into focused sub-components
7. **Accessibility pass**: ARIA labels, landmarks, focus management, skip link
8. **Polish**: Animations (Framer Motion for page transitions, nav state), responsive fine-tuning

## Out of Scope

- New features (quizzes, progress tracking backend, notifications)
- Backend changes — this is purely frontend
- Redesigning modal content (edit, review modals keep current layouts)
- Admin mobile optimization beyond functional hamburger drawer
- Custom icon library — Lucide covers all needs
