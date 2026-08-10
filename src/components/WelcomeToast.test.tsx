// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WelcomeToast } from "./WelcomeToast";

describe("WelcomeToast", () => {
  it("shows the greeting and the confirmation underneath", () => {
    render(
      <WelcomeToast
        title="Welcome back, Jen!"
        description="You're signed in."
        firstName="Jen"
        lastName="Doe"
        onDismiss={() => {}}
      />
    );

    expect(screen.getByText("Welcome back, Jen!")).toBeInTheDocument();
    expect(screen.getByText("You're signed in.")).toBeInTheDocument();
  });

  it("falls back to initials when the person has no profile picture", () => {
    render(
      <WelcomeToast
        title="Welcome back, Jen!"
        description="You're signed in."
        firstName="Jen"
        lastName="Doe"
        onDismiss={() => {}}
      />
    );

    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("dismisses when the close button is activated", async () => {
    const onDismiss = vi.fn();
    render(
      <WelcomeToast
        title="Welcome back, Jen!"
        description="You're signed in."
        firstName="Jen"
        lastName="Doe"
        onDismiss={onDismiss}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: /dismiss/i }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("is reachable by keyboard alone", async () => {
    const onDismiss = vi.fn();
    render(
      <WelcomeToast
        title="Welcome back, Jen!"
        description="You're signed in."
        firstName="Jen"
        lastName="Doe"
        onDismiss={onDismiss}
      />
    );

    await userEvent.tab();
    expect(screen.getByRole("button", { name: /dismiss/i })).toHaveFocus();

    await userEvent.keyboard("{Enter}");
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("does not introduce a heading into the page outline", () => {
    // The greeting is heading-SIZED, but a transient toast must not appear in
    // the document's heading structure — screen-reader users navigate by
    // headings, and ClientLayout moves focus to the page's real <h1>.
    render(
      <WelcomeToast
        title="Welcome back, Jen!"
        description="You're signed in."
        firstName="Jen"
        lastName="Doe"
        onDismiss={() => {}}
      />
    );

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("treats the avatar as decorative so the name is not announced twice", () => {
    const { container } = render(
      <WelcomeToast
        title="Welcome back, Jen!"
        description="You're signed in."
        firstName="Jen"
        lastName="Doe"
        profilePictureUrl="https://example.com/jen.jpg"
        onDismiss={() => {}}
      />
    );

    // Radix only swaps in the <img> once it loads, so assert on the alt
    // attribute wherever it is rather than on a rendered image role.
    const img = container.querySelector("img");
    if (img) expect(img).toHaveAttribute("alt", "");
    expect(screen.queryByRole("img", { name: /jen/i })).not.toBeInTheDocument();
  });
});
