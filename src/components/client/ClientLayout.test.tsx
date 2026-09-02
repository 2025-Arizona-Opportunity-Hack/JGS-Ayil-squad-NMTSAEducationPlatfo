// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("convex/react", () => ({
  useQuery: () => ({
    _id: "user-1",
    firstName: "Sam",
    lastName: "Ray",
    profilePictureId: undefined,
    profilePictureUrl: undefined,
    effectivePermissions: ["share_content"],
  }),
  useMutation: () => vi.fn(),
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
}));
vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({ signOut: vi.fn() }),
}));

import { ClientLayout } from "./ClientLayout";

describe("ClientLayout guides", () => {
  beforeEach(() => localStorage.clear());

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
    render(
      <MemoryRouter>
        <ClientLayout />
      </MemoryRouter>
    );
    await userEvent.click(screen.getAllByRole("button", { name: /help and guides/i })[0]);
    expect(screen.queryByText(/recommending content to a client/i)).not.toBeInTheDocument();
  });
});
