// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";

const createShare = vi.fn();
const { useMutation, useQuery } = vi.hoisted(() => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(() => undefined),
}));
vi.mock("convex/react", () => ({ useMutation, useQuery }));

import { ThirdPartyShareModal } from "./ThirdPartyShareModal";

const props = {
  isOpen: true,
  onClose: () => {},
  contentId: "example",
  contentTitle: "Demo item",
};

beforeEach(() => {
  createShare.mockReset();
  useMutation.mockReturnValue(createShare);
  useQuery.mockReset();
  useQuery.mockReturnValue(undefined);
});

describe("ThirdPartyShareModal blocked sharing", () => {
  it("shows the server's reason instead of the form when content is not shareable", () => {
    useQuery.mockReturnValue({
      canShare: false,
      reason: "Cannot share purchaseable content",
    });
    render(<ThirdPartyShareModal {...props} />);

    expect(
      document.body.textContent
    ).toContain("Sharing isn't available for this content");
    expect(document.body.textContent).toContain(
      "a third-party share link would give the recipient the paid content for free"
    );
    expect(document.querySelector("form")).toBeNull();
  });

  it("keeps Create disabled until shareability is confirmed", () => {
    useQuery.mockReturnValue(undefined); // still loading
    render(<ThirdPartyShareModal {...props} />);
    const save = document.querySelector('[data-tour="share-field-save"]');
    expect(save).toBeDisabled();
  });
});

describe("ThirdPartyShareModal demoMode", () => {
  it("disables Create and never creates a share, even if the form is submitted", () => {
    render(<ThirdPartyShareModal {...props} demoMode />);
    // Radix renders the dialog in a portal on document.body.
    const save = document.querySelector('[data-tour="share-field-save"]');
    expect(save).toBeDisabled();

    const form = document.querySelector("form")!;
    fireEvent.submit(form);
    expect(createShare).not.toHaveBeenCalled();
  });
});
