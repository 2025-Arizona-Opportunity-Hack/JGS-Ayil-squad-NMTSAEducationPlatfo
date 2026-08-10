import { describe, it, expect } from "vitest";
import { buildGreeting } from "./greeting";

describe("buildGreeting", () => {
  it("greets the user by first name", () => {
    expect(buildGreeting("Jen").title).toBe("Welcome back, Jen!");
  });

  it("drops the name rather than saying 'Welcome back, there!'", () => {
    expect(buildGreeting("").title).toBe("Welcome back!");
    expect(buildGreeting(undefined).title).toBe("Welcome back!");
  });

  it("treats a whitespace-only name as no name", () => {
    expect(buildGreeting("   ").title).toBe("Welcome back!");
  });

  it("trims surrounding whitespace from a real name", () => {
    expect(buildGreeting("  Jen  ").title).toBe("Welcome back, Jen!");
  });

  it("confirms the sign-in succeeded in the description", () => {
    expect(buildGreeting("Jen").description).toBe("You're signed in.");
  });
});
