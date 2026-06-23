// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

// RecommendContentModal uses a Convex mutation; stub the client.
vi.mock("convex/react", () => ({
  useMutation: () => vi.fn(),
  useQuery: () => undefined,
}));

import { RecommendButton } from "./RecommendButton";
import { PERMISSIONS } from "@/lib/permissions";

describe("RecommendButton", () => {
  it("renders nothing for a user without RECOMMEND_CONTENT", () => {
    const { container } = render(
      <RecommendButton permissions={[]} contentId="c1" title="X" />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for an unauthenticated user (undefined permissions)", () => {
    const { container } = render(
      <RecommendButton permissions={undefined} contentId="c1" title="X" />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a Recommend button when the user has RECOMMEND_CONTENT", () => {
    render(
      <RecommendButton
        permissions={[PERMISSIONS.RECOMMEND_CONTENT]}
        contentId="c1"
        title="X"
      />
    );
    expect(screen.getByRole("button", { name: /^recommend$/i })).toBeInTheDocument();
  });

  it("opens the recommend modal when clicked", async () => {
    render(
      <RecommendButton
        permissions={[PERMISSIONS.RECOMMEND_CONTENT]}
        contentId="c1"
        title="My Video"
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /^recommend$/i }));
    expect(screen.getByLabelText(/recipient email/i)).toBeInTheDocument();
  });
});
