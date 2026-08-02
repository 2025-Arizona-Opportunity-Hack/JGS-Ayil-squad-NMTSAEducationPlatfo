// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockUseQuery = vi.fn();
const mockNavigate = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

import { QuizSignInNudge } from "./QuizSignInNudge";

const quiz = { title: "Knowledge check", questionCount: 3, passingScore: 70 };

describe("QuizSignInNudge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("shows the quiz summary and a sign-in path; no signup button when public signup is off", () => {
    mockUseQuery.mockReturnValue({ allowPublicSignup: false });
    render(<QuizSignInNudge contentId="c1" quiz={quiz} />);

    expect(screen.getByText("Knowledge check")).toBeInTheDocument();
    expect(screen.getByText("3 questions")).toBeInTheDocument();
    expect(screen.getByText("70% to pass")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in to take the quiz/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /create an account/i })
    ).not.toBeInTheDocument();
  });

  it("signing in stores the return-to-content id and navigates to login", async () => {
    mockUseQuery.mockReturnValue({ allowPublicSignup: false });
    const user = userEvent.setup();
    render(<QuizSignInNudge contentId="c1" quiz={quiz} />);

    await user.click(
      screen.getByRole("button", { name: /sign in to take the quiz/i })
    );

    expect(sessionStorage.getItem("returnToContent")).toBe("c1");
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("offers account creation when public signup is enabled", async () => {
    mockUseQuery.mockReturnValue({ allowPublicSignup: true });
    const user = userEvent.setup();
    render(<QuizSignInNudge contentId="c1" quiz={quiz} />);

    await user.click(
      screen.getByRole("button", { name: /create an account/i })
    );

    expect(sessionStorage.getItem("returnToContent")).toBe("c1");
    expect(mockNavigate).toHaveBeenCalledWith("/?signup=true");
  });
});
