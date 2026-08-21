// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, screen, waitFor } from "@testing-library/react";

const mutate = vi.fn();
const { useMutation, useQuery } = vi.hoisted(() => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(() => undefined),
}));
vi.mock("convex/react", () => ({ useMutation, useQuery }));

const { toastError, toastSuccess } = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: { error: toastError, success: toastSuccess },
}));

// Radix Select can't be driven under happy-dom (portals + pointer-capture APIs
// are missing), so swap it for a native <select> that forwards onValueChange.
vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    children: React.ReactNode;
  }) => (
    <select
      value={value}
      onChange={(e) => onValueChange((e.target as HTMLSelectElement).value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) => <option value={value}>{children}</option>,
}));

import { DuplicateQuizDialog } from "./DuplicateQuizDialog";
import type { Id } from "../../../convex/_generated/dataModel";

const quiz = { _id: "quiz1" as Id<"quizzes">, title: "Safety Basics" };

// Served for both listContent and listContentGroups; carries both a content
// `title` and a bundle `name` so either target type has an option to pick.
const targetDoc = { _id: "target123", title: "Video B", name: "Bundle B" };

/** [0] = target-type select, [1] = target select (DOM order). */
function getSelects() {
  return Array.from(document.querySelectorAll("select"));
}

beforeEach(() => {
  mutate.mockReset();
  useMutation.mockReturnValue(mutate);
  useQuery.mockReset();
  useQuery.mockReturnValue(undefined);
  toastError.mockReset();
  toastSuccess.mockReset();
});

describe("DuplicateQuizDialog", () => {
  it("skips the content/bundle list queries while closed", () => {
    render(
      <DuplicateQuizDialog
        quiz={null}
        onOpenChange={() => {}}
        onDuplicated={() => {}}
      />
    );
    expect(useQuery).toHaveBeenCalledTimes(2);
    expect(useQuery.mock.calls[0]?.[1]).toBe("skip");
    expect(useQuery.mock.calls[1]?.[1]).toBe("skip");
  });

  it("runs the list queries and prefills the title when open", () => {
    render(
      <DuplicateQuizDialog
        quiz={quiz}
        onOpenChange={() => {}}
        onDuplicated={() => {}}
      />
    );
    expect(useQuery.mock.calls[0]?.[1]).toEqual({});
    expect(useQuery.mock.calls[1]?.[1]).toEqual({});
    expect(screen.getByLabelText("Title")).toHaveValue("Copy of Safety Basics");
  });

  it("disables Duplicate until a target is chosen and never calls the mutation", () => {
    render(
      <DuplicateQuizDialog
        quiz={quiz}
        onOpenChange={() => {}}
        onDuplicated={() => {}}
      />
    );
    const button = screen.getByRole("button", { name: "Duplicate" });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(mutate).not.toHaveBeenCalled();
  });

  it("submits contentId (not groupId) for a content target and reports the new id", async () => {
    useQuery.mockReturnValue([targetDoc]);
    mutate.mockResolvedValue("newQuizId");
    const onDuplicated = vi.fn();
    render(
      <DuplicateQuizDialog
        quiz={quiz}
        onOpenChange={() => {}}
        onDuplicated={onDuplicated}
      />
    );

    fireEvent.change(getSelects()[1], { target: { value: "target123" } });
    fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));

    await waitFor(() => expect(onDuplicated).toHaveBeenCalledWith("newQuizId"));
    expect(mutate).toHaveBeenCalledWith({
      sourceQuizId: quiz._id,
      contentId: "target123",
      groupId: undefined,
      title: "Copy of Safety Basics",
    });
    expect(toastSuccess).toHaveBeenCalled();
  });

  it("submits groupId (not contentId) for a bundle target", async () => {
    useQuery.mockReturnValue([targetDoc]);
    mutate.mockResolvedValue("newQuizId");
    render(
      <DuplicateQuizDialog
        quiz={quiz}
        onOpenChange={() => {}}
        onDuplicated={() => {}}
      />
    );

    fireEvent.change(getSelects()[0], { target: { value: "bundle" } });
    fireEvent.change(getSelects()[1], { target: { value: "target123" } });
    fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));

    await waitFor(() =>
      expect(mutate).toHaveBeenCalledWith({
        sourceQuizId: quiz._id,
        contentId: undefined,
        groupId: "target123",
        title: "Copy of Safety Basics",
      })
    );
  });

  it("surfaces a server error via toast and does not report success", async () => {
    useQuery.mockReturnValue([targetDoc]);
    mutate.mockRejectedValue(new Error("Content not found"));
    const onDuplicated = vi.fn();
    render(
      <DuplicateQuizDialog
        quiz={quiz}
        onOpenChange={() => {}}
        onDuplicated={onDuplicated}
      />
    );

    fireEvent.change(getSelects()[1], { target: { value: "target123" } });
    fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("Content not found")
    );
    expect(onDuplicated).not.toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});
