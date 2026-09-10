// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getFunctionName } from "convex/server";

const createContent = vi.fn(async () => "new-content-id");
const { useMutation, useQuery, useAction } = vi.hoisted(() => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(() => undefined),
  useAction: vi.fn(() => vi.fn()),
}));
vi.mock("convex/react", () => ({ useMutation, useQuery, useAction }));

import { ContentManager } from "./ContentManager";
import { api } from "../../convex/_generated/api";

describe("ContentManager create form", () => {
  beforeEach(() => {
    createContent.mockClear();
    // `api.content.createContent` is a fresh Proxy on every property access
    // (see convex/server's `anyApi`), so `===` identity does not survive a
    // re-render. Every keystroke/click re-renders ContentManager and
    // re-invokes every `useMutation(...)` call, so we can't rely on call
    // order either (a cumulative call counter only matches on mount).
    // `getFunctionName` resolves the reference to its stable
    // "module:export" string, which is safe to compare across renders.
    const createContentName = getFunctionName(api.content.createContent);
    useMutation.mockImplementation((mutationRef: unknown) =>
      getFunctionName(mutationRef as Parameters<typeof getFunctionName>[0]) === createContentName
        ? createContent
        : vi.fn()
    );
  });

  it("submits isPublic: true when the public checkbox is ticked", async () => {
    render(<ContentManager />);

    // The button that OPENS the form is "Add Content" (ContentActions.tsx:75).
    // "Create Content" is the SUBMIT button inside the dialog
    // (ContentManager.tsx:1282). They are different controls.
    await userEvent.click(screen.getByRole("button", { name: /add content/i }));
    await userEvent.type(screen.getByLabelText(/^title/i), "Warm-up rhythms");
    await userEvent.click(
      screen.getByRole("checkbox", { name: /make this content public/i })
    );
    await userEvent.click(
      screen.getByRole("button", { name: /^create content$/i })
    );

    await waitFor(() => expect(createContent).toHaveBeenCalled());
    expect(createContent.mock.calls[0][0]).toMatchObject({ isPublic: true });
  });

  it("submits isPublic: false when the public checkbox is left unticked", async () => {
    // Pins the untouched default. The ticked case above only proves the box
    // can turn isPublic on; this one proves a form nobody touched still
    // submits false, so a flipped default (or a submit path that forces
    // public) can't ship unnoticed.
    render(<ContentManager />);

    await userEvent.click(screen.getByRole("button", { name: /add content/i }));
    await userEvent.type(screen.getByLabelText(/^title/i), "Warm-up rhythms");
    expect(
      screen.getByRole("checkbox", { name: /make this content public/i })
    ).not.toBeChecked();
    await userEvent.click(
      screen.getByRole("button", { name: /^create content$/i })
    );

    await waitFor(() => expect(createContent).toHaveBeenCalled());
    expect(createContent.mock.calls[0][0]).toMatchObject({ isPublic: false });
  });
});
