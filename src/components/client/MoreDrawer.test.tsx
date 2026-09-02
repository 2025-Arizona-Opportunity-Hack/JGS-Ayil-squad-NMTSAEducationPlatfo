// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { MoreDrawer } from "./MoreDrawer";

describe("MoreDrawer", () => {
  it("offers Help alongside the navigation items", () => {
    render(
      <MemoryRouter>
        <MoreDrawer open onOpenChange={() => {}} onHelpClick={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByRole("button", { name: /help/i })).toBeInTheDocument();
  });

  it("calls onHelpClick and closes the drawer", async () => {
    const onHelpClick = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <MemoryRouter>
        <MoreDrawer open onOpenChange={onOpenChange} onHelpClick={onHelpClick} />
      </MemoryRouter>
    );
    await userEvent.click(screen.getByRole("button", { name: /help/i }));
    expect(onHelpClick).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
