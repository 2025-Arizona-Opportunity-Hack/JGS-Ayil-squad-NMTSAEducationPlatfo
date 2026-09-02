// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GuidedTour, type TourStop } from "./GuidedTour";

const STOPS: TourStop[] = [
  { target: "a", title: "First stop", description: "Do the first thing.", position: "bottom" },
  { target: "b", title: "Second stop", description: "Do the second thing.", position: "bottom" },
];

describe("GuidedTour", () => {
  it("renders the first stop's title and description", () => {
    render(<GuidedTour stops={STOPS} onClose={() => {}} />);
    expect(screen.getByText("First stop")).toBeInTheDocument();
    expect(screen.getByText("Do the first thing.")).toBeInTheDocument();
  });

  it("advances to the next stop when Next is clicked", async () => {
    render(<GuidedTour stops={STOPS} onClose={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText("Second stop")).toBeInTheDocument();
  });

  it("calls onClose when Done is clicked on the last stop", async () => {
    const onClose = vi.fn();
    render(<GuidedTour stops={STOPS} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    await userEvent.click(screen.getByRole("button", { name: /done/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the close (X) button is clicked", async () => {
    const onClose = vi.fn();
    render(<GuidedTour stops={STOPS} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: /close tour/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clicks the target element when advancing from a stop with action 'click'", async () => {
    const opener = document.createElement("button");
    opener.setAttribute("data-tour", "opener");
    opener.getBoundingClientRect = () =>
      ({ top: 50, left: 50, width: 100, height: 40, bottom: 90, right: 150, x: 50, y: 50, toJSON: () => {} }) as DOMRect;
    const onOpenerClick = vi.fn();
    opener.addEventListener("click", onOpenerClick);
    document.body.appendChild(opener);

    const stops: TourStop[] = [
      { target: "opener", title: "Open it", description: "Opens a modal.", position: "bottom", action: "click" },
      { target: "field", title: "A field", description: "Inside the modal.", position: "bottom" },
    ];

    render(<GuidedTour stops={stops} onClose={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /next/i }));

    expect(onOpenerClick).toHaveBeenCalledTimes(1);
    expect(screen.getByText("A field")).toBeInTheDocument();

    opener.remove();
  });
});

describe("GuidedTour target resolution", () => {
  it("measures the visible node when two elements share a data-tour value", async () => {
    const hidden = document.createElement("div");
    hidden.setAttribute("data-tour", "dup");
    hidden.getBoundingClientRect = () =>
      ({ top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0, x: 0, y: 0, toJSON: () => {} }) as DOMRect;

    const visible = document.createElement("div");
    visible.setAttribute("data-tour", "dup");
    visible.getBoundingClientRect = () =>
      ({ top: 100, left: 40, width: 200, height: 50, bottom: 150, right: 240, x: 40, y: 100, toJSON: () => {} }) as DOMRect;

    // Hidden one first in document order, so querySelector would pick it.
    document.body.append(hidden, visible);

    const stops: TourStop[] = [
      { target: "dup", title: "Dup stop", description: "Points at the visible one.", position: "bottom" },
    ];
    render(<GuidedTour stops={stops} onClose={() => {}} />);

    // padding is 8 (GuidedTour.tsx:114). Resolving the hidden node gives
    // x=-8, y=-8; resolving the visible one gives x=32, y=92.
    await waitFor(() => {
      const spotlight = document.querySelector("rect[data-testid='tour-spotlight']");
      expect(spotlight).not.toBeNull();
      expect(Number(spotlight!.getAttribute("x"))).toBe(32);
      expect(Number(spotlight!.getAttribute("y"))).toBe(92);
      expect(Number(spotlight!.getAttribute("width"))).toBe(216);
      expect(Number(spotlight!.getAttribute("height"))).toBe(66);
    });

    hidden.remove();
    visible.remove();
  });

  it("re-measures the visible node when viewport resize swaps visibility", async () => {
    // Initially: first is visible, second is hidden
    const first = document.createElement("div");
    first.setAttribute("data-tour", "swap");
    let firstRect = { top: 100, left: 40, width: 200, height: 50, bottom: 150, right: 240, x: 40, y: 100 };
    first.getBoundingClientRect = () =>
      ({ ...firstRect, toJSON: () => {} }) as DOMRect;

    const second = document.createElement("div");
    second.setAttribute("data-tour", "swap");
    let secondRect = { top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0, x: 0, y: 0 };
    second.getBoundingClientRect = () =>
      ({ ...secondRect, toJSON: () => {} }) as DOMRect;

    document.body.append(first, second);

    const stops: TourStop[] = [
      { target: "swap", title: "Resize test", description: "Checks resize handler", position: "bottom" },
    ];
    render(<GuidedTour stops={stops} onClose={() => {}} />);

    // Initial spotlight should be on first (visible)
    await waitFor(() => {
      const spotlight = document.querySelector("rect[data-testid='tour-spotlight']");
      expect(spotlight).not.toBeNull();
      expect(Number(spotlight!.getAttribute("x"))).toBe(32); // 40 - 8
      expect(Number(spotlight!.getAttribute("y"))).toBe(92); // 100 - 8
    });

    // Swap visibility: first becomes zero, second becomes visible
    firstRect = { top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0, x: 0, y: 0 };
    secondRect = { top: 80, left: 60, width: 180, height: 40, bottom: 120, right: 240, x: 60, y: 80 };

    // Trigger resize
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });

    // Spotlight should now track the second (newly visible)
    await waitFor(() => {
      const spotlight = document.querySelector("rect[data-testid='tour-spotlight']");
      expect(spotlight).not.toBeNull();
      expect(Number(spotlight!.getAttribute("x"))).toBe(52); // 60 - 8
      expect(Number(spotlight!.getAttribute("y"))).toBe(72); // 80 - 8
      expect(Number(spotlight!.getAttribute("width"))).toBe(196); // 180 + 16
      expect(Number(spotlight!.getAttribute("height"))).toBe(56); // 40 + 16
    });

    first.remove();
    second.remove();
  });

  it("clicks a zero-rect element when action is 'click'", async () => {
    const zeroRectOpener = document.createElement("button");
    zeroRectOpener.setAttribute("data-tour", "zero-rect-opener");
    // Zero rect: mid-animation or before layout settles
    zeroRectOpener.getBoundingClientRect = () =>
      ({ top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0, x: 0, y: 0, toJSON: () => {} }) as DOMRect;
    const onZeroRectClick = vi.fn();
    zeroRectOpener.addEventListener("click", onZeroRectClick);
    document.body.appendChild(zeroRectOpener);

    const stops: TourStop[] = [
      { target: "zero-rect-opener", title: "Click zero rect", description: "Mid-animation element.", position: "bottom", action: "click" },
      { target: "revealed", title: "Revealed stop", description: "Was hidden, now revealed.", position: "bottom" },
    ];

    render(<GuidedTour stops={stops} onClose={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /next/i }));

    // Click should fire even on zero-rect element
    expect(onZeroRectClick).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Revealed stop")).toBeInTheDocument();

    zeroRectOpener.remove();
  });

  it("prefers the visible element when clicking duplicated anchors", async () => {
    const hidden = document.createElement("button");
    hidden.setAttribute("data-tour", "dup-click");
    hidden.getBoundingClientRect = () =>
      ({ top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0, x: 0, y: 0, toJSON: () => {} }) as DOMRect;
    const onHiddenClick = vi.fn();
    hidden.addEventListener("click", onHiddenClick);

    const visible = document.createElement("button");
    visible.setAttribute("data-tour", "dup-click");
    visible.getBoundingClientRect = () =>
      ({ top: 100, left: 40, width: 200, height: 50, bottom: 150, right: 240, x: 40, y: 100, toJSON: () => {} }) as DOMRect;
    const onVisibleClick = vi.fn();
    visible.addEventListener("click", onVisibleClick);

    // Hidden first in document order, but visible should be clicked
    document.body.append(hidden, visible);

    const stops: TourStop[] = [
      { target: "dup-click", title: "Click visible dup", description: "Should click visible one.", position: "bottom", action: "click" },
      { target: "next-stop", title: "Next", description: "After visible click.", position: "bottom" },
    ];

    render(<GuidedTour stops={stops} onClose={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /next/i }));

    // Visible element should be clicked, not hidden one
    expect(onVisibleClick).toHaveBeenCalledTimes(1);
    expect(onHiddenClick).toHaveBeenCalledTimes(0);
    expect(screen.getByText("Next")).toBeInTheDocument();

    hidden.remove();
    visible.remove();
  });
});

describe("GuidedTour focus management", () => {
  it("moves focus into the tour on mount", async () => {
    render(<GuidedTour stops={STOPS} onClose={() => {}} />);
    await waitFor(() =>
      expect(screen.getByTestId("tour-tooltip")).toHaveFocus()
    );
  });

  it("moves focus back to the tooltip when the stop changes", async () => {
    render(<GuidedTour stops={STOPS} onClose={() => {}} />);
    const next = screen.getByRole("button", { name: /next/i });
    await userEvent.click(next);
    expect(screen.getByText("Second stop")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId("tour-tooltip")).toHaveFocus()
    );
  });

  it("returns focus to the control that opened it when the tour closes", async () => {
    const opener = document.createElement("button");
    opener.textContent = "Help and guides";
    document.body.appendChild(opener);
    opener.focus();
    expect(opener).toHaveFocus();

    const { unmount } = render(<GuidedTour stops={STOPS} onClose={() => {}} />);
    await waitFor(() => expect(opener).not.toHaveFocus());

    unmount();
    expect(opener).toHaveFocus();
    opener.remove();
  });
});
