// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("convex/react", () => ({
  useMutation: () => vi.fn(),
  useQuery: () => undefined,
}));

import { GuideDemoHost } from "./GuideDemoHost";

describe("GuideDemoHost", () => {
  it("renders nothing when no tour is active", () => {
    const { container } = render(<GuideDemoHost activeTourId={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for a tour that doesn't use the example item", () => {
    const { container } = render(<GuideDemoHost activeTourId="content-statuses" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the example item and demo action buttons for the pricing tour", () => {
    render(<GuideDemoHost activeTourId="pricing-store" />);
    expect(screen.getByText(/example: intro to music therapy/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /set pricing/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^share$/i })).toBeInTheDocument();
  });
});
