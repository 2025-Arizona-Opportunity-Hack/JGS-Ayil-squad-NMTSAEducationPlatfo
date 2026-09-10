import { describe, it, expect } from "vitest";
import { GUIDES, getGuidesFor } from "./guideContent";
import { PERMISSIONS } from "@/lib/permissions";

describe("GUIDES", () => {
  it("includes all the expected guides", () => {
    const ids = GUIDES.map((g) => g.id);
    expect(ids).toContain("upload-content");
    expect(ids).toContain("share-content");
    expect(ids).toContain("content-statuses");
    expect(ids).toContain("pricing-store");
    expect(ids).toContain("create-bundle");
    expect(ids).toContain("write-article");
    expect(ids).toContain("organize-with-tags");
  });

  it("has unique guide ids", () => {
    const ids = GUIDES.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every guide has a title, summary, and written steps", () => {
    for (const g of GUIDES) {
      expect(g.title.length).toBeGreaterThan(0);
      expect(g.summary.length).toBeGreaterThan(0);
      expect(g.writtenSteps.length).toBeGreaterThan(0);
    }
  });

  it("every admin guide has tour stops", () => {
    // Client guides intentionally omit tour stops except for
    // client-getting-around — see the "client guides" describe block below.
    // organize-with-tags is admin but written-only (tour demo host limitation).
    for (const g of GUIDES.filter((g) => g.audience === "admin" && g.id !== "organize-with-tags")) {
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

describe("getGuidesFor", () => {
  const ALL_STAFF = [
    PERMISSIONS.CREATE_CONTENT,
    PERMISSIONS.SET_CONTENT_PRICING,
    PERMISSIONS.MANAGE_CONTENT_GROUPS,
  ];

  it("returns only guides for the requested audience", () => {
    const admin = getGuidesFor("admin", ALL_STAFF);
    expect(admin.length).toBeGreaterThan(0);
    expect(admin.every((g) => g.audience === "admin")).toBe(true);
  });

  it("omits a guide whose requiredPermission the user lacks", () => {
    const ids = getGuidesFor("admin", [PERMISSIONS.CREATE_CONTENT]).map((g) => g.id);
    expect(ids).not.toContain("create-bundle");
    expect(ids).not.toContain("pricing-store");
  });

  it("includes a permission-gated guide when the user holds the permission", () => {
    const ids = getGuidesFor("admin", ALL_STAFF).map((g) => g.id);
    expect(ids).toContain("create-bundle");
    expect(ids).toContain("pricing-store");
  });

  it("includes ungated guides regardless of permissions", () => {
    const ids = getGuidesFor("admin", []).map((g) => g.id);
    expect(ids).toContain("upload-content");
  });

  it("treats undefined permissions as holding nothing", () => {
    const ids = getGuidesFor("admin", undefined).map((g) => g.id);
    expect(ids).toContain("upload-content");
    expect(ids).not.toContain("create-bundle");
  });
});

describe("GUIDES metadata", () => {
  it("gives every guide an audience", () => {
    expect(GUIDES.every((g) => g.audience === "admin" || g.audience === "client")).toBe(true);
  });
});

describe("client guides", () => {
  const CLIENT_IDS = [
    "client-getting-around",
    "client-find-and-open",
    "client-play-content",
    "client-paid-access",
    "client-for-you",
    "client-orders",
    "client-profile",
  ];

  it("includes all the expected client guides", () => {
    const ids = getGuidesFor("client", []).map((g) => g.id);
    for (const id of CLIENT_IDS) expect(ids).toContain(id);
  });

  it("offers the recommend guide only to holders of RECOMMEND_CONTENT", () => {
    expect(getGuidesFor("client", []).map((g) => g.id)).not.toContain("client-recommend");
    expect(
      getGuidesFor("client", [PERMISSIONS.RECOMMEND_CONTENT]).map((g) => g.id)
    ).toContain("client-recommend");
  });

  it("gives every client guide written steps", () => {
    for (const g of getGuidesFor("client", [PERMISSIONS.RECOMMEND_CONTENT])) {
      expect(g.writtenSteps.length).toBeGreaterThan(0);
    }
  });

  it("only tours anchors that exist in both the mobile and desktop shells", () => {
    const stable = new Set([
      "client-nav-home",
      "client-nav-browse",
      "client-nav-shop",
      "client-nav-profile",
    ]);
    for (const g of getGuidesFor("client", [PERMISSIONS.RECOMMEND_CONTENT])) {
      for (const stop of g.tourStops) expect(stable.has(stop.target)).toBe(true);
    }
  });
});

describe("staff organize-with-tags guide", () => {
  it("is offered to every staff member regardless of permission", () => {
    const ids = getGuidesFor("admin", []).map((g) => g.id);
    expect(ids).toContain("organize-with-tags");
  });

  it("is written-only", () => {
    const guide = GUIDES.find((g) => g.id === "organize-with-tags");
    expect(guide?.tourStops).toHaveLength(0);
    expect(guide?.writtenSteps.length).toBeGreaterThan(0);
  });
});
