// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TourActiveProvider, useTourActive } from "./TourActiveContext";

function Probe() {
  return <span>{useTourActive() ? "active" : "idle"}</span>;
}

describe("TourActiveContext", () => {
  it("defaults to idle with no provider", () => {
    render(<Probe />);
    expect(screen.getByText("idle")).toBeInTheDocument();
  });

  it("reports active when the provider is active", () => {
    render(
      <TourActiveProvider active={true}>
        <Probe />
      </TourActiveProvider>
    );
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("reports idle when the provider is inactive", () => {
    render(
      <TourActiveProvider active={false}>
        <Probe />
      </TourActiveProvider>
    );
    expect(screen.getByText("idle")).toBeInTheDocument();
  });
});
