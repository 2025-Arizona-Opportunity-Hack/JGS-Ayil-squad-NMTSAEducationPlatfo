// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGuides } from "./useGuides";
import { GUIDES } from "./guideContent";

describe("useGuides", () => {
  it("opens and closes the launcher", () => {
    const { result } = renderHook(() => useGuides());
    expect(result.current.launcherOpen).toBe(false);
    act(() => result.current.openLauncher());
    expect(result.current.launcherOpen).toBe(true);
    act(() => result.current.closeLauncher());
    expect(result.current.launcherOpen).toBe(false);
  });

  it("readSteps closes the launcher and sets the written guide", () => {
    const { result } = renderHook(() => useGuides());
    act(() => result.current.openLauncher());
    act(() => result.current.readSteps(GUIDES[0].id));
    expect(result.current.launcherOpen).toBe(false);
    expect(result.current.writtenGuide?.id).toBe(GUIDES[0].id);
    expect(result.current.tourGuide).toBeNull();
  });

  it("startTour sets the tour guide and clears launcher + written guide", () => {
    const { result } = renderHook(() => useGuides());
    act(() => result.current.readSteps(GUIDES[0].id));
    act(() => result.current.startTour(GUIDES[1].id));
    expect(result.current.tourGuide?.id).toBe(GUIDES[1].id);
    expect(result.current.writtenGuide).toBeNull();
    expect(result.current.launcherOpen).toBe(false);
  });

  it("closeTour clears the tour guide", () => {
    const { result } = renderHook(() => useGuides());
    act(() => result.current.startTour(GUIDES[0].id));
    act(() => result.current.closeTour());
    expect(result.current.tourGuide).toBeNull();
  });
});
