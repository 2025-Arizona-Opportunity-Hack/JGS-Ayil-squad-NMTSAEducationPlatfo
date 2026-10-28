// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
describe("GuidesLauncher client-guides preview", () => {
  it("offers the preview when a handler is supplied", async () => {
    const onPreviewClientGuides = vi.fn();
    render(
      <GuidesLauncher
        guides={ADMIN_GUIDES}
        open
        onClose={() => {}}
        onReadSteps={() => {}}
        onStartTour={() => {}}
        onPreviewClientGuides={onPreviewClientGuides}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /preview the client guides/i }));
    expect(onPreviewClientGuides).toHaveBeenCalledTimes(1);
  });

  it("omits the preview when no handler is supplied", () => {
    render(
      <GuidesLauncher guides={ADMIN_GUIDES} open onClose={() => {}} onReadSteps={() => {}} onStartTour={() => {}} />
    );
    expect(screen.queryByRole("button", { name: /preview the client guides/i })).not.toBeInTheDocument();
  });
});

const SEARCHABLE: Guide[] = [
  { id: "watch", title: "Watch a video", summary: "Play things.", audience: "client", writtenSteps: [], tourStops: [] },
  { id: "orders", title: "Your orders", summary: "Receipts and history.", audience: "client", writtenSteps: [], tourStops: [] },
];

function renderSearchable(props: Partial<React.ComponentProps<typeof GuidesLauncher>> = {}) {
  return render(
    <GuidesLauncher
      guides={SEARCHABLE}
      open
      onClose={() => {}}
      onReadSteps={() => {}}
      onStartTour={() => {}}
      {...props}
    />
  );
}

describe("GuidesLauncher search", () => {
  it("has a labelled search box with a hint", () => {
    renderSearchable();
    const box = screen.getByRole("searchbox", { name: "Search the guides" });
    expect(box).toHaveAccessibleDescription(/type a word or two/i);
  });

  it("puts focus in the search box when it opens", () => {
    renderSearchable();
    expect(screen.getByRole("searchbox", { name: "Search the guides" })).toHaveFocus();
  });

  it("filters the guides as you type", async () => {
    renderSearchable();
    await userEvent.type(screen.getByRole("searchbox"), "receipt");
    expect(screen.getByRole("heading", { name: "Your orders" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Watch a video" })).not.toBeInTheDocument();
  });

  it("announces the number of results", async () => {
    renderSearchable();
    expect(screen.getByRole("status")).toHaveTextContent("Showing all 2 guides.");
    await userEvent.type(screen.getByRole("searchbox"), "video");
    expect(await screen.findByText("1 guide matches “video”.")).toHaveAttribute("role", "status");
  });

  it("offers a way back when nothing matches", async () => {
    renderSearchable();
    const box = screen.getByRole("searchbox");
    await userEvent.type(box, "zzz");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(await screen.findByText("No guides match “zzz”.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Show all guides" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(box).toHaveValue("");
    expect(box).toHaveFocus();
  });

  it("clears the box with the clear button and returns focus to it", async () => {
    renderSearchable();
    const box = screen.getByRole("searchbox");
    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
    await userEvent.type(box, "video");
    await userEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(box).toHaveValue("");
    expect(box).toHaveFocus();
  });

  it("clears the search on the first Escape and closes only on the second", async () => {
    const onClose = vi.fn();
    renderSearchable({ onClose });
    const box = screen.getByRole("searchbox");
    await userEvent.type(box, "video");
    await userEvent.keyboard("{Escape}");
    expect(box).toHaveValue("");
    expect(onClose).not.toHaveBeenCalled();
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("starts with an empty search each time it opens", async () => {
    const { rerender } = renderSearchable();
    await userEvent.type(screen.getByRole("searchbox"), "video");
    const props = { guides: SEARCHABLE, onClose: () => {}, onReadSteps: () => {}, onStartTour: () => {} };
    rerender(<GuidesLauncher {...props} open={false} />);
    rerender(<GuidesLauncher {...props} open />);
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("names each guide's buttons after the guide", () => {
    renderSearchable();
    expect(screen.getByRole("button", { name: "Read steps for Watch a video" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Read steps for Your orders" })).toBeInTheDocument();
  });
});

describe("GuidesLauncher focus on close", () => {
  const base = { guides: SEARCHABLE, onClose: () => {}, onReadSteps: () => {}, onStartTour: () => {} };

  it("hands focus back to the control that opened it", async () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    const { rerender } = render(<GuidesLauncher {...base} open returnFocusTo={opener} />);
    rerender(<GuidesLauncher {...base} open={false} returnFocusTo={opener} />);
    await waitFor(() => expect(opener).toHaveFocus());
    opener.remove();
  });

  it("leaves focus alone when something else has already taken it", async () => {
    const opener = document.createElement("button");
    const next = document.createElement("button");
    document.body.append(opener, next);
    const { rerender } = render(<GuidesLauncher {...base} open returnFocusTo={opener} />);
    rerender(<GuidesLauncher {...base} open={false} returnFocusTo={opener} />);
    // Stands in for a guide or tour opened from the launcher taking focus.
    next.focus();
    await new Promise((r) => setTimeout(r, 20));
    expect(next).toHaveFocus();
    opener.remove();
    next.remove();
  });
});
