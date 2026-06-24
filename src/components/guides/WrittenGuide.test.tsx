// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WrittenGuide } from "./WrittenGuide";
import type { Guide } from "./guideContent";

const GUIDE: Guide = {
  id: "demo",
  title: "Demo guide",
  summary: "A demo.",
  tourStops: [{ target: "x", title: "t", description: "d", position: "bottom" }],
  writtenSteps: [
    { title: "Step one", detail: "Do one." },
    { title: "Step two", detail: "Do two." },
  ],
};

describe("WrittenGuide", () => {
  it("renders every step's title and detail when open", () => {
    render(<WrittenGuide guide={GUIDE} open onClose={() => {}} />);
    expect(screen.getByText("Step one")).toBeInTheDocument();
    expect(screen.getByText("Do one.")).toBeInTheDocument();
    expect(screen.getByText("Step two")).toBeInTheDocument();
    expect(screen.getByText("Do two.")).toBeInTheDocument();
  });

  it("calls onStartTour when the 'interactive tour' button is clicked", async () => {
    const onStartTour = vi.fn();
    render(<WrittenGuide guide={GUIDE} open onClose={() => {}} onStartTour={onStartTour} />);
    await userEvent.click(screen.getByRole("button", { name: /interactive tour/i }));
    expect(onStartTour).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when guide is null", () => {
    const { container } = render(<WrittenGuide guide={null} open onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
