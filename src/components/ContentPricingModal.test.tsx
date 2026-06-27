// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";

const mutate = vi.fn();
const { useMutation, useQuery } = vi.hoisted(() => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(() => undefined),
}));
vi.mock("convex/react", () => ({ useMutation, useQuery }));

import { ContentPricingModal } from "./ContentPricingModal";
import type { Id } from "../../convex/_generated/dataModel";

const props = {
  isOpen: true,
  onClose: () => {},
  contentId: "example" as Id<"content">,
  contentTitle: "Demo item",
};

beforeEach(() => {
  mutate.mockReset();
  useMutation.mockReturnValue(mutate);
  useQuery.mockReset();
  useQuery.mockReturnValue(undefined);
});

describe("ContentPricingModal demoMode", () => {
  it("skips the pricing lookup query so an example id is never queried", () => {
    render(<ContentPricingModal {...props} demoMode />);
    expect(useQuery.mock.calls.at(-1)?.[1]).toBe("skip");
  });

  it("disables Save and never runs a mutation, even if the form is submitted", () => {
    render(<ContentPricingModal {...props} demoMode />);
    // Radix renders the dialog in a portal on document.body.
    const save = document.querySelector('[data-tour="pricing-field-save"]');
    expect(save).toBeDisabled();

    const form = document.querySelector("form")!;
    fireEvent.submit(form);
    expect(mutate).not.toHaveBeenCalled();
  });
});
