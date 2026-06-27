// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";

const createShare = vi.fn();
const { useMutation } = vi.hoisted(() => ({ useMutation: vi.fn() }));
vi.mock("convex/react", () => ({ useMutation }));

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
