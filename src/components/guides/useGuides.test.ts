// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGuides } from "./useGuides";
import { getGuidesFor, type Guide } from "./guideContent";
import { PERMISSIONS } from "@/lib/permissions";

const ADMIN_GUIDES = getGuidesFor("admin", [
  PERMISSIONS.CREATE_CONTENT,
  PERMISSIONS.SET_CONTENT_PRICING,
  PERMISSIONS.MANAGE_CONTENT_GROUPS,
]);

describe("useGuides", () => {
  it("opens and closes the launcher", () => {
    const { result } = renderHook(() => useGuides(ADMIN_GUIDES));
    expect(result.current.launcherOpen).toBe(false);
    act(() => result.current.openLauncher());
    expect(result.current.launcherOpen).toBe(true);
    act(() => result.current.closeLauncher());
    expect(result.current.launcherOpen).toBe(false);
  });

  it("readSteps closes the launcher and sets the written guide", () => {
    const { result } = renderHook(() => useGuides(ADMIN_GUIDES));
    act(() => result.current.openLauncher());
    act(() => result.current.readSteps(ADMIN_GUIDES[0].id));
    expect(result.current.launcherOpen).toBe(false);
    expect(result.current.writtenGuide?.id).toBe(ADMIN_GUIDES[0].id);
    expect(result.current.tourGuide).toBeNull();
  });

  it("startTour sets the tour guide and clears launcher + written guide", () => {
    const { result } = renderHook(() => useGuides(ADMIN_GUIDES));
    act(() => result.current.readSteps(ADMIN_GUIDES[0].id));
    act(() => result.current.startTour(ADMIN_GUIDES[1].id));
    expect(result.current.tourGuide?.id).toBe(ADMIN_GUIDES[1].id);
    expect(result.current.writtenGuide).toBeNull();
    expect(result.current.launcherOpen).toBe(false);
  });

  it("closeTour clears the tour guide", () => {
    const { result } = renderHook(() => useGuides(ADMIN_GUIDES));
    act(() => result.current.startTour(ADMIN_GUIDES[0].id));
    act(() => result.current.closeTour());
    expect(result.current.tourGuide).toBeNull();
  });
});

const TWO: Guide[] = [
  { id: "a", title: "A", summary: "sa", audience: "client", writtenSteps: [], tourStops: [] },
  { id: "b", title: "B", summary: "sb", audience: "client", writtenSteps: [], tourStops: [] },
];

describe("useGuides with an explicit list", () => {
  it("resolves a written guide from the list it was given", () => {
    const { result } = renderHook(() => useGuides(TWO));
    act(() => result.current.readSteps("b"));
    expect(result.current.writtenGuide?.title).toBe("B");
  });

  it("resolves null for an id absent from the list", () => {
    const { result } = renderHook(() => useGuides(TWO));
    act(() => result.current.startTour("not-in-list"));
    expect(result.current.tourGuide).toBeNull();
  });
});
