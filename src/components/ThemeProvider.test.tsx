// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { BrandColorProvider } from "./ThemeProvider";
import { resolveBrandTokens } from "@/lib/brandTheme";

const useQueryMock = vi.fn();
vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

const useThemeMock = vi.fn();
vi.mock("next-themes", () => ({
  useTheme: (...args: unknown[]) => useThemeMock(...args),
}));

const INLINE_PROPERTIES = ["--primary", "--ring", "--primary-foreground", "--primary-hex"];

describe("BrandColorProvider", () => {
  beforeEach(() => {
    document.documentElement.style.cssText = "";
    localStorage.clear();
    useQueryMock.mockReset();
    useThemeMock.mockReset();
  });

  it("applies a valid brand colour in light mode and caches it", () => {
    useQueryMock.mockReturnValue({ primaryColor: "#3b82f6" });
    useThemeMock.mockReturnValue({ resolvedTheme: "light" });

    render(
      <BrandColorProvider>
        <div />
      </BrandColorProvider>
    );

    const expected = resolveBrandTokens("#3b82f6", false)!;
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe(expected.primary);
    expect(document.documentElement.style.getPropertyValue("--ring")).toBe(expected.ring);
    expect(document.documentElement.style.getPropertyValue("--primary-foreground")).toBe(
      expected.primaryForeground
    );
    expect(localStorage.getItem("theme-primary-color")).toBe("#3b82f6");
  });

  it("applies a different, lightened --primary and a 0 0% 9% foreground in dark mode", () => {
    // A navy that is unreadable as text-on-background until ensureContrastOnDark
    // lightens it — a good canary for "the dark-mode branch actually adjusts it".
    useQueryMock.mockReturnValue({ primaryColor: "#1e3a8a" });
    useThemeMock.mockReturnValue({ resolvedTheme: "dark" });

    render(
      <BrandColorProvider>
        <div />
      </BrandColorProvider>
    );

    const lightTokens = resolveBrandTokens("#1e3a8a", false)!;
    const darkTokens = resolveBrandTokens("#1e3a8a", true)!;
    const appliedPrimary = document.documentElement.style.getPropertyValue("--primary");

    expect(appliedPrimary).toBe(darkTokens.primary);
    expect(appliedPrimary).not.toBe(lightTokens.primary);
    expect(document.documentElement.style.getPropertyValue("--primary-foreground")).toBe(
      "0 0% 9%"
    );
  });

  it("removes the inline overrides and cached colour when primaryColor is absent", () => {
    useQueryMock.mockReturnValue({ primaryColor: "#3b82f6" });
    useThemeMock.mockReturnValue({ resolvedTheme: "light" });

    const { rerender } = render(
      <BrandColorProvider>
        <div />
      </BrandColorProvider>
    );

    // Prove they were actually applied first, so removal is what the test
    // exercises rather than the properties never having been set.
    for (const property of INLINE_PROPERTIES) {
      expect(document.documentElement.style.getPropertyValue(property)).not.toBe("");
    }
    expect(localStorage.getItem("theme-primary-color")).toBe("#3b82f6");

    useQueryMock.mockReturnValue({ primaryColor: undefined });
    rerender(
      <BrandColorProvider>
        <div />
      </BrandColorProvider>
    );

    for (const property of INLINE_PROPERTIES) {
      expect(document.documentElement.style.getPropertyValue(property)).toBe("");
    }
    expect(localStorage.getItem("theme-primary-color")).toBeNull();
  });

  it("removes the inline overrides and cached colour when primaryColor is malformed", () => {
    useQueryMock.mockReturnValue({ primaryColor: "#3b82f6" });
    useThemeMock.mockReturnValue({ resolvedTheme: "light" });

    const { rerender } = render(
      <BrandColorProvider>
        <div />
      </BrandColorProvider>
    );

    for (const property of INLINE_PROPERTIES) {
      expect(document.documentElement.style.getPropertyValue(property)).not.toBe("");
    }
    expect(localStorage.getItem("theme-primary-color")).toBe("#3b82f6");

    // 3-digit shorthand — SIX_DIGIT_HEX rejects it, so resolveBrandTokens
    // returns null just like the absent case.
    useQueryMock.mockReturnValue({ primaryColor: "#fff" });
    rerender(
      <BrandColorProvider>
        <div />
      </BrandColorProvider>
    );

    for (const property of INLINE_PROPERTIES) {
      expect(document.documentElement.style.getPropertyValue(property)).toBe("");
    }
    expect(localStorage.getItem("theme-primary-color")).toBeNull();
  });

  it("leaves an already-applied inline --primary untouched while siteSettings is loading", () => {
    useQueryMock.mockReturnValue({ primaryColor: "#3b82f6" });
    useThemeMock.mockReturnValue({ resolvedTheme: "light" });

    const { rerender } = render(
      <BrandColorProvider>
        <div />
      </BrandColorProvider>
    );

    const applied = document.documentElement.style.getPropertyValue("--primary");
    expect(applied).not.toBe("");

    // useQuery returns undefined while the Convex query is still loading.
    useQueryMock.mockReturnValue(undefined);
    rerender(
      <BrandColorProvider>
        <div />
      </BrandColorProvider>
    );

    expect(document.documentElement.style.getPropertyValue("--primary")).toBe(applied);
    expect(localStorage.getItem("theme-primary-color")).toBe("#3b82f6");
  });
});
