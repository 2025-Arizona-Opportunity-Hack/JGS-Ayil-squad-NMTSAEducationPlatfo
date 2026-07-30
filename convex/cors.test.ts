import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";

// ─── D1: CORS allowlist ────────────────────────────────────────────────────
//
// convex/router.ts's corsHeaders()/mediaCorsHeaders() must:
//   - echo back the request Origin only when it's in the allowlist
//     (SITE_URL + ALLOWED_ORIGINS), never an arbitrary Origin
//   - never emit "*"
//   - fall back to SITE_URL (or the localhost dev default) otherwise
//   - always send `Vary: Origin`
//
// These exercise the real httpRouter via convex-test's `t.fetch`, hitting
// the OPTIONS preflight routes, which don't need any seeded data.

const ENV_KEYS = ["SITE_URL", "ALLOWED_ORIGINS"] as const;
let originalEnv: Record<string, string | undefined>;

beforeEach(() => {
  originalEnv = {};
  for (const key of ENV_KEYS) {
    originalEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

describe("D1: /api/stripe/checkout CORS", () => {
  it("falls back to the localhost dev origin when SITE_URL/ALLOWED_ORIGINS are unset", async () => {
    const t = convexTest(schema);
    const res = await t.fetch("/api/stripe/checkout", {
      method: "OPTIONS",
      headers: { Origin: "http://localhost:5173" },
    });

    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:5173"
    );
    expect(res.headers.get("Vary")).toBe("Origin");
  });

  it("echoes the request Origin when it matches SITE_URL", async () => {
    process.env.SITE_URL = "https://lms.ohack.dev";
    const t = convexTest(schema);

    const res = await t.fetch("/api/stripe/checkout", {
      method: "OPTIONS",
      headers: { Origin: "https://lms.ohack.dev" },
    });

    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://lms.ohack.dev"
    );
  });

  it("does not echo an Origin that is not in the allowlist — falls back to SITE_URL", async () => {
    process.env.SITE_URL = "https://lms.ohack.dev";
    const t = convexTest(schema);

    const res = await t.fetch("/api/stripe/checkout", {
      method: "OPTIONS",
      headers: { Origin: "https://evil.example.com" },
    });

    const allowOrigin = res.headers.get("Access-Control-Allow-Origin");
    expect(allowOrigin).toBe("https://lms.ohack.dev");
    expect(allowOrigin).not.toBe("https://evil.example.com");
    expect(allowOrigin).not.toBe("*");
  });

  it("never emits a wildcard, even with no Origin header at all", async () => {
    process.env.SITE_URL = "https://lms.ohack.dev";
    const t = convexTest(schema);

    const res = await t.fetch("/api/stripe/checkout", { method: "OPTIONS" });

    expect(res.headers.get("Access-Control-Allow-Origin")).not.toBe("*");
  });

  it("honors ALLOWED_ORIGINS as additional trusted origins beyond SITE_URL", async () => {
    process.env.SITE_URL = "https://lms.ohack.dev";
    process.env.ALLOWED_ORIGINS =
      " https://www.lms.ohack.dev/ , https://ohack-preview.vercel.app ";
    const t = convexTest(schema);

    const wwwRes = await t.fetch("/api/stripe/checkout", {
      method: "OPTIONS",
      headers: { Origin: "https://www.lms.ohack.dev" },
    });
    expect(wwwRes.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://www.lms.ohack.dev"
    );

    const previewRes = await t.fetch("/api/stripe/checkout", {
      method: "OPTIONS",
      headers: { Origin: "https://ohack-preview.vercel.app" },
    });
    expect(previewRes.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://ohack-preview.vercel.app"
    );
  });

  it("ignores empty entries in ALLOWED_ORIGINS", async () => {
    process.env.SITE_URL = "https://lms.ohack.dev";
    process.env.ALLOWED_ORIGINS = ",, ,";
    const t = convexTest(schema);

    const res = await t.fetch("/api/stripe/checkout", {
      method: "OPTIONS",
      headers: { Origin: "https://not-allowed.example.com" },
    });

    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://lms.ohack.dev"
    );
  });
});

describe("D1: /api/serve-chunked media CORS", () => {
  it("falls back to the localhost dev origin by default", async () => {
    const t = convexTest(schema);
    const res = await t.fetch("/api/serve-chunked/anything", {
      method: "OPTIONS",
      headers: { Origin: "http://localhost:5173" },
    });

    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:5173"
    );
    expect(res.headers.get("Vary")).toBe("Origin");
  });

  it("echoes an allowlisted Origin and rejects one that isn't", async () => {
    process.env.SITE_URL = "https://lms.ohack.dev";
    process.env.ALLOWED_ORIGINS = "https://www.lms.ohack.dev";
    const t = convexTest(schema);

    const allowed = await t.fetch("/api/serve-chunked/anything", {
      method: "OPTIONS",
      headers: { Origin: "https://www.lms.ohack.dev" },
    });
    expect(allowed.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://www.lms.ohack.dev"
    );

    const disallowed = await t.fetch("/api/serve-chunked/anything", {
      method: "OPTIONS",
      headers: { Origin: "https://evil.example.com" },
    });
    const allowOrigin = disallowed.headers.get("Access-Control-Allow-Origin");
    expect(allowOrigin).toBe("https://lms.ohack.dev");
    expect(allowOrigin).not.toBe("*");
  });
});
