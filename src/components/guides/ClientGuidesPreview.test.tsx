// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClientGuidesPreview } from "./ClientGuidesPreview";
import { getGuidesFor } from "./guideContent";
import { PERMISSIONS } from "@/lib/permissions";

// An owner holds every permission, so this is what they would see.
const CLIENT_GUIDES = getGuidesFor("client", [
  PERMISSIONS.RECOMMEND_CONTENT,
  PERMISSIONS.SHARE_CONTENT,
]);

describe("ClientGuidesPreview", () => {
  it("lists every client guide, including the professional-only one", () => {
    render(<ClientGuidesPreview guides={CLIENT_GUIDES} open onClose={() => {}} />);
    for (const guide of CLIENT_GUIDES) {
      expect(screen.getByText(guide.title)).toBeInTheDocument();
    }
    expect(screen.getByText("Recommending content to a client")).toBeInTheDocument();
  });

  it("shows the written steps so they can be read for accuracy", () => {
    render(<ClientGuidesPreview guides={CLIENT_GUIDES} open onClose={() => {}} />);
    const gettingAround = CLIENT_GUIDES.find((g) => g.id === "client-getting-around")!;
    for (const step of gettingAround.writtenSteps) {
      expect(screen.getByText(step.detail)).toBeInTheDocument();
    }
  });

  it("shows the walkthrough's wording as text, labelled as such", () => {
    render(<ClientGuidesPreview guides={CLIENT_GUIDES} open onClose={() => {}} />);
    const gettingAround = CLIENT_GUIDES.find((g) => g.id === "client-getting-around")!;
    expect(gettingAround.tourStops.length).toBeGreaterThan(0);
    for (const stop of gettingAround.tourStops) {
      expect(screen.getByText(stop.description)).toBeInTheDocument();
    }
    expect(screen.getByText("Walkthrough wording")).toBeInTheDocument();
  });

  it("offers no way to start a tour, which cannot run outside the client portal", () => {
    render(<ClientGuidesPreview guides={CLIENT_GUIDES} open onClose={() => {}} />);
    expect(screen.queryByRole("button", { name: /start tour/i })).not.toBeInTheDocument();
  });

  it("flags which guides only some clients are offered", () => {
    render(<ClientGuidesPreview guides={CLIENT_GUIDES} open onClose={() => {}} />);
    const gated = CLIENT_GUIDES.filter((g) => g.requiredPermission);
    expect(gated.length).toBeGreaterThan(0);
    expect(screen.getAllByText(/only shown to clients who can do this/i)).toHaveLength(
      gated.length
    );
  });

  it("says plainly that this is a read-only preview of what clients see", () => {
    render(<ClientGuidesPreview guides={CLIENT_GUIDES} open onClose={() => {}} />);
    expect(screen.getByText(/what clients see/i)).toBeInTheDocument();
  });
});
