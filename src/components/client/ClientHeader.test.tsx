// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("convex/react", () => ({
  useQuery: () => undefined,
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
});
