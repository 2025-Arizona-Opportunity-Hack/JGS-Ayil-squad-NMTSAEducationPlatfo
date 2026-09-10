// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClientHelpPrompt } from "./ClientHelpPrompt";

describe("ClientHelpPrompt", () => {
  beforeEach(() => localStorage.clear());

  it("shows when this user has not dismissed it", () => {
    render(<ClientHelpPrompt userId="u1" onOpenGuides={() => {}} />);
    expect(screen.getByText(/first time here/i)).toBeInTheDocument();
  });

  it("stores dismissal against the user id", async () => {
    render(<ClientHelpPrompt userId="u1" onOpenGuides={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(localStorage.getItem("guides-client-prompt-seen:u1")).toBe("true");
  });

  it("still shows for a different user on the same browser", () => {
    localStorage.setItem("guides-client-prompt-seen:u1", "true");
    render(<ClientHelpPrompt userId="u2" onOpenGuides={() => {}} />);
    expect(screen.getByText(/first time here/i)).toBeInTheDocument();
  });

  it("does not render once this user has dismissed it", () => {
    localStorage.setItem("guides-client-prompt-seen:u1", "true");
    const { container } = render(<ClientHelpPrompt userId="u1" onOpenGuides={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("ignores the staff prompt key", () => {
    localStorage.setItem("guides-prompt-seen", "true");
    render(<ClientHelpPrompt userId="u1" onOpenGuides={() => {}} />);
    expect(screen.getByText(/first time here/i)).toBeInTheDocument();
  });

  // The point of the prompt is to get the user to the launcher. Someone who
  // finds the header ? button unaided has arrived, and must stop being nudged.
  it("records dismissal when the launcher is opened by another route", () => {
    const { rerender } = render(
      <ClientHelpPrompt userId="u1" onOpenGuides={() => {}} guidesOpened={false} />
    );
    expect(screen.getByText(/first time here/i)).toBeInTheDocument();

    rerender(
      <ClientHelpPrompt userId="u1" onOpenGuides={() => {}} guidesOpened={true} />
    );
    expect(localStorage.getItem("guides-client-prompt-seen:u1")).toBe("true");
    expect(screen.queryByText(/first time here/i)).not.toBeInTheDocument();
  });

  it("opens the guides and records dismissal", async () => {
    const onOpenGuides = vi.fn();
    render(<ClientHelpPrompt userId="u1" onOpenGuides={onOpenGuides} />);
    await userEvent.click(screen.getByRole("button", { name: /show me/i }));
    expect(onOpenGuides).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("guides-client-prompt-seen:u1")).toBe("true");
  });
});
