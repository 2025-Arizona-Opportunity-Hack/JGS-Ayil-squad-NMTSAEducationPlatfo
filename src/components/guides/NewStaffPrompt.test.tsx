// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewStaffPrompt } from "./NewStaffPrompt";

describe("NewStaffPrompt", () => {
  beforeEach(() => localStorage.clear());

  it("shows the prompt when the seen flag is unset", () => {
    render(<NewStaffPrompt onOpenGuides={() => {}} />);
    expect(screen.getByText(/new here/i)).toBeInTheDocument();
  });

  it("hides and sets the flag when dismissed", async () => {
    const { rerender } = render(<NewStaffPrompt onOpenGuides={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(localStorage.getItem("guides-prompt-seen")).toBe("true");
    rerender(<NewStaffPrompt onOpenGuides={() => {}} />);
    expect(screen.queryByText(/new here/i)).not.toBeInTheDocument();
  });

  it("calls onOpenGuides and sets the flag when the open button is clicked", async () => {
    const onOpenGuides = vi.fn();
    render(<NewStaffPrompt onOpenGuides={onOpenGuides} />);
    await userEvent.click(screen.getByRole("button", { name: /show me/i }));
    expect(onOpenGuides).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("guides-prompt-seen")).toBe("true");
  });

  it("does not render when the flag is already set", () => {
    localStorage.setItem("guides-prompt-seen", "true");
    render(<NewStaffPrompt onOpenGuides={() => {}} />);
    expect(screen.queryByText(/new here/i)).not.toBeInTheDocument();
  });
});
