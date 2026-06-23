// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

const { useQuery, useMutation } = vi.hoisted(() => ({
  useQuery: vi.fn(() => undefined),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("convex/react", () => ({ useQuery, useMutation }));

import { ClientInviteModal } from "./ClientInviteModal";

// ClientInviteModal makes exactly one useQuery call: listClientInvites, the
// privileged query that throws (and blanked the app) for unauthorized users.
function listClientInvitesArg(): unknown {
  expect(useQuery).toHaveBeenCalledTimes(1);
  return useQuery.mock.calls[0]?.[1];
}

describe("ClientInviteModal query gating", () => {
  beforeEach(() => {
    useQuery.mockClear();
  });

  it("skips listClientInvites while the modal is closed", () => {
    render(<ClientInviteModal open={false} onOpenChange={() => {}} />);
    expect(listClientInvitesArg()).toBe("skip");
  });

  it("runs listClientInvites when the modal is open", () => {
    render(<ClientInviteModal open={true} onOpenChange={() => {}} />);
    expect(listClientInvitesArg()).toEqual({});
  });
});
