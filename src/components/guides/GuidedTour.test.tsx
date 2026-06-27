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
