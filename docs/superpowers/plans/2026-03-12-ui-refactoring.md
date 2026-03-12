# UI Refactoring Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize the NMTSA Education Platform UI with dual visual systems (client teal palette + admin dynamic brand color), mobile-first client layout with bottom nav, grouped admin sidebar, dark mode, and WCAG 2.2 AA accessibility throughout.

**Architecture:** Split the single-page tab-based dashboards into routed page components wrapped in layout shells (`ClientLayout` with bottom nav/top tabs, `AdminLayout` with grouped sidebar). Foundation layer adds CSS variables, dark mode via `next-themes`, and shared accessible components (`IconBadge`, `ThemeToggle`, skip-to-content). Each component is built with full keyboard navigation, ARIA labels, and screen reader support from the start.

**Tech Stack:** React 19, React Router 7, Tailwind CSS 3.4, shadcn/ui (Radix), Lucide React, Framer Motion, next-themes, @axe-core/react

**Spec:** `docs/superpowers/specs/2026-03-11-ui-refactoring-design.md`

---

## Chunk 1: Foundation

### Task 1: Add Client Palette CSS Variables to `index.css`

**Files:**
- Modify: `src/index.css`

The existing CSS uses HSL format `H S% L%` for all variables. Client palette tokens follow the same convention. **Note:** The HSL values below are converted from the spec's hex values. After adding them, visually compare the rendered colors against the Tailwind color palette reference to confirm accuracy (e.g., `--client-primary` should match teal-600 `#0d9488`).

- [ ] **Step 1: Add client palette variables to `:root`**

Add after the existing `--color-dark` line (line 28) in the `:root` block:

```css
    /* Client palette (Friendly Teal) — fixed, not affected by admin brand color */
    --client-primary: 170 51% 32%;
    --client-accent: 239 84% 67%;
    --client-surface: 166 100% 99%;
    --client-card: 0 0% 100%;
    --client-border: 210 40% 90%;
    --client-text: 222 47% 11%;
    --client-text-secondary: 215 16% 47%;
    --client-success: 142 71% 45%;
    --client-warm: 25 95% 53%;
```

- [ ] **Step 2: Add client dark mode variables to `.dark` block**

Add after the existing `.dark` `--ring` line (line 50):

```css
    /* Client palette dark mode */
    --client-primary: 166 64% 52%;
    --client-accent: 232 92% 74%;
    --client-surface: 222 47% 11%;
    --client-card: 217 33% 17%;
    --client-border: 217 19% 27%;
    --client-text: 210 40% 96%;
    --client-text-secondary: 215 20% 65%;
    --client-success: 142 69% 58%;
    --client-warm: 27 96% 61%;
```

- [ ] **Step 3: Add dark mode support to `.prose` utility**

Update the `.prose` class (line 108) to support dark mode:

```css
  .prose {
    @apply text-gray-700 dark:text-gray-300 leading-relaxed;
  }

  .prose h1,
  .prose h2,
  .prose h3,
  .prose h4,
  .prose h5,
  .prose h6 {
    @apply font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-4;
  }

  .prose a {
    @apply text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline;
  }

  .prose blockquote {
    @apply border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-600 dark:text-gray-400 my-4;
  }

  .prose code {
    @apply bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm font-mono;
  }

  .prose pre {
    @apply bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-x-auto;
  }
```

- [ ] **Step 4: Add `.accent-text` dark variant**

Update line 79:

```css
  .accent-text {
    @apply text-slate-600 dark:text-slate-400;
  }
```

- [ ] **Step 5: Add auth component dark variants**

```css
  .auth-input-field {
    @apply w-full px-4 py-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow shadow-sm hover:shadow text-foreground;
  }

  .auth-button {
    @apply w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed;
  }
```

- [ ] **Step 5b: Add `scrollbar-hide` utility class**

Add to the `@layer utilities` block in `index.css`:

```css
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
```

This is used by the horizontal scroll in `HomePage`.

- [ ] **Step 6: Verify the app still renders correctly**

Run: `npm run dev`
Open browser, confirm no visual regressions. New variables are defined but not yet consumed.

- [ ] **Step 7: Commit**

```bash
git add src/index.css
git commit -m "feat: add client teal palette CSS variables and dark mode support"
```

---

### Task 2: Add Client Palette to Tailwind Config

**Files:**
- Modify: `tailwind.config.js`

- [ ] **Step 1: Add client color tokens to `theme.extend.colors`**

Add after the existing `ring` color definition (around line 55):

```javascript
        // Client palette (fixed teal)
        "client-primary": "hsl(var(--client-primary))",
        "client-accent": "hsl(var(--client-accent))",
        "client-surface": "hsl(var(--client-surface))",
        "client-card": "hsl(var(--client-card))",
        "client-border": "hsl(var(--client-border))",
        "client-text": "hsl(var(--client-text))",
        "client-text-secondary": "hsl(var(--client-text-secondary))",
        "client-success": "hsl(var(--client-success))",
        "client-warm": "hsl(var(--client-warm))",
```

- [ ] **Step 2: Verify Tailwind compiles without errors**

Run: `npm run dev`
Check browser console for errors. Confirm `bg-client-primary` class works by temporarily adding it to any element in dev tools.

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.js
git commit -m "feat: add client palette color tokens to Tailwind config"
```

---

### Task 3: Rename `ThemeProvider` to `BrandColorProvider`

**Files:**
- Modify: `src/components/ThemeProvider.tsx` (rename export)
- Modify: `src/main.tsx` (update import)

- [ ] **Step 1: Rename the component in `ThemeProvider.tsx`**

Change the function name and interface at lines 61-65:

```typescript
interface BrandColorProviderProps {
  children: React.ReactNode;
}

