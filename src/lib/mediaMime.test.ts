import { describe, it, expect } from "vitest";
import { getEffectiveFileType, matchesAttachmentType } from "./mediaMime";
import { inferMimeFromFileName, normalizeMimeType } from "../../convex/mimeTypes";

describe("normalizeMimeType", () => {
  it("maps video/x-m4v to video/mp4 (Chromium rejects the alias)", () => {
    expect(normalizeMimeType("video/x-m4v")).toBe("video/mp4");
    expect(normalizeMimeType("video/m4v")).toBe("video/mp4");
  });

  it("maps audio m4a aliases to audio/mp4", () => {
    expect(normalizeMimeType("audio/x-m4a")).toBe("audio/mp4");
    expect(normalizeMimeType("audio/m4a")).toBe("audio/mp4");
  });

  it("passes canonical types through unchanged", () => {
    expect(normalizeMimeType("video/mp4")).toBe("video/mp4");
    expect(normalizeMimeType("video/quicktime")).toBe("video/quicktime");
    expect(normalizeMimeType("application/pdf")).toBe("application/pdf");
  });

  it("is case-insensitive", () => {
    expect(normalizeMimeType("Video/X-M4V")).toBe("video/mp4");
  });

  it("returns undefined for empty input", () => {
    expect(normalizeMimeType("")).toBeUndefined();
    expect(normalizeMimeType(null)).toBeUndefined();
    expect(normalizeMimeType(undefined)).toBeUndefined();
  });
});

describe("inferMimeFromFileName", () => {
  it("infers video types from extensions", () => {
    expect(inferMimeFromFileName("session.m4v")).toBe("video/mp4");
    expect(inferMimeFromFileName("session.MP4")).toBe("video/mp4");
    expect(inferMimeFromFileName("clip.mov")).toBe("video/quicktime");
    expect(inferMimeFromFileName("clip.webm")).toBe("video/webm");
  });

  it("infers audio and document types", () => {
    expect(inferMimeFromFileName("track.m4a")).toBe("audio/mp4");
    expect(inferMimeFromFileName("track.mp3")).toBe("audio/mpeg");
    expect(inferMimeFromFileName("doc.pdf")).toBe("application/pdf");
  });

  it("returns undefined for unknown or missing extensions", () => {
    expect(inferMimeFromFileName("noextension")).toBeUndefined();
    expect(inferMimeFromFileName("weird.xyz")).toBeUndefined();
    expect(inferMimeFromFileName("trailingdot.")).toBeUndefined();
    expect(inferMimeFromFileName("")).toBeUndefined();
  });
});

describe("getEffectiveFileType", () => {
  it("prefers the browser-reported type, normalized", () => {
    expect(
      getEffectiveFileType({ name: "video.m4v", type: "video/x-m4v" })
    ).toBe("video/mp4");
  });

  it("falls back to the extension when the OS reports no type", () => {
    expect(getEffectiveFileType({ name: "video.m4v", type: "" })).toBe(
      "video/mp4"
    );
    expect(getEffectiveFileType({ name: "video.mp4", type: "" })).toBe(
      "video/mp4"
    );
  });

  it("returns empty string when nothing can be determined", () => {
    expect(getEffectiveFileType({ name: "mystery", type: "" })).toBe("");
  });
});

describe("matchesAttachmentType", () => {
  it("matches media prefixes", () => {
    expect(matchesAttachmentType("video/mp4", "video")).toBe(true);
    expect(matchesAttachmentType("audio/mp4", "audio")).toBe(true);
    expect(matchesAttachmentType("image/png", "image")).toBe(true);
    expect(matchesAttachmentType("application/pdf", "pdf")).toBe(true);
  });

  it("rejects mismatches", () => {
    expect(matchesAttachmentType("audio/mp4", "video")).toBe(false);
    expect(matchesAttachmentType("video/mp4", "audio")).toBe(false);
    expect(matchesAttachmentType("", "video")).toBe(false);
  });
});
