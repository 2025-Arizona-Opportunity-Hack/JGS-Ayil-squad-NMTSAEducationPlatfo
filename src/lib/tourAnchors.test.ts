import { describe, it, expect } from "vitest";
import { navAnchor } from "./tourAnchors";

describe("navAnchor", () => {
  it("lower-cases a single-word label", () => {
    expect(navAnchor("Home")).toBe("client-nav-home");
    expect(navAnchor("Browse")).toBe("client-nav-browse");
    expect(navAnchor("Shop")).toBe("client-nav-shop");
  });

  // The whole point of the extraction: the bottom bar used to omit this, so a
  // two-word item would have emitted "client-nav-for you" and missed the tour.
  it("hyphenates the whitespace in a multi-word label", () => {
    expect(navAnchor("For You")).toBe("client-nav-for-you");
  });

  it("collapses runs of whitespace to a single hyphen", () => {
    expect(navAnchor("For   You")).toBe("client-nav-for-you");
  });
});
