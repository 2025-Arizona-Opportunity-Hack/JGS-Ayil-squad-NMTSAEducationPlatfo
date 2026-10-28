// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { getFunctionName } from "convex/server";

const mocks = vi.hoisted(() => ({
  prominentHelpButton: undefined as boolean | undefined,
}));

vi.mock("convex/react", () => ({
  // Site settings are the only query whose answer these tests vary.
  useQuery: (ref: Parameters<typeof getFunctionName>[0]) =>
    getFunctionName(ref) === "siteSettings:getSiteSettings"
      ? { organizationName: "NMTSA", prominentHelpButton: mocks.prominentHelpButton }
      : undefined,
  useMutation: () => vi.fn(),
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
}));
vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({ signOut: vi.fn() }),
}));

import { ClientHeader } from "./ClientHeader";

function renderHeader(onHelpClick = () => {}) {
  return render(
    <MemoryRouter>
      <ClientHeader onProfileClick={() => {}} onHelpClick={onHelpClick} />
    </MemoryRouter>
  );
}

describe("ClientHeader", () => {
  beforeEach(() => {
    mocks.prominentHelpButton = undefined;
  });

  it("renders a help button", () => {
    renderHeader();
    expect(screen.getAllByRole("button", { name: /help/i }).length).toBeGreaterThan(0);
  });

  it("calls onHelpClick when the help button is used", async () => {
    const onHelpClick = vi.fn();
    renderHeader(onHelpClick);
    await userEvent.click(screen.getAllByRole("button", { name: /help/i })[0]);
    expect(onHelpClick).toHaveBeenCalledTimes(1);
  });

  it("anchors the tour to home, browse, shop and profile", () => {
    const { container } = renderHeader();
    for (const anchor of ["client-nav-home", "client-nav-browse", "client-nav-shop", "client-nav-profile"]) {
      expect(container.querySelector(`[data-tour="${anchor}"]`)).not.toBeNull();
    }
  });

  it("shows the small help icon while the site setting is off", () => {
    renderHeader();
    for (const button of screen.getAllByRole("button", { name: "Help and guides" })) {
      expect(button).toHaveTextContent("");
    }
  });

  it("says Help in both layouts once the site setting is on", () => {
    mocks.prominentHelpButton = true;
    renderHeader();
    // One in the phone header, one in the wider header.
    const buttons = screen.getAllByRole("button", { name: "Help and guides" });
    expect(buttons).toHaveLength(2);
    for (const button of buttons) expect(button).toHaveTextContent("Help");
  });
});