export function BrandColorProvider({ children }: BrandColorProviderProps) {
```

- [ ] **Step 2: Update the import in `src/main.tsx`**

Change line 12 from:
```typescript
import { ThemeProvider } from "./components/ThemeProvider";
```
to:
```typescript
import { BrandColorProvider } from "./components/ThemeProvider";
```

And update the JSX usage at lines 18 and 30 from `<ThemeProvider>` / `</ThemeProvider>` to `<BrandColorProvider>` / `</BrandColorProvider>`.

- [ ] **Step 3: Search for any other imports of ThemeProvider**

Run: `grep -r "ThemeProvider" src/ --include="*.tsx" --include="*.ts"`
Fix any other references found.

- [ ] **Step 4: Verify app still works**

Run: `npm run dev`
Confirm brand color still applies correctly from site settings.

- [ ] **Step 5: Commit**

```bash
git add src/components/ThemeProvider.tsx src/main.tsx
git commit -m "refactor: rename ThemeProvider to BrandColorProvider for clarity"
```

---

### Task 4: Wire Up `next-themes` for Dark Mode

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/components/ui/sonner.tsx` (if it imports its own ThemeProvider from next-themes)

`next-themes` is already in `package.json` (v0.4.6). It needs to be wired as an app-level provider.

- [ ] **Step 1: Add `NextThemesProvider` to `src/main.tsx`**

Add import:
```typescript
import { ThemeProvider as NextThemesProvider } from "next-themes";
```

Wrap the app — place it inside `ConvexAuthProvider` but outside `BrandColorProvider`:

```tsx
createRoot(document.getElementById("root")!).render(
  <ConvexAuthProvider client={convex}>
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      <BrandColorProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/view/:contentId" element={<PublicContentViewer />} />
            <Route path="/share/:accessToken" element={<SharedContentViewer />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/checkout/success" element={<CheckoutSuccess />} />
            <Route path="/checkout/cancel" element={<CheckoutCancel />} />
            <Route path="/*" element={<App />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-center" />
      </BrandColorProvider>
    </NextThemesProvider>
  </ConvexAuthProvider>
);
```

- [ ] **Step 2: Switch to dark-mode-aware Toaster**

In `src/main.tsx`, change line 5 from `import { Toaster } from "sonner"` to `import { Toaster } from "@/components/ui/sonner"`. The custom `sonner.tsx` wrapper already uses `useTheme()` from `next-themes` — now that the app-level provider is wired, toasts will automatically respect dark mode.

- [ ] **Step 3: Verify dark mode toggles**

Run: `npm run dev`
Open browser dev tools → Elements → add `class="dark"` to `<html>`. Confirm background goes dark and text goes light. Remove the class to confirm light mode returns.

- [ ] **Step 4: Commit**

```bash
git add src/main.tsx src/components/ui/sonner.tsx
git commit -m "feat: wire next-themes as app-level dark mode provider"
```

---

### Task 5: Create `ThemeToggle` Component

**Files:**
- Create: `src/components/ThemeToggle.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="relative min-w-[44px] min-h-[44px]"
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
```

Key accessibility features:
- `aria-label` describes the action (not the icon)
- 44×44px minimum touch target
- Visible focus via Button's built-in focus-visible ring

- [ ] **Step 2: Add ThemeToggle to App.tsx nav bar (temporary — will move to headers later)**

Import `ThemeToggle` in `src/App.tsx` and add it before the avatar button in the nav (line 221):

```tsx
<ThemeToggle />
```

- [ ] **Step 3: Verify toggle works**

Run: `npm run dev`
Click the toggle. Confirm:
- Background shifts between light and dark
- Icon transitions (sun ↔ moon)
- Preference persists on page reload
- Focus ring visible when tabbing to the button

- [ ] **Step 4: Commit**

```bash
git add src/components/ThemeToggle.tsx src/App.tsx
git commit -m "feat: add accessible ThemeToggle component with dark mode switching"
```

---

### Task 6: Create `IconBadge` Component

**Files:**
- Create: `src/components/ui/icon-badge.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type IconBadgeVariant = "teal" | "indigo" | "amber" | "green";

const variantStyles: Record<IconBadgeVariant, { bg: string; icon: string; shadow: string }> = {
  teal: {
    bg: "bg-gradient-to-br from-teal-100 to-teal-200 dark:from-teal-900/40 dark:to-teal-800/40",
    icon: "text-teal-600 dark:text-teal-300",
    shadow: "shadow-[0_2px_6px_rgba(13,148,136,0.15)]",
  },
  indigo: {
    bg: "bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/40 dark:to-indigo-800/40",
    icon: "text-indigo-500 dark:text-indigo-400",
    shadow: "shadow-[0_2px_6px_rgba(99,102,241,0.15)]",
  },
  amber: {
    bg: "bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40",
    icon: "text-amber-600 dark:text-amber-400",
    shadow: "shadow-[0_2px_6px_rgba(245,158,11,0.15)]",
  },
  green: {
    bg: "bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/40 dark:to-green-800/40",
    icon: "text-green-600 dark:text-green-400",
    shadow: "shadow-[0_2px_6px_rgba(34,197,94,0.15)]",
  },
};

interface IconBadgeProps {
  icon: LucideIcon;
  variant?: IconBadgeVariant;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Accessible label — required for standalone icon badges, omit if parent provides context */
  label?: string;
}

const sizeMap = {
  sm: { container: "w-8 h-8", icon: "w-4 h-4" },
  md: { container: "w-10 h-10", icon: "w-5 h-5" },
  lg: { container: "w-12 h-12", icon: "w-6 h-6" },
};

export function IconBadge({
  icon: Icon,
  variant = "teal",
  size = "md",
  className,
  label,
}: IconBadgeProps) {
  const styles = variantStyles[variant];
  const dimensions = sizeMap[size];

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-xl",
        styles.bg,
        styles.shadow,
        dimensions.container,
        className
      )}
      {...(label ? { "aria-label": label, role: "img" } : { "aria-hidden": true })}
    >
      <Icon className={cn(dimensions.icon, styles.icon)} strokeWidth={2.5} />
    </div>
  );
}
```

- [ ] **Step 2: Verify it renders**

Temporarily import and render an `IconBadge` in `App.tsx` to confirm:
```tsx
import { IconBadge } from "@/components/ui/icon-badge";
import { FileText } from "lucide-react";
// In JSX: <IconBadge icon={FileText} variant="teal" />
```

Confirm the gradient background, bold icon stroke, and subtle shadow appear. Remove the test usage.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/icon-badge.tsx
git commit -m "feat: add IconBadge component with gradient glow treatment"
```

---

### Task 7: Add Skip-to-Content Link and Install `@axe-core/react`

**Files:**
- Create: `src/components/SkipToContent.tsx`
- Modify: `src/App.tsx`
- Modify: `package.json` (dev dependency)

- [ ] **Step 1: Install axe-core for dev**

```bash
npm install --save-dev @axe-core/react
```

- [ ] **Step 2: Create `SkipToContent` component**

```tsx
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      Skip to main content
    </a>
  );
}
```

- [ ] **Step 3: Add SkipToContent to App.tsx**

Import `SkipToContent` and add it as the first element inside the outer `<div>` at line 214:

```tsx
return (
    <div className="min-h-screen bg-gray-50 dark:bg-background">
      <SkipToContent />
      <nav ...>
```

Also add `id="main-content"` to the `<main>` element at line 250:

```tsx
<main id="main-content" className="mx-auto py-6 sm:px-6 lg:px-8">
```

- [ ] **Step 4: Initialize axe-core in development**

Add to the top of `src/main.tsx` (before the render call):

```typescript
if (import.meta.env.DEV) {
  import("@axe-core/react").then((axe) => {
    import("react-dom").then((ReactDOM) => {
      axe.default(React, ReactDOM, 1000);
    });
  });
}
```

Add the React import if not present:
```typescript
import React from "react";
```

- [ ] **Step 5: Verify skip link works**

Run: `npm run dev`
Press Tab immediately after page load. The "Skip to main content" link should appear. Pressing Enter should scroll to and focus the main content area. Check browser console for axe-core output.

- [ ] **Step 6: Commit**

```bash
git add src/components/SkipToContent.tsx src/App.tsx src/main.tsx package.json package-lock.json
git commit -m "feat: add skip-to-content link and axe-core accessibility testing"
```

---

### Task 8: Update App.tsx Dark Mode Classes

**Files:**
- Modify: `src/App.tsx`

The current App.tsx uses hardcoded `bg-gray-50`, `text-gray-900`, `bg-white` etc. These need dark mode variants.

- [ ] **Step 1: Update the authenticated layout wrapper (line 214)**

```tsx
<div className="min-h-screen bg-background text-foreground">
```

- [ ] **Step 2: Update the nav bar (line 215)**

```tsx
<nav className="bg-card shadow-sm border-b border-border">
```

- [ ] **Step 3: Update loading states**

Replace all `bg-gray-50` with `bg-background` and `text-gray-900` with `text-foreground` in the loading/error screens (lines 94-206). Replace `border-blue-600` with `border-primary`.

- [ ] **Step 4: Update the sign-in page background**

Line 107: `bg-gray-50` → `bg-background`
Line 113: `text-gray-900` → `text-foreground`
Line 117: `text-gray-600` → `text-muted-foreground`

- [ ] **Step 5: Update nav bar text colors**

Line 237: `text-gray-700` → `text-foreground`
Line 241: `bg-blue-100 text-blue-800` → `bg-primary/10 text-primary`

- [ ] **Step 5b: Update `Logo.tsx` for dark mode**

In `src/components/Logo.tsx`, find any hardcoded `text-gray-900` and replace with `text-foreground` so the logo text is visible in dark mode.

- [ ] **Step 6: Verify dark mode looks correct**

Run: `npm run dev`
Toggle dark mode. All screens (loading, sign-in, authenticated) should use appropriate dark colors.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add dark mode support to App.tsx layout and loading states"
```

---

## Chunk 2: Client Layout

### Task 9: Create `BottomNav` Component

**Files:**
- Create: `src/components/client/BottomNav.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useLocation, useNavigate } from "react-router-dom";
import { House, Search, ShoppingCart, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  onMoreClick: () => void;
}

const navItems = [
  { path: "/", label: "Home", icon: House },
  { path: "/browse", label: "Browse", icon: Search },
  { path: "/shop", label: "Shop", icon: ShoppingCart },
] as const;

export function BottomNav({ onMoreClick }: BottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  // "More" is active when viewing overflow pages
  const moreRoutes = ["/bundles", "/orders", "/shares", "/requests", "/for-you"];
  const isMoreActive = moreRoutes.some((r) => location.pathname.startsWith(r));

  return (
    <nav
      aria-label="Bottom navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-client-card border-t border-client-border md:hidden"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map(({ path, label, icon: Icon }) => {
          const active = isActive(path);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center min-w-[64px] min-h-[44px] gap-0.5 rounded-xl px-3 py-1.5 transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-client-primary focus-visible:ring-offset-2",
                active
                  ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-[0_3px_8px_rgba(13,148,136,0.35)]"
                  : "text-client-text-secondary hover:text-client-text"
              )}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
              <span className="text-xs font-medium">{label}</span>
            </button>
          );
        })}
        <button
          onClick={onMoreClick}
          aria-current={isMoreActive ? "page" : undefined}
          aria-label="More navigation options"
          className={cn(
            "flex flex-col items-center justify-center min-w-[64px] min-h-[44px] gap-0.5 rounded-xl px-3 py-1.5 transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-client-primary focus-visible:ring-offset-2",
            isMoreActive
              ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-[0_3px_8px_rgba(13,148,136,0.35)]"
              : "text-client-text-secondary hover:text-client-text"
          )}
        >
          <MoreHorizontal className="w-5 h-5" strokeWidth={isMoreActive ? 2.5 : 2} />
          <span className="text-xs font-medium">More</span>
        </button>
      </div>
    </nav>
  );
}
```

Accessibility features:
- `<nav>` landmark with `aria-label`
- `aria-current="page"` on active item
- 44px minimum touch targets
- Visible focus rings
- Icon + visible text label (not icon-only)

- [ ] **Step 2: Commit**

```bash
git add src/components/client/BottomNav.tsx
git commit -m "feat: create accessible BottomNav component for client mobile"
```

---

### Task 10: Create `MoreDrawer` Component

**Files:**
- Create: `src/components/client/MoreDrawer.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useLocation, useNavigate } from "react-router-dom";
import { Folder, ClipboardList, ExternalLink, MessageSquare, Star } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface MoreDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const drawerItems = [
  { path: "/bundles", label: "Bundles", icon: Folder },
  { path: "/orders", label: "Orders", icon: ClipboardList },
  { path: "/shares", label: "Shares", icon: ExternalLink },
  { path: "/requests", label: "Requests", icon: MessageSquare },
  { path: "/for-you", label: "For You", icon: Star },
] as const;

export function MoreDrawer({ open, onOpenChange }: MoreDrawerProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader>
          <SheetTitle>More</SheetTitle>
        </SheetHeader>
        <nav aria-label="Additional navigation" className="mt-4 space-y-1">
          {drawerItems.map(({ path, label, icon: Icon }) => {
            const active = location.pathname.startsWith(path);
            return (
              <button
                key={path}
                onClick={() => handleNavigate(path)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 w-full px-4 py-3 rounded-lg text-left transition-colors min-h-[44px]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-client-primary focus-visible:ring-offset-2",
                  active
                    ? "bg-client-primary/10 text-client-primary font-medium"
                    : "text-client-text hover:bg-client-surface"
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/client/MoreDrawer.tsx
git commit -m "feat: create MoreDrawer bottom sheet for client overflow navigation"
```

---

### Task 11: Create `ContentCard` Component

**Files:**
- Create: `src/components/client/ContentCard.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useNavigate } from "react-router-dom";
import { FileText, Play, Download, FileAudio, Newspaper } from "lucide-react";
import { IconBadge } from "@/components/ui/icon-badge";
import { cn } from "@/lib/utils";
import type { IconBadgeVariant } from "@/components/ui/icon-badge";

// Re-export the variant type from IconBadge if needed
type ContentType = "richtext" | "video" | "audio" | "pdf" | "image" | "article";

const typeConfig: Record<string, { icon: typeof FileText; variant: IconBadgeVariant; label: string }> = {
  richtext: { icon: FileText, variant: "teal", label: "Article" },
  video: { icon: Play, variant: "indigo", label: "Video" },
  audio: { icon: FileAudio, variant: "green", label: "Audio" },
  pdf: { icon: Download, variant: "amber", label: "PDF" },
  image: { icon: Newspaper, variant: "teal", label: "Image" },
  article: { icon: FileText, variant: "teal", label: "Article" },
};

interface ContentCardProps {
  id: string;
  title: string;
  contentType: string;
  isFree?: boolean;
  isNew?: boolean;
  metadata?: string;
  progress?: number;
  className?: string;
}

export function ContentCard({
  id,
  title,
  contentType,
  isFree,
  isNew,
  metadata,
  progress,
  className,
}: ContentCardProps) {
  const navigate = useNavigate();
  const config = typeConfig[contentType] || typeConfig.richtext;

  return (
    <button
      onClick={() => navigate(`/view/${id}`)}
      className={cn(
        "flex flex-col bg-client-card border border-client-border rounded-xl overflow-hidden text-left transition-shadow hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-client-primary focus-visible:ring-offset-2",
        "min-h-[44px] w-full",
        className
      )}
      aria-label={`${title} — ${config.label}${isFree ? ", free" : ""}${isNew ? ", new" : ""}`}
    >
      {/* Gradient header with icon */}
      <div className="flex items-center gap-3 px-4 py-3">
        <IconBadge icon={config.icon} variant={config.variant} size="sm" />
        <span className="text-xs font-medium text-client-text-secondary uppercase tracking-wide">
          {config.label}
        </span>
        <div className="flex gap-1.5 ml-auto">
          {isNew && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-client-primary/10 text-client-primary">
              New
            </span>
          )}
          {isFree && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-client-success/10 text-client-success">
              Free
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3 flex-1">
        <h3 className="text-sm font-semibold text-client-text line-clamp-2">{title}</h3>
        {metadata && (
          <p className="text-xs text-client-text-secondary mt-1">{metadata}</p>
        )}
      </div>

      {/* Progress bar */}
      {progress !== undefined && progress > 0 && (
        <div className="px-4 pb-3">
          <div
            className="w-full h-1.5 bg-client-border rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${progress}% complete`}
          >
            <div
              className="h-full bg-client-primary rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </button>
  );
}
```

Accessibility features:
- Full card is a button with descriptive `aria-label`
- Progress bar uses `role="progressbar"` with `aria-valuenow/min/max`
- Badges included in text, not color-only
- Focus-visible ring
- 44px minimum touch target

- [ ] **Step 2: Commit**

```bash
git add src/components/client/ContentCard.tsx
git commit -m "feat: create accessible ContentCard with gradient icon badges and progress bar"
```

---

### Task 12: Create `ClientLayout` Shell

**Files:**
- Create: `src/components/client/ClientLayout.tsx`
- Create: `src/components/client/ClientHeader.tsx`

- [ ] **Step 1: Create `ClientHeader`**

```tsx
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "convex/react";
import {
  House, Search, Folder, ShoppingCart, ClipboardList,
  ExternalLink, MessageSquare, Star,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Logo } from "../Logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "../ThemeToggle";
