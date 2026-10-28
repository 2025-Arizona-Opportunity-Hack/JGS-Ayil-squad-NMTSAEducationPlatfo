import { describe, it, expect } from "vitest";
import { searchGuides } from "./searchGuides";
import { getGuidesFor, type Guide } from "./guideContent";
import { PERMISSIONS } from "@/lib/permissions";

function guide(overrides: Partial<Guide> & { id: string }): Guide {
  return {
    title: "Untitled",
    summary: "",
    audience: "client",
    writtenSteps: [],
    tourStops: [],
    ...overrides,
  };
}

const ids = (guides: Guide[], query: string) =>
  searchGuides(guides, query).map((m) => m.guide.id);

describe("searchGuides", () => {
  const guides = [
    guide({ id: "watch", title: "Watch a video", summary: "Play things." }),
    guide({ id: "buy", title: "Getting access", summary: "Request, then pay.", keywords: ["buy"] }),
    guide({
      id: "profile",
      title: "Your profile",
      summary: "Name and photo.",
      writtenSteps: [{ title: "Sign out", detail: "Next to your photo on a shared device." }],
    }),
  ];

  it("lists every guide, in order, for a blank query", () => {
    expect(ids(guides, "")).toEqual(["watch", "buy", "profile"]);
    expect(ids(guides, "   ")).toEqual(["watch", "buy", "profile"]);
  });

  it("lists every guide when the query is only filler words", () => {
    expect(ids(guides, "how do I")).toEqual(["watch", "buy", "profile"]);
  });

  it("ignores filler words around a meaningful one", () => {
    expect(ids(guides, "how do I watch")).toEqual(["watch"]);
  });

  it("is case- and accent-insensitive", () => {
    expect(ids(guides, "VIDÉO")).toEqual(["watch"]);
  });

  it("matches common word endings", () => {
    expect(ids(guides, "videos")).toEqual(["watch"]);
    expect(ids(guides, "buying")).toEqual(["buy"]);
  });

  it("matches at the start of words only", () => {
    // "ideo" is inside "video" but starts no word.
    expect(ids(guides, "ideo")).toEqual([]);
    expect(ids(guides, "vid")).toEqual(["watch"]);
  });

  it("finds guides by hidden keywords", () => {
    expect(ids(guides, "buy")).toEqual(["buy"]);
  });

  it("does not split contractions into stray letters", () => {
    // Without folding the apostrophe, "t" would match "things" and "then".
    expect(ids(guides, "can't")).toEqual(["watch", "buy", "profile"]);
  });

  it("keeps a guide that matches any word, ranking those matching more first", () => {
    // Each matches one word, in its summary: a tie, so the usual order holds.
    expect(ids(guides, "photo pay")).toEqual(["buy", "profile"]);
    // "profile" matches both words; "watch" and "buy" match neither.
    expect(ids(guides, "profile photo")).toEqual(["profile"]);
    // Two words beat one, whatever the order of the guides.
    expect(ids(guides, "photo shared pay")[0]).toBe("profile");
  });

  it("ranks a title match above a step match", () => {
    const g = [
      guide({ id: "step", title: "Other", writtenSteps: [{ title: "x", detail: "receipt here" }] }),
      guide({ id: "title", title: "Your receipt" }),
    ];
    expect(ids(g, "receipt")).toEqual(["title", "step"]);
  });

  it("names the matching step when only a step matched", () => {
    const [match] = searchGuides(guides, "shared");
    expect(match.guide.id).toBe("profile");
    expect(match.matchedStep).toBe("Sign out");
  });

  it("names no step when the title or summary already explains the match", () => {
    const [match] = searchGuides(guides, "photo");
    expect(match.matchedStep).toBeUndefined();
  });

  it("names the step for a keyword-only match, since keywords are hidden", () => {
    const g = [
      guide({
        id: "k",
        title: "Getting access",
        keywords: ["pay"],
        writtenSteps: [{ title: "Complete the purchase", detail: "Use that to pay." }],
      }),
    ];
    expect(searchGuides(g, "pay")[0].matchedStep).toBe("Complete the purchase");
  });

  it("matches words from tour stops", () => {
    const g = [
      guide({
        id: "tour",
        tourStops: [{ target: "t", title: "Browse", description: "Search everything", position: "bottom" }],
      }),
    ];
    expect(ids(g, "browse")).toEqual(["tour"]);
  });
});

describe("searchGuides against the real client guides", () => {
  const client = getGuidesFor("client", [PERMISSIONS.RECOMMEND_CONTENT]);

  // The words families are likeliest to type, mapped to the guide that must
  // come first. Guards against a wording change quietly breaking search.
  it.each([
    ["how do I pay", "client-paid-access"],
    ["buy", "client-paid-access"],
    ["receipt", "client-orders"],
    ["watch a video", "client-play-content"],
    ["listen", "client-play-content"],
    ["dark mode", "client-profile"],
    ["log out", "client-profile"],
    ["therapist", "client-for-you"],
  ])("“%s” puts %s first", (query, expected) => {
    expect(ids(client, query)[0]).toBe(expected);
  });
});
