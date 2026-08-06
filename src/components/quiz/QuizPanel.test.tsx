// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockUseQuery = vi.fn();
const mockMutation = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: () => mockMutation,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { QuizPanel } from "./QuizPanel";

const baseQuiz = {
  quizId: "quiz1",
  title: "Judge Training Check",
  description: "Confirm you understood the video",
  passingScore: 70,
  maxAttempts: null,
  revealAnswers: "correctness",
  requireContentCompletion: false,
  questionCount: 2,
  questions: [
    {
      _id: "q1",
      order: 1,
      prompt: "What matters most?",
      kind: "single",
      points: 1,
      options: [
        { id: "a", text: "Impact" },
        { id: "b", text: "Fonts" },
      ],
    },
    {
      _id: "q2",
      order: 2,
      prompt: "Pick all criteria",
      kind: "multi",
      points: 1,
      options: [
        { id: "x", text: "Impact" },
        { id: "y", text: "Feasibility" },
      ],
    },
  ],
  status: {
    attemptsUsed: 0,
    attemptsRemaining: null,
    bestScore: null,
    passed: false,
    locked: false,
    lockReason: null,
  },
};

function mockQueries({ quiz, attempts = [] }: { quiz: unknown; attempts?: unknown[] }) {
  mockUseQuery.mockImplementation((_ref: unknown, args: unknown) => {
    if (args === "skip") return undefined;
    if (args && typeof args === "object" && "quizId" in (args as object)) {
      return attempts;
    }
    return quiz;
  });
}

describe("QuizPanel", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockMutation.mockReset();
  });

  it("renders nothing when there is no quiz for the target", () => {
    mockQueries({ quiz: null });
    const { container } = render(<QuizPanel contentId={"c1" as never} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders accessible question groups with radio and checkbox inputs", async () => {
    mockQueries({ quiz: baseQuiz });
    render(<QuizPanel contentId={"c1" as never} />);

    await userEvent.click(screen.getByRole("button", { name: /start quiz/i }));

    // fieldset/legend => role group with the prompt as accessible name
    expect(
      screen.getByRole("group", { name: /what matters most/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: /pick all criteria/i })
    ).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
  });

  it("submits selected answers and announces the graded result", async () => {
    mockQueries({ quiz: baseQuiz });
    mockMutation.mockResolvedValue({
      attemptId: "attempt1",
      attemptNumber: 1,
      score: 50,
      passed: false,
      pointsEarned: 1,
      pointsPossible: 2,
      passingScore: 70,
      results: [
        { questionId: "q1", correct: true },
        { questionId: "q2", correct: false },
      ],
    });
    render(<QuizPanel contentId={"c1" as never} />);

    await userEvent.click(screen.getByRole("button", { name: /start quiz/i }));
    await userEvent.click(screen.getByRole("radio", { name: /impact/i }));
    await userEvent.click(
      screen.getByRole("button", { name: /submit answers/i })
    );

    await waitFor(() => {
      expect(mockMutation).toHaveBeenCalledWith({
        quizId: "quiz1",
        answers: [
          { questionId: "q1", selectedOptionIds: ["a"] },
          { questionId: "q2", selectedOptionIds: [] },
        ],
      });
    });

    // Result is rendered inside the aria-live region, with text (not just color)
    expect(await screen.findByText(/not passed — 50%/i)).toBeInTheDocument();
    expect(screen.getByText(/— correct/i)).toBeInTheDocument();
    expect(screen.getByText(/— incorrect/i)).toBeInTheDocument();
  });

  it("shows the locked state and withholds questions", () => {
    mockQueries({
      quiz: {
        ...baseQuiz,
        questions: [],
        status: {
          ...baseQuiz.status,
          locked: true,
          lockReason: "content_not_completed",
        },
      },
    });
    render(<QuizPanel contentId={"c1" as never} />);

    expect(
      screen.getByText(/finish the content to unlock this quiz/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /start quiz/i })
    ).not.toBeInTheDocument();
  });

  it("lets the learner send feedback after an attempt", async () => {
    mockQueries({ quiz: baseQuiz });
    mockMutation.mockResolvedValue({
      attemptId: "attempt1",
      attemptNumber: 1,
      score: 100,
      passed: true,
      pointsEarned: 2,
      pointsPossible: 2,
      passingScore: 70,
      results: null,
    });
    render(<QuizPanel contentId={"c1" as never} />);

    await userEvent.click(screen.getByRole("button", { name: /start quiz/i }));
    await userEvent.click(
      screen.getByRole("button", { name: /submit answers/i })
    );
    await screen.findByText(/you passed — 100%/i);

    const feedbackBox = screen.getByLabelText(/any feedback for us/i);
    await userEvent.type(feedbackBox, "Great video, clear quiz.");
    mockMutation.mockResolvedValueOnce(null);
    await userEvent.click(
      screen.getByRole("button", { name: /send feedback/i })
    );

    await waitFor(() => {
      expect(mockMutation).toHaveBeenCalledWith({
        attemptId: "attempt1",
        feedback: "Great video, clear quiz.",
      });
    });
    expect(
      await screen.findByText(/feedback sent — thank you/i)
    ).toBeInTheDocument();
  });

  it("shows attempt history with pass/fail text", () => {
    mockQueries({
      quiz: { ...baseQuiz, status: { ...baseQuiz.status, attemptsUsed: 2, passed: true, bestScore: 80 } },
      attempts: [
        {
          _id: "a1",
          attemptNumber: 1,
          submittedAt: 1700000000000,
          score: 40,
          passed: false,
          pointsEarned: 1,
          pointsPossible: 2,
          learnerFeedback: null,
          learnerFeedbackAt: null,
          answers: null,
        },
        {
          _id: "a2",
          attemptNumber: 2,
          submittedAt: 1700086400000,
          score: 80,
          passed: true,
          pointsEarned: 2,
          pointsPossible: 2,
          learnerFeedback: null,
          learnerFeedbackAt: null,
          answers: null,
        },
      ],
    });
    render(<QuizPanel contentId={"c1" as never} />);

    expect(screen.getByText(/attempt 1: 40% \(not passed\)/i)).toBeInTheDocument();
    expect(screen.getByText(/attempt 2: 80% \(passed\)/i)).toBeInTheDocument();
  });
});
