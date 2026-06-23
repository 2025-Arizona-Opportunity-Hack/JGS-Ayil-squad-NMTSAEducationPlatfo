// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

const { useQuery, useMutation } = vi.hoisted(() => ({
  useQuery: vi.fn(() => undefined),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("convex/react", () => ({ useQuery, useMutation }));

import { InviteCodeModal } from "./InviteCodeModal";

// InviteCodeModal makes exactly one useQuery call: listInviteCodes (the
// privileged query that, if run for an unauthorized user, throws and blanks the
// app). Return the args it was invoked with.
function listInviteCodesArg(): unknown {
  expect(useQuery).toHaveBeenCalledTimes(1);
  return useQuery.mock.calls[0]?.[1];
}

describe("InviteCodeModal query gating", () => {
  beforeEach(() => {
    useQuery.mockClear();
  });

  it("skips listInviteCodes while the modal is closed", () => {
    render(<InviteCodeModal open={false} onOpenChange={() => {}} />);
    expect(listInviteCodesArg()).toBe("skip");
  });

  it("runs listInviteCodes when the modal is open", () => {
    render(<InviteCodeModal open={true} onOpenChange={() => {}} />);
    expect(listInviteCodesArg()).toEqual({});
  });
});
