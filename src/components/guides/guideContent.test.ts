import { describe, it, expect } from "vitest";
import { GUIDES } from "./guideContent";

describe("GUIDES", () => {
  it("includes all the expected guides", () => {
    const ids = GUIDES.map((g) => g.id);
    expect(ids).toContain("upload-content");
    expect(ids).toContain("share-content");
    expect(ids).toContain("content-statuses");
    expect(ids).toContain("pricing-store");
    expect(ids).toContain("create-bundle");
    expect(ids).toContain("write-article");
  });

  it("has unique guide ids", () => {
    const ids = GUIDES.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every guide has a title, summary, written steps, and tour stops", () => {
    for (const g of GUIDES) {
      expect(g.title.length).toBeGreaterThan(0);
      expect(g.summary.length).toBeGreaterThan(0);
      expect(g.writtenSteps.length).toBeGreaterThan(0);
      expect(g.tourStops.length).toBeGreaterThan(0);
    }
  });

  it("every written step and tour stop is fully populated", () => {
    for (const g of GUIDES) {
      for (const s of g.writtenSteps) {
        expect(s.title.length).toBeGreaterThan(0);
        expect(s.detail.length).toBeGreaterThan(0);
      }
      for (const t of g.tourStops) {
        expect(t.target.length).toBeGreaterThan(0);
        expect(t.title.length).toBeGreaterThan(0);
        expect(t.description.length).toBeGreaterThan(0);
      }
    }
  });
});
