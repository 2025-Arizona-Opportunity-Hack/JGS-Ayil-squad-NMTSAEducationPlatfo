// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const signOut = vi.fn();
let isAuthenticated = true;

vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({ signOut }),
}));
vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isAuthenticated, isLoading: false }),
}));

import { SignOutButton } from "./SignOutButton";

describe("SignOutButton", () => {
  beforeEach(() => {
    signOut.mockReset();
    isAuthenticated = true;
  });

  it("renders a sign-out control when authenticated", () => {
    render(<SignOutButton />);
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });

  it("calls signOut when clicked", async () => {
    render(<SignOutButton />);
    await userEvent.click(screen.getByRole("button", { name: /sign out/i }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when not authenticated", () => {
    isAuthenticated = false;
    const { container } = render(<SignOutButton />);
    expect(container).toBeEmptyDOMElement();
  });
});
