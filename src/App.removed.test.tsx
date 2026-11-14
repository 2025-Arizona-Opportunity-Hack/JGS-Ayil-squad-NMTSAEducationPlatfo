// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { getFunctionName } from "convex/server";
import { api } from "../convex/_generated/api";

const { useQuery, signOut } = vi.hoisted(() => ({ useQuery: vi.fn(), signOut: vi.fn() }));
vi.mock("convex/react", () => ({ useQuery, useMutation: () => vi.fn(), useAction: () => vi.fn() }));
vi.mock("@convex-dev/auth/react", () => ({ useAuthActions: () => ({ signOut, signIn: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import App from "./App";

describe("App routing for a removed account", () => {
  it("shows the removed screen, not the sign-in form, when the account was removed", () => {
    useQuery.mockImplementation((ref: unknown) => {
      const name = getFunctionName(ref as never);
      if (name === getFunctionName(api.auth.loggedInUser)) return null; // removed users look signed out
      if (name === getFunctionName(api.users.getCurrentUserProfile)) {
        return { isRemoved: true, firstName: "Cleo", lastName: "Test", role: "client", effectivePermissions: [] };
      }
      if (name === getFunctionName(api.users.bootstrapNeeded)) return false;
      if (name === getFunctionName(api.siteSettings.isSetupNeeded)) return false;
      return undefined;
    });
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "This account has been removed" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });
});
