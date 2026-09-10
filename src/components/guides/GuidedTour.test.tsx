// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
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


const THREE_STOPS: TourStop[] = [
  { target: "a", title: "Stop one", description: "One.", position: "bottom" },
  { target: "b", title: "Stop two", description: "Two.", position: "bottom" },
  { target: "c", title: "Stop three", description: "Three.", position: "bottom" },
];

function rect(width: number, height: number): DOMRect {
  return {
    top: 0, left: 0, width, height, bottom: height, right: width, x: 0, y: 0,
    toJSON: () => {},
  } as DOMRect;
}

function helpButton(visible: boolean): HTMLButtonElement {
  const b = document.createElement("button");
  b.setAttribute("aria-label", "Help and guides");
  b.getBoundingClientRect = () => (visible ? rect(44, 44) : rect(0, 0));
  document.body.appendChild(b);
  return b;
}

describe("GuidedTour keyboard activation", () => {
  it("advances exactly one stop when Enter is pressed on the Next button", () => {
    const onClose = vi.fn();
    render(<GuidedTour stops={THREE_STOPS} onClose={onClose} />);
    const next = screen.getByRole("button", { name: /next/i });
    next.focus();

    // A real browser fires keydown and then, because Enter on a focused button
    // is an implicit click, a click. happy-dom does not synthesise that click,
    // so both halves are driven here — otherwise the double-advance is
    // invisible to the test.
    fireEvent.keyDown(next, { key: "Enter" });
    fireEvent.click(next);

    expect(screen.getByText("Stop two")).toBeInTheDocument();
    expect(screen.getByText("2 of 3")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not close early when Enter is pressed on Next at the second-to-last stop", () => {
    const onClose = vi.fn();
    render(<GuidedTour stops={THREE_STOPS} onClose={onClose} />);
    const next = screen.getByRole("button", { name: /next/i });
    next.focus();
    fireEvent.keyDown(next, { key: "Enter" });
    fireEvent.click(next);
    fireEvent.keyDown(next, { key: "Enter" });
    fireEvent.click(next);

    expect(screen.getByText("Stop three")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  // Focus lands on the tooltip container on mount, so Enter must still work
  // there — the fix must not degrade into "Enter does nothing".
  it("advances when Enter is pressed on the focused tooltip container", async () => {
    render(<GuidedTour stops={THREE_STOPS} onClose={() => {}} />);
    const tooltip = screen.getByTestId("tour-tooltip");
    await waitFor(() => expect(tooltip).toHaveFocus());

    fireEvent.keyDown(tooltip, { key: "Enter" });

    expect(screen.getByText("Stop two")).toBeInTheDocument();
    expect(screen.getByText("2 of 3")).toBeInTheDocument();
  });

  it("still closes on Escape while a button holds focus", () => {
    const onClose = vi.fn();
    render(<GuidedTour stops={THREE_STOPS} onClose={onClose} />);
    const next = screen.getByRole("button", { name: /next/i });
    next.focus();
    fireEvent.keyDown(next, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("still advances and retreats on the arrow keys from a button", () => {
    render(<GuidedTour stops={THREE_STOPS} onClose={() => {}} />);
    const next = screen.getByRole("button", { name: /next/i });
    next.focus();
    fireEvent.keyDown(next, { key: "ArrowRight" });
    expect(screen.getByText("Stop two")).toBeInTheDocument();
    fireEvent.keyDown(next, { key: "ArrowLeft" });
    expect(screen.getByText("Stop one")).toBeInTheDocument();
  });
});

describe("GuidedTour focus restoration", () => {
  afterEach(() => {
    document
      .querySelectorAll('[aria-label="Help and guides"]')
      .forEach((el) => el.remove());
  });

  // The real path: useGuides closes the launcher and opens the tour in one
  // commit, so nothing is focused by the time the tour mounts. Only the
  // recorded opener can rescue it.
  it("restores focus to the recorded launcher opener when nothing is focused at mount", async () => {
    const help = helpButton(true);
    (document.activeElement as HTMLElement | null)?.blur();
    expect(document.activeElement).toBe(document.body);

    const { unmount } = render(
      <GuidedTour stops={STOPS} onClose={() => {}} restoreFocusTo={help} />
    );
    await waitFor(() => expect(screen.getByTestId("tour-tooltip")).toHaveFocus());

    unmount();
    expect(help).toHaveFocus();
  });

  // The first-visit prompt's "Show me" button unmounts itself on dismissal, so
  // the recorded opener can legitimately be detached by closing time.
  it("falls back to the visible help button when the recorded opener has been removed", async () => {
    const hiddenHelp = helpButton(false);
    const visibleHelp = helpButton(true);
    const removedOpener = document.createElement("button");
    expect(removedOpener.isConnected).toBe(false);
    (document.activeElement as HTMLElement | null)?.blur();

    const { unmount } = render(
      <GuidedTour stops={STOPS} onClose={() => {}} restoreFocusTo={removedOpener} />
    );
    await waitFor(() => expect(screen.getByTestId("tour-tooltip")).toHaveFocus());

    unmount();
    expect(visibleHelp).toHaveFocus();
    expect(hiddenHelp).not.toHaveFocus();
  });

  it("leaves focus alone when there is nothing to restore to", async () => {
    (document.activeElement as HTMLElement | null)?.blur();

    const { unmount } = render(
      <GuidedTour stops={STOPS} onClose={() => {}} restoreFocusTo={null} />
    );
    await waitFor(() => expect(screen.getByTestId("tour-tooltip")).toHaveFocus());

    unmount();
    expect(document.activeElement).toBe(document.body);
  });
});
