// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

import { waitFor } from "@testing-library/react";

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
});
