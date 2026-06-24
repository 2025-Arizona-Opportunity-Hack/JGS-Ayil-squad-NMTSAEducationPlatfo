// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GuidesLauncher } from "./GuidesLauncher";
import { GUIDES } from "./guideContent";

describe("GuidesLauncher", () => {
  it("renders an entry for every guide", () => {
    render(<GuidesLauncher open onClose={() => {}} onReadSteps={() => {}} onStartTour={() => {}} />);
    for (const g of GUIDES) {
      expect(screen.getByText(g.title)).toBeInTheDocument();
    }
  });

  it("calls onReadSteps with the guide id", async () => {
    const onReadSteps = vi.fn();
    render(<GuidesLauncher open onClose={() => {}} onReadSteps={onReadSteps} onStartTour={() => {}} />);
    const buttons = screen.getAllByRole("button", { name: /read steps/i });
    await userEvent.click(buttons[0]);
    expect(onReadSteps).toHaveBeenCalledWith(GUIDES[0].id);
  });

  it("calls onStartTour with the guide id", async () => {
    const onStartTour = vi.fn();
    render(<GuidesLauncher open onClose={() => {}} onReadSteps={() => {}} onStartTour={onStartTour} />);
    const buttons = screen.getAllByRole("button", { name: /start tour/i });
    await userEvent.click(buttons[0]);
    expect(onStartTour).toHaveBeenCalledWith(GUIDES[0].id);
  });
});
