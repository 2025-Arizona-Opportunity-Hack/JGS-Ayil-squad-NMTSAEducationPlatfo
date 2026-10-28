// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  settings: { organizationName: "NMTSA", prominentHelpButton: undefined as boolean | undefined },
  update: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useQuery: () => mocks.settings,
  useMutation: () => mocks.update,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from "sonner";
import { HelpButtonSetting } from "./HelpButtonSetting";

describe("HelpButtonSetting", () => {
  beforeEach(() => {
    mocks.settings.prominentHelpButton = undefined;
    mocks.update.mockReset();
    mocks.update.mockResolvedValue(undefined);
  });

  it("is a labelled, described switch that starts off", () => {
    render(<HelpButtonSetting />);
    const toggle = screen.getByRole("switch", { name: "Larger, labelled Help button" });
    expect(toggle).not.toBeChecked();
    expect(toggle).toHaveAccessibleDescription(/replaces the small question-mark icon/i);
  });

  it("reflects the saved setting", () => {
    mocks.settings.prominentHelpButton = true;
    render(<HelpButtonSetting />);
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("saves as soon as it is switched", async () => {
    render(<HelpButtonSetting />);
    await userEvent.click(screen.getByRole("switch"));
    expect(mocks.update).toHaveBeenCalledWith({ prominentHelpButton: true });
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it("can switch it back off", async () => {
    mocks.settings.prominentHelpButton = true;
    render(<HelpButtonSetting />);
    await userEvent.click(screen.getByRole("switch"));
    expect(mocks.update).toHaveBeenCalledWith({ prominentHelpButton: false });
  });

  it("says so when saving fails", async () => {
    mocks.update.mockRejectedValue(new Error("nope"));
    render(<HelpButtonSetting />);
    await userEvent.click(screen.getByRole("switch"));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByRole("switch")).not.toBeChecked();
  });

  it("previews the chosen form without adding a working button", () => {
    mocks.settings.prominentHelpButton = true;
    render(<HelpButtonSetting />);
    const preview = screen.getByText("Help");
    // Inert keeps the picture out of the tab order and the accessibility tree.
    // Testing Library's role queries don't model inert, so assert it directly.
    expect(preview.closest("[inert]")).not.toBeNull();
  });
});