import { cn } from "@/lib/utils";

interface ClientHeaderProps {
  onProfileClick: () => void;
}

const desktopTabs = [
  { path: "/", label: "Home", icon: House },
  { path: "/browse", label: "Browse", icon: Search },
  { path: "/bundles", label: "Bundles", icon: Folder },
  { path: "/shop", label: "Shop", icon: ShoppingCart },
  { path: "/orders", label: "Orders", icon: ClipboardList },
  { path: "/shares", label: "Shares", icon: ExternalLink },
  { path: "/requests", label: "Requests", icon: MessageSquare },
  { path: "/for-you", label: "For You", icon: Star },
] as const;

export function ClientHeader({ onProfileClick }: ClientHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const userProfile = useQuery(api.users.getCurrentUserProfile);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const firstName = userProfile?.firstName || "";

  return (
    <header className="sticky top-0 z-30 bg-client-card border-b border-client-border">
      <div className="max-w-7xl mx-auto px-4">
        {/* Mobile header */}
        <div className="flex md:hidden items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <Logo size="sm" showText={false} />
            <span className="text-sm font-medium text-client-text">
              Hi, {firstName}!
            </span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={onProfileClick}
              aria-label="Open profile"
              className="min-w-[44px] min-h-[44px]"
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={userProfile?.profilePictureUrl || undefined} alt="" />
                <AvatarFallback className="text-xs">
                  {userProfile?.firstName?.charAt(0)}{userProfile?.lastName?.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </div>
        </div>

        {/* Desktop header */}
        <div className="hidden md:flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <Logo size="md" showText={true} />
            <nav aria-label="Main navigation" className="flex items-center gap-1">
              {desktopTabs.map(({ path, label, icon: Icon }) => {
                const active = isActive(path);
                return (
                  <button
                    key={path}
                    onClick={() => navigate(path)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-client-primary focus-visible:ring-offset-2",
                      active
                        ? "bg-client-primary/10 text-client-primary"
                        : "text-client-text-secondary hover:text-client-text hover:bg-client-surface"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              onClick={onProfileClick}
              aria-label="Open profile"
              className="flex items-center gap-2 min-h-[44px]"
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={userProfile?.profilePictureUrl || undefined} alt="" />
                <AvatarFallback className="text-xs">
                  {userProfile?.firstName?.charAt(0)}{userProfile?.lastName?.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Create `ClientLayout`**

```tsx
import { useState, useRef, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { ClientHeader } from "./ClientHeader";
import { BottomNav } from "./BottomNav";
import { MoreDrawer } from "./MoreDrawer";
import { SkipToContent } from "../SkipToContent";
import { ProfileEditModal } from "../ProfileEditModal";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function ClientLayout() {
  const [moreOpen, setMoreOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const userProfile = useQuery(api.users.getCurrentUserProfile);

  // Focus management: move focus to main content on route change
  useEffect(() => {
    // Find the first h1 in main, or fall back to main itself
    const heading = mainRef.current?.querySelector("h1");
    if (heading instanceof HTMLElement) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    } else {
      mainRef.current?.focus({ preventScroll: true });
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-client-surface text-client-text">
      <SkipToContent />
      <ClientHeader onProfileClick={() => setProfileOpen(true)} />

      <main
        ref={mainRef}
        id="main-content"
        tabIndex={-1}
        className="pb-20 md:pb-6 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto py-6 outline-none"
      >
        <Outlet />
      </main>

      <BottomNav onMoreClick={() => setMoreOpen(true)} />
      <MoreDrawer open={moreOpen} onOpenChange={setMoreOpen} />

      {userProfile && (
        <ProfileEditModal
          isOpen={profileOpen}
          onClose={() => setProfileOpen(false)}
          onProfileUpdated={() => {}}
          currentProfile={{
            firstName: userProfile.firstName,
            lastName: userProfile.lastName,
            profilePictureId: userProfile.profilePictureId,
            profilePictureUrl: userProfile.profilePictureUrl || undefined,
          }}
        />
      )}
    </div>
  );
}
```

Key accessibility features:
- `SkipToContent` as first element
- Focus management on route change (moves to h1 or main)
- `<main>` with `id="main-content"` and `tabIndex={-1}`
- `<header>` and `<nav>` landmarks with aria-labels
- Bottom padding (`pb-20`) prevents content from being hidden behind fixed bottom nav

- [ ] **Step 3: Commit**

```bash
git add src/components/client/ClientLayout.tsx src/components/client/ClientHeader.tsx
git commit -m "feat: create ClientLayout shell with header, bottom nav, and focus management"
```

---

## Chunk 3: Client Pages

### Task 13: Create Client Page Components

**Files:**
- Create: `src/pages/client/HomePage.tsx`
- Create: `src/pages/client/BrowsePage.tsx`
- Create: `src/pages/client/BundlesPage.tsx`
- Create: `src/pages/client/ShopPage.tsx`
- Create: `src/pages/client/OrdersPage.tsx`
- Create: `src/pages/client/SharesPage.tsx`
- Create: `src/pages/client/RequestsPage.tsx`
- Create: `src/pages/client/ForYouPage.tsx`

Create the directory first: `mkdir -p src/pages/client`. Each page is a thin wrapper that renders the existing sub-component inside the layout. The existing components (`Shop`, `OrderHistory`, `ShareLinksManager`, `MyPurchaseRequests`, `RecommendedContent`) continue to handle their own data fetching and rendering.

- [ ] **Step 1: Create `HomePage.tsx`**

This is the new Home tab — greeting + "Continue Learning" horizontal scroll + recent content. It reuses queries from the existing `ClientDashboard`.

```tsx
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ContentCard } from "@/components/client/ContentCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";

export function HomePage() {
  const userProfile = useQuery(api.users.getCurrentUserProfile);
  const content = useQuery(api.content.listContent, {});
  const scrollRef = useRef<HTMLDivElement>(null);

  const firstName = userProfile?.firstName || "there";
  const items = content ?? [];

  // Take first 10 items for "Continue Learning"
  const continueItems = items.slice(0, 10);
  // Take next 20 for "Recent"
  const recentItems = items.slice(0, 20);

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const scroll = (direction: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: direction === "left" ? -280 : 280,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-client-text mb-6">
        Welcome back, {firstName}!
      </h1>

      {/* Continue Learning — horizontal scroll */}
      {continueItems.length > 0 && (
        <section aria-labelledby="continue-heading" className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 id="continue-heading" className="text-lg font-semibold text-client-text">
              Continue Learning
            </h2>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => scroll("left")}
                aria-label="Scroll left"
                className="min-w-[44px] min-h-[44px]"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => scroll("right")}
                aria-label="Scroll right"
                className="min-w-[44px] min-h-[44px]"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide"
            role="list"
            aria-label="Continue learning content"
          >
            {continueItems.map((item: any) => (
              <div key={item._id} className="snap-start shrink-0 w-[240px]" role="listitem">
                <ContentCard
                  id={item._id}
                  title={item.title}
                  contentType={item.contentType || "richtext"}
                  isFree={!item.price || item.price === 0}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Content — grid */}
      <section aria-labelledby="recent-heading">
        <h2 id="recent-heading" className="text-lg font-semibold text-client-text mb-3">
          Recent Content
        </h2>
        {recentItems.length === 0 ? (
          <p className="text-client-text-secondary py-8 text-center" role="status">
            No content available yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentItems.map((item: any) => (
              <ContentCard
                key={item._id}
                id={item._id}
                title={item.title}
                contentType={item.contentType || "richtext"}
                isFree={!item.price || item.price === 0}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Create wrapper pages for existing components**

Each of these is a simple wrapper:

`BrowsePage.tsx`:
```tsx
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ContentCard } from "@/components/client/ContentCard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function BrowsePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const content = useQuery(api.content.listContent, {});
  const items = content ?? [];

  const filtered = searchQuery
    ? items.filter((item: any) =>
        item.title?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : items;

  return (
    <div>
      <h1 className="text-2xl font-bold text-client-text mb-6">Browse Content</h1>

      {/* Search bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-client-text-secondary" aria-hidden="true" />
        <Input
          type="search"
          placeholder="Search content..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-client-card border-client-border min-h-[44px]"
          aria-label="Search content"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-client-text-secondary py-8 text-center" role="status">
          {searchQuery ? "No content matches your search." : "No content available yet."}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map((item: any) => (
            <ContentCard
              key={item._id}
              id={item._id}
              title={item.title}
              contentType={item.contentType || "richtext"}
              isFree={!item.price || item.price === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

`BundlesPage.tsx`:
```tsx
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Folder } from "lucide-react";
import { IconBadge } from "@/components/ui/icon-badge";

export function BundlesPage() {
  const contentGroups = useQuery(api.contentGroups.listContentGroups);
  const groups = contentGroups ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-client-text mb-6">Content Bundles</h1>
      {groups.length === 0 ? (
        <p className="text-client-text-secondary py-8 text-center" role="status">
          No bundles available yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group: any) => (
            <div
              key={group._id}
              className="flex items-start gap-3 p-4 bg-client-card border border-client-border rounded-xl"
            >
              <IconBadge icon={Folder} variant="indigo" />
              <div>
                <h2 className="text-sm font-semibold text-client-text">{group.name}</h2>
                {group.description && (
                  <p className="text-xs text-client-text-secondary mt-1">{group.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

`ShopPage.tsx`:
```tsx
import { Shop } from "@/components/Shop";
export function ShopPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-client-text mb-6">Shop</h1>
      <Shop />
    </div>
  );
}
```

`OrdersPage.tsx`:
```tsx
import { OrderHistory } from "@/components/OrderHistory";
export function OrdersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-client-text mb-6">Order History</h1>
      <OrderHistory />
    </div>
  );
}
```

`SharesPage.tsx`:
```tsx
import { ShareLinksManager } from "@/components/ShareLinksManager";
export function SharesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-client-text mb-6">My Shares</h1>
      <ShareLinksManager />
    </div>
  );
}
```

`RequestsPage.tsx`:
```tsx
import { MyPurchaseRequests } from "@/components/MyPurchaseRequests";
export function RequestsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-client-text mb-6">My Requests</h1>
      <MyPurchaseRequests />
    </div>
  );
}
```

`ForYouPage.tsx`:
```tsx
import { RecommendedContent } from "@/components/RecommendedContent";
export function ForYouPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-client-text mb-6">For You</h1>
      <RecommendedContent />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/client/
git commit -m "feat: create client page components wrapping existing sub-components"
```

---

### Task 14: Wire Up Client Routes in `App.tsx` and `main.tsx`

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Add client layout routes to `main.tsx`**

Import the new components and add nested routes:

```tsx
import { ClientLayout } from "./components/client/ClientLayout";
import { HomePage } from "./pages/client/HomePage";
import { BrowsePage } from "./pages/client/BrowsePage";
import { BundlesPage } from "./pages/client/BundlesPage";
import { ShopPage } from "./pages/client/ShopPage";
import { OrdersPage } from "./pages/client/OrdersPage";
import { SharesPage } from "./pages/client/SharesPage";
import { RequestsPage } from "./pages/client/RequestsPage";
import { ForYouPage } from "./pages/client/ForYouPage";
```

The routing architecture: standalone routes stay at the top level in `main.tsx`. The `App` component handles auth flow and decides between admin/client. For the client side, `App.tsx` renders `ClientLayout` which uses `<Outlet />` for nested routes.

- [ ] **Step 2: Update `App.tsx` to render `ClientLayout` with nested routes**

Replace the current client dashboard rendering. In the authenticated section of `App.tsx` (lines 213-278), for client users, render a `Routes` block with `ClientLayout`:

```tsx
import { Routes, Route } from "react-router-dom";
import { ClientLayout } from "./components/client/ClientLayout";
import { HomePage } from "./pages/client/HomePage";
import { BrowsePage } from "./pages/client/BrowsePage";
import { BundlesPage } from "./pages/client/BundlesPage";
import { ShopPage } from "./pages/client/ShopPage";
import { OrdersPage } from "./pages/client/OrdersPage";
import { SharesPage } from "./pages/client/SharesPage";
import { RequestsPage } from "./pages/client/RequestsPage";
import { ForYouPage } from "./pages/client/ForYouPage";
```

Replace the entire authenticated return block (lines 213-278) with the following. The key change: extract `isAdmin` as a variable, then conditionally render either the admin branch (with its own nav/main from `AdminLayout`) or the client branch (with `ClientLayout` + nested routes). Both layout shells provide their own header, main, and profile modal — so the old nav bar, `<main>` wrapper, and profile modal are removed from `App.tsx`.

```tsx
  const isAdmin = hasAnyPermission(userProfile?.effectivePermissions, [
    PERMISSIONS.CREATE_CONTENT,
    PERMISSIONS.EDIT_CONTENT,
    PERMISSIONS.VIEW_ALL_CONTENT,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.MANAGE_SITE_SETTINGS,
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SkipToContent />
      {isAdmin ? (
        <AdminDashboard />
      ) : (
        <Routes>
          <Route element={<ClientLayout />}>
            <Route index element={<HomePage />} />
            <Route path="browse" element={<BrowsePage />} />
            <Route path="bundles" element={<BundlesPage />} />
            <Route path="shop" element={<ShopPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="shares" element={<SharesPage />} />
            <Route path="requests" element={<RequestsPage />} />
            <Route path="for-you" element={<ForYouPage />} />
          </Route>
        </Routes>
      )}
    </div>
  );
```

The old `<nav>`, `<main>`, avatar button, role badge, `SignOutButton`, and `ProfileEditModal` from `App.tsx` are all removed — those responsibilities now live in `ClientLayout`/`AdminLayout`.

- [ ] **Step 3: Remove the SkipToContent and ProfileEditModal from App.tsx for client users**

`ClientLayout` already provides both. Only keep them in the admin branch until AdminLayout is built.

- [ ] **Step 4: Verify client navigation works**

Run: `npm run dev`
Log in as a client user. Confirm:
- Bottom nav appears on mobile (resize to < 768px)
- Top tabs appear on desktop
- Each route renders the correct page
- "More" drawer opens and navigates correctly
- Active states update in nav
- Focus moves to page heading on navigation
- Keyboard navigation (Tab, Enter) works throughout

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/main.tsx
git commit -m "feat: wire client routes with ClientLayout, BottomNav, and page components"
```

---

## Chunk 4: Admin Layout

### Task 15: Create `AdminSidebar` Component

**Files:**
- Create: `src/components/admin/AdminSidebar.tsx`

- [ ] **Step 1: Create the component**

```tsx
import {
  Folder, FolderTree, ExternalLink, Archive,
  Users, UsersRound, Mail,
  ShoppingCart, TrendingUp, ClipboardList,
  Settings, Bug,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarItem {
  value: string;
  label: string;
  icon: typeof Folder;
  permission?: boolean;
}

interface SidebarGroup {
  label: string;
  items: SidebarItem[];
}

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  className?: string;
  permissions: {
    canManageContentGroups: boolean;
    canViewUsers: boolean;
    canManageUserGroups: boolean;
    canViewAnalytics: boolean;
    canViewPurchaseRequests: boolean;
    canViewOrders: boolean;
    canViewArchivedContent: boolean;
    canManageSiteSettings: boolean;
  };
}

export function AdminSidebar({ activeTab, onTabChange, permissions, className }: AdminSidebarProps) {
  const groups: SidebarGroup[] = [
    {
      label: "Content",
      items: [
        { value: "content", label: "Content", icon: Folder },
        { value: "contentGroups", label: "Bundles", icon: FolderTree, permission: permissions.canManageContentGroups },
        { value: "shareLinks", label: "Shares", icon: ExternalLink },
        { value: "archived", label: "Archived", icon: Archive, permission: permissions.canViewArchivedContent },
      ],
    },
    {
      label: "Users",
      items: [
        { value: "users", label: "Users", icon: Users, permission: permissions.canViewUsers },
        { value: "userGroups", label: "Groups", icon: UsersRound, permission: permissions.canManageUserGroups },
        { value: "joinRequests", label: "Joins", icon: Mail, permission: permissions.canViewUsers },
      ],
    },
    {
      label: "Commerce",
      items: [
        { value: "orders", label: "Orders", icon: ShoppingCart, permission: permissions.canViewOrders },
        { value: "analytics", label: "Analytics", icon: TrendingUp, permission: permissions.canViewAnalytics },
        { value: "purchaseRequests", label: "Purchases", icon: ClipboardList, permission: permissions.canViewPurchaseRequests },
      ],
    },
    {
      label: "System",
      items: [
        { value: "settings", label: "Settings", icon: Settings, permission: permissions.canManageSiteSettings },
        { value: "debug", label: "Debug", icon: Bug, permission: permissions.canManageSiteSettings },
      ],
    },
  ];

  return (
    <aside className={cn("w-52 shrink-0 border-r border-border bg-card overflow-y-auto", className)} aria-label="Admin navigation">
      <nav className="p-3 space-y-4">
        {groups.map((group) => {
          const visibleItems = group.items.filter((item) => item.permission !== false);
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label} role="group" aria-labelledby={`sidebar-group-${group.label.toLowerCase()}`}>
              <h3 id={`sidebar-group-${group.label.toLowerCase()}`} className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                {group.label}
              </h3>
              <ul className="space-y-0.5" role="list">
                {visibleItems.map(({ value, label, icon: Icon }) => {
                  const active = activeTab === value;
                  return (
                    <li key={value}>
                      <button
                        onClick={() => onTabChange(value)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-colors min-h-[44px]",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                          active
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        )}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
```

Accessibility:
- `<aside>` landmark with `aria-label`
- `role="group"` with `aria-label` on each section
- `<ul>`/`<li>` list structure
- `aria-current="page"` on active item
- 44px minimum touch targets
- Focus-visible rings

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/AdminSidebar.tsx
git commit -m "feat: create AdminSidebar with grouped navigation and ARIA labels"
```

---

### Task 16: Create `AdminLayout` Shell

**Files:**
- Create: `src/components/admin/AdminLayout.tsx`
- Create: `src/components/admin/AdminHeader.tsx`

- [ ] **Step 1: Create `AdminHeader`**

```tsx
import { useState } from "react";
import { useQuery } from "convex/react";
import { Menu } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Logo } from "../Logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "../ThemeToggle";
import { SignOutButton } from "../../SignOutButton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AdminSidebar } from "./AdminSidebar";

interface AdminHeaderProps {
  onProfileClick: () => void;
  activeTab: string;
  onTabChange: (value: string) => void;
  sidebarPermissions: React.ComponentProps<typeof AdminSidebar>["permissions"];
}

export function AdminHeader({ onProfileClick, activeTab, onTabChange, sidebarPermissions }: AdminHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userProfile = useQuery(api.users.getCurrentUserProfile);

  const handleMobileTabChange = (value: string) => {
    onTabChange(value);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-card border-b border-border">
      <div className="px-4 flex items-center justify-between h-14 sm:h-16">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden min-w-[44px] min-h-[44px]" aria-label="Open navigation menu">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetHeader className="p-4 border-b">
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <AdminSidebar
                activeTab={activeTab}
                onTabChange={handleMobileTabChange}
                permissions={sidebarPermissions}
                className="w-full border-r-0"
              />
            </SheetContent>
          </Sheet>
          <Logo size="md" showText={true} />
          <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
            Admin
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            onClick={onProfileClick}
            aria-label="Open profile"
            className="flex items-center gap-2 min-h-[44px]"
          >
            <Avatar className="w-8 h-8">
              <AvatarImage src={userProfile?.profilePictureUrl || undefined} alt="" />
              <AvatarFallback className="text-xs">
                {userProfile?.firstName?.charAt(0)}{userProfile?.lastName?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline text-sm">{userProfile?.firstName}</span>
          </Button>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Create `AdminLayout`**

```tsx
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AdminHeader } from "./AdminHeader";
import { AdminSidebar } from "./AdminSidebar";
import { SkipToContent } from "../SkipToContent";
import { ProfileEditModal } from "../ProfileEditModal";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

interface AdminLayoutProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  children: React.ReactNode;
}

export function AdminLayout({ activeTab, onTabChange, children }: AdminLayoutProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const userProfile = useQuery(api.users.getCurrentUserProfile);

  const permissions = userProfile?.effectivePermissions;
  const sidebarPermissions = {
    canManageContentGroups: hasPermission(permissions, PERMISSIONS.MANAGE_CONTENT_GROUPS),
    canViewUsers: hasPermission(permissions, PERMISSIONS.VIEW_USERS),
    canManageUserGroups: hasPermission(permissions, PERMISSIONS.MANAGE_USER_GROUPS),
    canViewAnalytics: hasPermission(permissions, PERMISSIONS.VIEW_ANALYTICS),
    canViewPurchaseRequests: hasPermission(permissions, PERMISSIONS.VIEW_PURCHASE_REQUESTS),
    canViewOrders: hasPermission(permissions, PERMISSIONS.VIEW_ORDERS),
    canViewArchivedContent: hasPermission(permissions, PERMISSIONS.VIEW_ARCHIVED_CONTENT),
    canManageSiteSettings: hasPermission(permissions, PERMISSIONS.MANAGE_SITE_SETTINGS),
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SkipToContent />
      <AdminHeader
        onProfileClick={() => setProfileOpen(true)}
        activeTab={activeTab}
        onTabChange={onTabChange}
        sidebarPermissions={sidebarPermissions}
      />

      <div className="flex">
        {/* Desktop sidebar — sticky, full height below header */}
        <div className="hidden md:block sticky top-14 h-[calc(100vh-3.5rem)]">
          <AdminSidebar
            activeTab={activeTab}
            onTabChange={onTabChange}
            permissions={sidebarPermissions}
          />
        </div>

        {/* Main content */}
        <main id="main-content" tabIndex={-1} className="flex-1 p-6 outline-none min-w-0">
          {children}
        </main>
      </div>

      {userProfile && (
        <ProfileEditModal
          isOpen={profileOpen}
          onClose={() => setProfileOpen(false)}
          onProfileUpdated={() => {}}
          currentProfile={{
            firstName: userProfile.firstName,
            lastName: userProfile.lastName,
            profilePictureId: userProfile.profilePictureId,
            profilePictureUrl: userProfile.profilePictureUrl || undefined,
          }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/AdminLayout.tsx src/components/admin/AdminHeader.tsx
git commit -m "feat: create AdminLayout shell with grouped sidebar and mobile hamburger drawer"
```

---

### Task 17: Refactor `AdminDashboard` to Use `AdminLayout`

**Files:**
- Modify: `src/components/AdminDashboard.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Simplify AdminDashboard**

Replace the existing layout code in `AdminDashboard.tsx` with `AdminLayout`. Keep all the tab content rendering and permission checks, but remove:
- The `NavigationItems` component (replaced by `AdminSidebar`)
- The mobile Sheet navigation (replaced by `AdminHeader`)
- The `<Tabs>` wrapper and `<TabsList>` (replaced by `AdminSidebar`)

The refactored component should:
1. Keep `activeTab` state and `handleTabChange`
2. Keep all permission checks
3. Keep all `TabsContent`-equivalent conditional renders
4. Keep invite modals
5. Wrap everything in `<AdminLayout>`

```tsx
export function AdminDashboard() {
  const userProfile = useQuery(api.users.getCurrentUserProfile);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [clientInviteModalOpen, setClientInviteModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("adminDashboardTab") || "content";
  });

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    localStorage.setItem("adminDashboardTab", value);
  };

  if (!userProfile) {
    return <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
    </div>;
  }

  // ... permission checks stay the same ...

  return (
    <AdminLayout activeTab={activeTab} onTabChange={handleTabChange}>
      {/* Action buttons */}
      {canGenerateInviteCodes && (
        <div className="flex gap-2 mb-4">
          <Button onClick={() => setClientInviteModalOpen(true)}>Invite Client</Button>
          <Button variant="outline" onClick={() => setInviteModalOpen(true)}>Generate Staff Code</Button>
        </div>
      )}

      {/* Tab content — render based on activeTab */}
      {activeTab === "content" && <ContentManager />}
      {activeTab === "shareLinks" && <ShareLinksManager />}
      {activeTab === "contentGroups" && canManageContentGroups && <ContentGroupManager />}
      {activeTab === "joinRequests" && canViewUsers && <JoinRequests />}
      {activeTab === "users" && canViewUsers && <UserManager />}
      {activeTab === "userGroups" && canManageUserGroups && <UserGroupManager />}
      {activeTab === "analytics" && canViewAnalytics && <SalesAnalytics />}
      {activeTab === "purchaseRequests" && canViewPurchaseRequests && <PurchaseRequests />}
      {activeTab === "orders" && canViewOrders && <AdminOrders />}
      {activeTab === "archived" && canViewArchivedContent && <ArchivedContent />}
      {activeTab === "settings" && canManageSiteSettings && <SiteSettings />}
      {activeTab === "debug" && canManageSiteSettings && <DebugTools />}

      {/* Modals */}
      <InviteCodeModal open={inviteModalOpen} onOpenChange={setInviteModalOpen} />
      <ClientInviteModal open={clientInviteModalOpen} onOpenChange={setClientInviteModalOpen} />
    </AdminLayout>
  );
}
```

- [ ] **Step 2: Update App.tsx**

For admin users, `App.tsx` should now just render `<AdminDashboard />` without its own nav bar and main wrapper, since `AdminLayout` provides those:

```tsx
{isAdmin ? (
  <AdminDashboard />
) : (
  <Routes>
    <Route element={<ClientLayout />}>
      {/* ... client routes ... */}
    </Route>
  </Routes>
)}
```

Remove the `<nav>` and `<main>` elements from `App.tsx` — they're now in the layout shells.

- [ ] **Step 3: Verify admin navigation works**

Run: `npm run dev`
Log in as admin. Confirm:
- Grouped sidebar appears on desktop
- Hamburger drawer on mobile
- Clicking sidebar items switches content
- Active state highlights correctly
- Invite buttons still work
- All tab content renders correctly

- [ ] **Step 4: Commit**

```bash
git add src/components/AdminDashboard.tsx src/App.tsx
git commit -m "refactor: AdminDashboard uses AdminLayout with grouped sidebar navigation"
```

---

## Chunk 5: ContentManager Decomposition

### Task 18: Extract `ContentFilters` from `ContentManager`

**Files:**
- Create: `src/components/admin/ContentFilters.tsx`
- Modify: `src/components/ContentManager.tsx`

- [ ] **Step 1: Identify filter state and UI in ContentManager**

Read `ContentManager.tsx` and identify all filter-related state variables and the JSX that renders filter controls (search input, type dropdown, tag filters, sort options). Note the exact line numbers.

- [ ] **Step 2: Define the `FilterState` type and create `ContentFilters`**

```tsx
// src/components/admin/ContentFilters.tsx
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface FilterState {
  searchQuery: string;
  contentType: string;
  selectedTags: string[];
  sortBy: string;
  status: string;
}

interface ContentFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  categories: string[];
}

export function ContentFilters({ filters, onFiltersChange, categories }: ContentFiltersProps) {
  // Extract the filter UI from ContentManager here
  // Ensure all inputs have visible labels and aria attributes
  return (
    <div className="space-y-3" role="search" aria-label="Content filters">
      {/* Search */}
      <div className="relative">
        <label htmlFor="content-search" className="sr-only">Search content</label>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
        <Input
          id="content-search"
          type="search"
          placeholder="Search content..."
          value={filters.searchQuery}
          onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value })}
          className="pl-10 min-h-[44px]"
        />
      </div>
      {/* Type, tags, sort selectors — extracted from ContentManager */}
    </div>
  );
}
```

- [ ] **Step 3: Replace filter UI in ContentManager with `<ContentFilters />`**

Import `ContentFilters` and `FilterState`. Replace the inline filter JSX with the component, passing state and callbacks.

- [ ] **Step 4: Verify filters still work**

Run: `npm run dev`
Log in as admin, go to content tab. Confirm all filters work identically.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/ContentFilters.tsx src/components/ContentManager.tsx
git commit -m "refactor: extract ContentFilters from ContentManager"
```

---

### Task 19: Extract `ContentList` from `ContentManager`

**Files:**
- Create: `src/components/admin/ContentList.tsx`
- Modify: `src/components/ContentManager.tsx`

- [ ] **Step 1: Identify the content list/table rendering in ContentManager**

Find the JSX that renders the content items (table rows or card grid). Note line numbers.

- [ ] **Step 2: Create `ContentList` component**

Extract the list rendering. Ensure tables use `<caption>`, `<th scope="col">`, and proper structure.

```tsx
interface ContentListProps {
  items: any[];
  loading: boolean;
  onSelect: (id: string) => void;
  onAction: (id: string, action: string) => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function ContentList({ items, loading, onSelect, onAction, selectedIds, onSelectionChange }: ContentListProps) {
  if (loading) {
    return <div aria-busy="true" aria-label="Loading content" className="py-12 text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto" />
    </div>;
  }

  if (items.length === 0) {
    return <p className="text-muted-foreground py-8 text-center" role="status">No content found.</p>;
  }

  // Render the content table/grid extracted from ContentManager
  // Ensure <table> has <caption>, <th> has scope attributes
}
```

- [ ] **Step 3: Replace content list in ContentManager with `<ContentList />`**

- [ ] **Step 4: Verify content list still works**

Run: `npm run dev`
Confirm content displays, selection works, action callbacks fire correctly.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/ContentList.tsx src/components/ContentManager.tsx
git commit -m "refactor: extract ContentList from ContentManager"
```

---

### Task 20: Extract `ContentActions` from `ContentManager`

**Files:**
- Create: `src/components/admin/ContentActions.tsx`
- Modify: `src/components/ContentManager.tsx`

- [ ] **Step 1: Identify action toolbar UI in ContentManager**

Find the "Create", bulk edit, archive, delete buttons and their associated logic.

- [ ] **Step 2: Create `ContentActions` component**

```tsx
interface ContentActionsProps {
  selectedIds: string[];
  onAction: (action: string, ids: string[]) => void;
  permissions: string[];
}

export function ContentActions({ selectedIds, onAction, permissions }: ContentActionsProps) {
  // Render action buttons, disable based on permissions
  // Confirm destructive actions before calling onAction
}
```

- [ ] **Step 3: Replace action toolbar in ContentManager with `<ContentActions />`**

- [ ] **Step 4: Verify all actions work**

Run: `npm run dev`
Test create, bulk actions, archive, delete. Confirm permission-based visibility.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/ContentActions.tsx src/components/ContentManager.tsx
git commit -m "refactor: extract ContentActions from ContentManager"
```

---

## Chunk 6: Cleanup and Remove Old Components

### Task 21: Remove Old `Navbar.tsx` and `ClientDashboard.tsx` Tab UI

**Files:**
- Modify: `src/components/Navbar.tsx` (delete or keep only if still referenced)
- Modify: `src/components/ClientDashboard.tsx` (remove tab UI, keep only if referenced as fallback)

- [ ] **Step 1: Check for remaining references to Navbar**

```bash
grep -r "Navbar" src/ --include="*.tsx" --include="*.ts"
```

If `Navbar` is no longer imported anywhere, delete the file. If it's still referenced, update the import to point to the appropriate header component.

- [ ] **Step 2: Check for remaining references to ClientDashboard tab logic**

The old tab-based `ClientDashboard` should no longer be imported by `App.tsx`. Verify with grep. If no references remain, the file can be deleted or archived.

- [ ] **Step 3: Clean up unused imports in App.tsx**

Remove imports for components that are no longer used directly in `App.tsx` (old Navbar, old direct dashboard imports that moved to layout shells).

- [ ] **Step 4: Verify the app still works end-to-end**

Run: `npm run dev`
Test both admin and client flows. Verify no broken imports or missing components.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove old Navbar and ClientDashboard tab UI, clean up imports"
```

---

## Chunk 7: Accessibility Audit and Polish

### Task 22: Accessibility Audit

**Files:**
- All new components

- [ ] **Step 1: Run axe-core check on every page**

Open each page in the browser with dev mode active. Check console for axe-core violations. Fix any "critical" or "serious" violations.

Pages to check:
- Client: `/`, `/browse`, `/bundles`, `/shop`, `/orders`, `/shares`, `/requests`, `/for-you`
- Admin: all 12 sidebar tabs
- Auth: sign-in page, loading states

- [ ] **Step 2: Keyboard-only navigation test**

Put away the mouse. Navigate through:
1. Skip-to-content link (Tab from page load)
2. Client bottom nav (Tab through all items, Enter to activate)
3. Client desktop tabs
4. More drawer (Tab to open, navigate items, Escape to close)
5. Admin sidebar (Tab through groups and items)
6. Admin mobile drawer (Tab to hamburger, Enter to open, navigate, Escape to close)
7. ThemeToggle (Tab to it, Enter to toggle)
8. Content cards (Tab to each, Enter to open)

Fix any issues found.

- [ ] **Step 3: Screen reader test with VoiceOver**

Enable VoiceOver (Cmd+F5 on Mac). Navigate through:
1. Landmarks are announced (header, nav, main, aside)
2. Skip-to-content works
3. Nav items announce labels and active state
4. Content cards announce title, type, and badges
5. Progress bars announce percentage
6. Empty states are announced
7. Theme toggle announces its action

- [ ] **Step 4: Zoom test**

Set browser zoom to 200% at 1280px viewport width. Verify:
- No content overflow or clipping
- All text readable
- Interactive elements still usable
- Bottom nav doesn't overlap content

- [ ] **Step 5: Reduced motion test**

In browser dev tools → Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce`. Verify all Framer Motion animations are suppressed.

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve accessibility audit findings"
```

---

### Task 23: Add Framer Motion Page Transitions

**Files:**
- Modify: `src/components/client/ClientLayout.tsx`

- [ ] **Step 1: Add page transition wrapper**

```tsx
import { motion, useReducedMotion } from "framer-motion";
import { useOutlet } from "react-router-dom";

// Inside ClientLayout:
const shouldReduceMotion = useReducedMotion();
const outlet = useOutlet(); // Capture current outlet element for animation

// In JSX (replace <Outlet /> with):
<motion.div
  key={location.pathname}
  initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.15 }}
>
  {outlet}
</motion.div>
```

**Note:** We use `useOutlet()` instead of `<Outlet />` with `AnimatePresence` because React Router's `<Outlet />` immediately swaps content on route change, preventing exit animations. Entry animations work fine with this approach. If exit animations are needed later, use a custom `AnimatedOutlet` with `useLocation` and `cloneElement`.
```

- [ ] **Step 2: Verify transitions work and reduced motion is respected**

Run: `npm run dev`
Navigate between pages — should see subtle fade/slide. Enable reduced motion in dev tools — transitions should be instant.

- [ ] **Step 3: Commit**

```bash
git add src/components/client/ClientLayout.tsx
git commit -m "feat: add page transitions with prefers-reduced-motion support"
```

---

### Task 24: Final Dark Mode Polish

**Files:**
- Various component files

- [ ] **Step 1: Audit all hardcoded gray/white classes**

Search for hardcoded color classes that don't have dark variants:

```bash
grep -rEn "bg-gray-|bg-white|text-gray-|border-gray-" src/components/ --include="*.tsx" | head -30
```

- [ ] **Step 2: Replace with semantic Tailwind classes**

For any components that were modified in this refactoring:
- `bg-white` → `bg-card` or `bg-background`
- `bg-gray-50` → `bg-background` or `bg-muted`
- `text-gray-900` → `text-foreground`
- `text-gray-600` → `text-muted-foreground`
- `border-gray-200` → `border-border`

Do NOT modify components that are out of scope (unchanged shadcn primitives, modals, etc.)

- [ ] **Step 3: Verify dark mode across all pages**

Toggle dark mode and check each page. Ensure no jarring white/gray patches remain in the modified components.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix: replace hardcoded gray classes with semantic dark-mode-aware tokens"
```

---

### Task 25: Final Verification

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Fix any type errors.

- [ ] **Step 2: Run existing tests**

```bash
npm test
```

Fix any test failures caused by the refactoring.

- [ ] **Step 3: Run the dev server and do a full walkthrough**

Verify:
- Client: all 8 pages render, navigation works, dark mode works, cards display correctly
- Admin: sidebar navigation works, all 12 tabs render, mobile drawer works
- Auth: sign-in page renders, loading states work
- Standalone routes: `/view/:contentId`, `/share/:accessToken` still work
- Accessibility: skip link, keyboard nav, screen reader basics all functional

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: resolve final verification issues"
```
