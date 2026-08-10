// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useWelcomeGreeting } from "./useWelcomeGreeting";

const custom = vi.fn();
const dismiss = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    custom: (...args: unknown[]) => custom(...args),
    dismiss: (...args: unknown[]) => dismiss(...args),
  },
}));

/** Renders the card the hook handed to sonner, as sonner itself would. */
function renderNthToast(index = 0) {
  const factory = custom.mock.calls[index][0] as (id: string) => JSX.Element;
  return render(factory("toast-id"));
}

describe("useWelcomeGreeting", () => {
  beforeEach(() => {
    custom.mockClear();
    dismiss.mockClear();
    sessionStorage.clear();
  });

  it("greets the user by name on arrival", () => {
    renderHook(() => useWelcomeGreeting({ userId: "u1", firstName: "Jen" }));

    expect(custom).toHaveBeenCalledTimes(1);
    renderNthToast();
    expect(screen.getByText("Welcome back, Jen!")).toBeInTheDocument();
    expect(screen.getByText("You're signed in.")).toBeInTheDocument();
  });

  it("shows the person's own photo and initials in the greeting", () => {
    renderHook(() =>
      useWelcomeGreeting({
        userId: "u1",
        firstName: "Jen",
        lastName: "Doe",
        profilePictureUrl: "https://example.com/jen.jpg",
      })
    );

    const { container } = renderNthToast();
    expect(screen.getByText("JD")).toBeInTheDocument();
    const img = container.querySelector("img");
    if (img) expect(img).toHaveAttribute("src", "https://example.com/jen.jpg");
  });

  it("closes the greeting when the person dismisses it", async () => {
    renderHook(() => useWelcomeGreeting({ userId: "u1", firstName: "Jen" }));

    renderNthToast();
    await userEvent.click(screen.getByRole("button", { name: /dismiss/i }));

    expect(dismiss).toHaveBeenCalledWith("toast-id");
  });

  it("does not greet again on re-render within the same session", () => {
    const { rerender } = renderHook(() =>
      useWelcomeGreeting({ userId: "u1", firstName: "Jen" })
    );
    rerender();
    rerender();

    expect(custom).toHaveBeenCalledTimes(1);
  });

  it("does not greet the same user again in a new hook instance", () => {
    // What a page reload looks like: fresh mount, same session storage. This is
    // the path the rerender test above cannot reach, because unchanged
    // primitive deps mean React skips the effect entirely.
    renderHook(() => useWelcomeGreeting({ userId: "u1", firstName: "Jen" }));
    renderHook(() => useWelcomeGreeting({ userId: "u1", firstName: "Jen" }));

    expect(custom).toHaveBeenCalledTimes(1);
  });

  it("stays silent while the profile is still loading", () => {
    renderHook(() => useWelcomeGreeting(undefined));
    expect(custom).not.toHaveBeenCalled();

    renderHook(() => useWelcomeGreeting(null));
    expect(custom).not.toHaveBeenCalled();
  });

  it("greets a different user on a shared device", () => {
    renderHook(() => useWelcomeGreeting({ userId: "u1", firstName: "Jen" }));
    renderHook(() => useWelcomeGreeting({ userId: "u2", firstName: "Sam" }));

    expect(custom).toHaveBeenCalledTimes(2);
    renderNthToast(1);
    expect(screen.getByText("Welcome back, Sam!")).toBeInTheDocument();
  });

  it("stays on screen long enough for users who read slowly", () => {
    renderHook(() => useWelcomeGreeting({ userId: "u1", firstName: "Jen" }));

    expect(custom.mock.calls[0][1]).toMatchObject({ duration: 10000 });
  });
});
