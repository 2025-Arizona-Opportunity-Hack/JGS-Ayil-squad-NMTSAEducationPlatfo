// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HelpButton } from "./HelpButton";

describe("HelpButton, prominent", () => {
  it("shows the word Help, not just an icon", () => {
    render(<HelpButton tone="client" prominent onClick={() => {}} />);
    expect(screen.getByText("Help")).toBeVisible();
  });

  it("has an accessible name that starts with its visible label", () => {
    render(<HelpButton tone="client" prominent onClick={() => {}} />);
    const button = screen.getByRole("button", { name: "Help and guides" });
    expect(button.getAttribute("aria-label")).toMatch(/^Help\b/);
  });
});

describe("HelpButton, compact (the default)", () => {
  it("is the icon alone", () => {
    render(<HelpButton tone="client" onClick={() => {}} />);
    expect(screen.getByRole("button", { name: "Help and guides" })).toHaveTextContent("");
  });
});

describe.each([
  ["prominent", true],
  ["compact", false],
])("HelpButton, %s, in either form", (_label, prominent) => {
  it("announces that it opens a dialog", () => {
    render(<HelpButton tone="admin" prominent={prominent} onClick={() => {}} />);
    expect(screen.getByRole("button", { name: "Help and guides" })).toHaveAttribute(
      "aria-haspopup",
      "dialog",
    );
  });

  it("calls onClick when activated by mouse or keyboard", async () => {
    const onClick = vi.fn();
    render(<HelpButton tone="client" prominent={prominent} onClick={onClick} />);
    const button = screen.getByRole("button", { name: "Help and guides" });
    await userEvent.click(button);
    button.focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(3);
  });

  it("passes through extra attributes such as tour anchors", () => {
    render(
      <HelpButton tone="admin" prominent={prominent} onClick={() => {}} data-tour="help-button" />,
    );
    expect(screen.getByRole("button", { name: "Help and guides" })).toHaveAttribute(
      "data-tour",
      "help-button",
    );
  });

  it("hides the decorative icon from assistive tech", () => {
    render(<HelpButton tone="client" prominent={prominent} onClick={() => {}} />);
    const svg = screen.getByRole("button").querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });
});
