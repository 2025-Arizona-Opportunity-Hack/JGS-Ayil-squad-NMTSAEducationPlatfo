// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GuidesLauncher } from "./GuidesLauncher";
import { getGuidesFor, type Guide } from "./guideContent";
import { PERMISSIONS } from "@/lib/permissions";

const ADMIN_GUIDES = getGuidesFor("admin", [
  PERMISSIONS.CREATE_CONTENT,
  PERMISSIONS.SET_CONTENT_PRICING,
  PERMISSIONS.MANAGE_CONTENT_GROUPS,
]);

describe("GuidesLauncher", () => {
  it("renders an entry for every guide", () => {
    render(
      <GuidesLauncher guides={ADMIN_GUIDES} open onClose={() => {}} onReadSteps={() => {}} onStartTour={() => {}} />
    );
    for (const g of ADMIN_GUIDES) {
      expect(screen.getByText(g.title)).toBeInTheDocument();
    }
  });

  it("calls onReadSteps with the guide id", async () => {
    const onReadSteps = vi.fn();
    render(
      <GuidesLauncher guides={ADMIN_GUIDES} open onClose={() => {}} onReadSteps={onReadSteps} onStartTour={() => {}} />
    );
    const buttons = screen.getAllByRole("button", { name: /read steps/i });
    await userEvent.click(buttons[0]);
    expect(onReadSteps).toHaveBeenCalledWith(ADMIN_GUIDES[0].id);
  });

  it("calls onStartTour with the guide id", async () => {
    const onStartTour = vi.fn();
    render(
      <GuidesLauncher guides={ADMIN_GUIDES} open onClose={() => {}} onReadSteps={() => {}} onStartTour={onStartTour} />
    );
    const buttons = screen.getAllByRole("button", { name: /start tour/i });
    await userEvent.click(buttons[0]);
    expect(onStartTour).toHaveBeenCalledWith(ADMIN_GUIDES[0].id);
  });
});

const ONE: Guide[] = [
  { id: "only", title: "Only Guide", summary: "just one", audience: "client", writtenSteps: [], tourStops: [] },
];

describe("GuidesLauncher guide list", () => {
  it("renders exactly the guides it is given", () => {
    render(
      <GuidesLauncher
        guides={ONE}
        open
        onClose={() => {}}
        onReadSteps={() => {}}
        onStartTour={() => {}}
      />
    );
    expect(screen.getByText("Only Guide")).toBeInTheDocument();
    expect(screen.queryByText(/create content/i)).not.toBeInTheDocument();
  });

  it("offers no tour for a guide with no tour stops", () => {
    render(
      <GuidesLauncher
        guides={ONE}
        open
        onClose={() => {}}
        onReadSteps={() => {}}
        onStartTour={() => {}}
      />
    );
    expect(screen.queryByRole("button", { name: /start tour/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /read steps/i })).toBeInTheDocument();
  });

  it("offers a tour for a guide that has stops", () => {
    const withStops: Guide[] = [
      {
        ...ONE[0],
        tourStops: [
          { target: "x", title: "T", description: "D", position: "bottom" },
        ],
      },
    ];
    render(
      <GuidesLauncher
        guides={withStops}
        open
        onClose={() => {}}
        onReadSteps={() => {}}
        onStartTour={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: /start tour/i })).toBeInTheDocument();
  });
});
