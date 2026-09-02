// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

// Hoisted so the mock factory (itself hoisted above the imports) can close
// over a profile each test is free to change.
const mocks = vi.hoisted(() => ({
  profile: {
    _id: "user-1",
    firstName: "Sam",
    lastName: "Ray",
    profilePictureId: undefined,
    profilePictureUrl: undefined,
    effectivePermissions: ["share_content"] as string[],
  },
}));

vi.mock("convex/react", () => ({
  useQuery: () => mocks.profile,
  useMutation: () => vi.fn(),
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
}));
vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({ signOut: vi.fn() }),
}));

import { ClientLayout } from "./ClientLayout";

describe("ClientLayout guides", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.profile.effectivePermissions = ["share_content"];
  });

  function renderLayout() {
    return render(
      <MemoryRouter>
        <ClientLayout />
      </MemoryRouter>
    );
  }

  it("opens the guides launcher from the header help button", async () => {
    render(
      <MemoryRouter>
        <ClientLayout />
      </MemoryRouter>
    );
    await userEvent.click(screen.getAllByRole("button", { name: /help and guides/i })[0]);
    expect(screen.getByText(/getting around/i)).toBeInTheDocument();
  });

  it("offers client guides but not staff guides", async () => {
    render(
      <MemoryRouter>
        <ClientLayout />
      </MemoryRouter>
    );
    await userEvent.click(screen.getAllByRole("button", { name: /help and guides/i })[0]);
    expect(screen.queryByText(/create content \(all the fields\)/i)).not.toBeInTheDocument();
  });

  it("hides the recommend guide from a client without RECOMMEND_CONTENT", async () => {
    renderLayout();
    await userEvent.click(screen.getAllByRole("button", { name: /help and guides/i })[0]);
    expect(screen.queryByText(/recommending content to a client/i)).not.toBeInTheDocument();
  });

  // The negative case alone passes even if the layout stops passing
  // permissions at all — hasPermission(undefined, ...) is false, so the guide
  // would vanish for every professional with the suite still green.
  it("offers the recommend guide to a professional holding RECOMMEND_CONTENT", async () => {
    mocks.profile.effectivePermissions = ["share_content", "recommend_content"];
    renderLayout();
    await userEvent.click(screen.getAllByRole("button", { name: /help and guides/i })[0]);
    expect(screen.getByText(/recommending content to a client/i)).toBeInTheDocument();
  });

  it("stops prompting once the header help button has been used", async () => {
    renderLayout();
    expect(screen.getByText(/first time here/i)).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole("button", { name: /help and guides/i })[0]);

    expect(localStorage.getItem("guides-client-prompt-seen:user-1")).toBe("true");
    expect(screen.queryByText(/first time here/i)).not.toBeInTheDocument();
  });
});
