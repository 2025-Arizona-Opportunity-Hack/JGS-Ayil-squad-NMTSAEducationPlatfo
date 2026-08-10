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
