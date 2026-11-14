// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { api } from "../../convex/_generated/api";
import { getDefaultPermissions } from "../../convex/permissions";

const { useQuery, useMutation, deleteUser } = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  deleteUser: vi.fn(async () => null),
}));

vi.mock("convex/react", () => ({ useQuery, useMutation }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { UserManager } from "./UserManager";

function person(userId: string, role: string, firstName: string) {
  return { _id: `p-${userId}`, userId, role, firstName, lastName: "Test", email: `${userId}@test.local` };
}

const users = [
  person("owner1", "owner", "Olive"),
  person("admin1", "admin", "Adam"),
  person("admin2", "admin", "Ada"),
  person("client1", "client", "Cleo"),
  { ...person("client2", "client", "Rory"), isRemoved: true },
];

function signInAs(userId: string, role: string) {
  useQuery.mockImplementation((ref: unknown) => {
    const name = getFunctionName(ref as never);
    if (name === getFunctionName(api.users.listUsers)) return users;
    if (name === getFunctionName(api.users.getCurrentUserProfile)) {
      return { ...person(userId, role, "Me"), effectivePermissions: getDefaultPermissions(role) };
    }
    return undefined;
  });
}

const deleteButtonFor = (name: string) =>
  screen.queryByRole("button", { name: `Delete ${name} Test` });

describe("UserManager delete", () => {
  beforeEach(() => {
    deleteUser.mockClear();
    useMutation.mockImplementation((ref: unknown) =>
      getFunctionName(ref as never) === getFunctionName(api.users.deleteUser) ? deleteUser : vi.fn(),
    );
  });

  it("an owner can delete admins and clients, but not themselves", () => {
    signInAs("owner1", "owner");
    render(<UserManager />);
    expect(deleteButtonFor("Olive")).toBeNull();
    expect(deleteButtonFor("Adam")).toBeInTheDocument();
    expect(deleteButtonFor("Ada")).toBeInTheDocument();
    expect(deleteButtonFor("Cleo")).toBeInTheDocument();
  });

  it("an admin can delete people below admin only", () => {
    signInAs("admin1", "admin");
    render(<UserManager />);
    expect(deleteButtonFor("Olive")).toBeNull();
    expect(deleteButtonFor("Adam")).toBeNull();
    expect(deleteButtonFor("Ada")).toBeNull();
    expect(deleteButtonFor("Cleo")).toBeInTheDocument();
  });

  it("a removed person is labelled Removed and offers no actions", () => {
    signInAs("owner1", "owner");
    render(<UserManager />);
    expect(deleteButtonFor("Rory")).toBeNull();
    expect(screen.getAllByText("Removed").length).toBeGreaterThanOrEqual(1);
  });

  it("an editor sees no delete buttons", () => {
    signInAs("editor1", "editor");
    render(<UserManager />);
    expect(screen.queryAllByRole("button", { name: /^Delete / })).toEqual([]);
  });

  it("deletes only after the confirmation is accepted", async () => {
    signInAs("owner1", "owner");
    render(<UserManager />);
    fireEvent.click(deleteButtonFor("Cleo")!);
    expect(await screen.findByText("Delete Cleo Test?")).toBeInTheDocument();
    expect(deleteUser).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Delete user" }));
    await waitFor(() => expect(deleteUser).toHaveBeenCalledWith({ userId: "client1" }));
  });
});
