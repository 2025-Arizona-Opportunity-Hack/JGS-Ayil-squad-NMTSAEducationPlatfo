// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { navAnchor } from "@/lib/tourAnchors";

vi.mock("convex/react", () => ({
  useQuery: () => undefined,
  useMutation: () => vi.fn(),
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
}));
vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({ signOut: vi.fn() }),
}));

import { ClientHeader } from "./ClientHeader";
import { BottomNav } from "./BottomNav";

/** Every anchored control inside a nav landmark, with its visible label. */
function anchoredItems(navLabel: string) {
  const nav = screen.getByRole("navigation", { name: navLabel });
  return Array.from(nav.querySelectorAll<HTMLElement>("[data-tour]")).map((el) => ({
    label: el.textContent?.trim() ?? "",
    anchor: el.getAttribute("data-tour"),
  }));
}

/**
 * GuidedTour resolves one anchor to whichever viewport's copy is visible, so
 * the desktop tabs and the mobile bar must derive anchors identically. These
 * lock both components to the single shared derivation — the moment either
 * hand-rolls it again, the multi-word case diverges and these fail.
 */
describe("client nav tour anchors", () => {
  it("derives every desktop tab anchor from navAnchor", () => {
    render(
      <MemoryRouter>
        <ClientHeader onProfileClick={() => {}} onHelpClick={() => {}} />
      </MemoryRouter>
    );
    const items = anchoredItems("Main navigation");
    expect(items.length).toBeGreaterThan(0);
    for (const { label, anchor } of items) {
      expect(anchor).toBe(navAnchor(label));
    }
  });

  it("derives every bottom-nav anchor from navAnchor", () => {
    render(
      <MemoryRouter>
        <BottomNav onMoreClick={() => {}} />
      </MemoryRouter>
    );
    const items = anchoredItems("Bottom navigation");
    expect(items.length).toBeGreaterThan(0);
    for (const { label, anchor } of items) {
      expect(anchor).toBe(navAnchor(label));
    }
  });

  it("emits the same anchor in both components for a multi-word label", () => {
    // "For You" is the real multi-word tab, and today it only exists in the
    // header — the bottom bar reaches it through the More drawer. Both now
    // share one derivation, so adding it to the bar cannot drift.
    render(
      <MemoryRouter>
        <ClientHeader onProfileClick={() => {}} onHelpClick={() => {}} />
      </MemoryRouter>
    );
    const forYou = anchoredItems("Main navigation").find((i) => i.label === "For You");
    expect(forYou).toBeDefined();
    expect(forYou!.anchor).toBe("client-nav-for-you");
    expect(forYou!.anchor).toBe(navAnchor("For You"));
  });

  // Every label the two components share is a single word, so both
  // derivations agree on today's data whether or not they are the same code.
  // A behavioural test therefore cannot catch a reintroduced hand-rolled
  // anchor — the divergence only appears once someone adds a two-word item,
  // which is precisely when it would ship unnoticed. Guard the source.
  it("builds the anchor string nowhere but in navAnchor", () => {
    for (const file of ["ClientHeader.tsx", "BottomNav.tsx"]) {
      const src = readFileSync(new URL(file, import.meta.url), "utf8");
      expect(src).toContain("navAnchor(label)");
      expect(src).not.toMatch(/`client-nav-\$\{/);
    }
  });
});
