import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
import { PERMISSIONS } from "./permissions";
import { getEffectivePermissions } from "./permissions";

// ─── Shared seeding helpers (mirrors convex/analytics.test.ts / inviteCodes.test.ts) ───

async function seedUser(
  t: ReturnType<typeof convexTest>,
  role: string,
  email: string,
  profileOverrides: Record<string, unknown> = {}
) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { email, name: "Test User" });
    await ctx.db.insert("userProfiles", {
      userId,
      role,
      firstName: "Test",
      lastName: "User",
      isActive: true,
      ...profileOverrides,
    });
    return userId;
  });
}

// A signup-flow user: only a `users` row, no `userProfiles` row yet, and no
// email (so createUserProfile's "existing account with this email" /
// "approved join request" branches are skipped and we can focus purely on
// the role-selection contract under test).
async function seedBareUser(t: ReturnType<typeof convexTest>, name: string) {
  return await t.run(async (ctx) => ctx.db.insert("users", { name }));
}

// Compute the HMAC-SHA256 signature the way the A3 contract specifies, so we
// can test router.ts's verification logic directly without depending on the
// (not-yet-implemented) `getSignedMediaUrl` action.
async function computeMediaSig(
  contentId: string,
  exp: number,
  secret: string
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${contentId}:${exp}`)
  );
  return Array.from(new Uint8Array(sigBuffer), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
}

// ═══════════════════════════════════════════════════════════════════════
// CLUSTER A — Content access
// ═══════════════════════════════════════════════════════════════════════

describe("A1: grantAccessAfterPassword must verify the password server-side", () => {
  it("grants no access when called without a password (current bare signature)", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-a1-1@test.local");
    const userId = await seedUser(t, "client", "client-a1-1@test.local");
    const contentId = await t.run(async (ctx) =>
      ctx.db.insert("content", {
        title: "Locked Content",
        isPublic: false,
        createdBy: ownerId,
        password: "secret123",
      })
    );

    try {
      // This is exactly today's exported signature: `{ contentId }`. Once
      // fixed, `password` becomes required, so this call should fail closed.
      await t
        .withIdentity({ subject: userId })
        .mutation(api.content.grantAccessAfterPassword as any, { contentId });
    } catch {
      // Acceptable post-fix (missing required `password`).
    }

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("contentAccess")
        .withIndex("by_content", (q) => q.eq("contentId", contentId))
        .collect()
    );
    expect(rows.filter((r) => r.userId === userId)).toHaveLength(0);
  });

  it("grants no access when the supplied password is wrong", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-a1-2@test.local");
    const userId = await seedUser(t, "client", "client-a1-2@test.local");
    const contentId = await t.run(async (ctx) =>
      ctx.db.insert("content", {
        title: "Locked Content 2",
        isPublic: false,
        createdBy: ownerId,
        password: "secret123",
      })
    );

    try {
      await t
        .withIdentity({ subject: userId })
        .mutation(api.content.grantAccessAfterPassword as any, {
          contentId,
          password: "totally-wrong-password",
        });
    } catch {
      // Acceptable (wrong password should be rejected).
    }

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("contentAccess")
        .withIndex("by_content", (q) => q.eq("contentId", contentId))
        .collect()
    );
    expect(rows.filter((r) => r.userId === userId)).toHaveLength(0);
  });

  it("grants no access when the content has no password configured", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-a1-3@test.local");
    const userId = await seedUser(t, "client", "client-a1-3@test.local");
    const contentId = await t.run(async (ctx) =>
      ctx.db.insert("content", {
        title: "Not Actually Locked",
        isPublic: false,
        createdBy: ownerId,
        // no `password` field set
      })
    );

    try {
      await t
        .withIdentity({ subject: userId })
        .mutation(api.content.grantAccessAfterPassword as any, {
          contentId,
          password: "anything-at-all",
        });
    } catch {
      // Acceptable — nothing to verify, this endpoint must not become a
      // generic access-granting primitive.
    }

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("contentAccess")
        .withIndex("by_content", (q) => q.eq("contentId", contentId))
        .collect()
    );
    expect(rows.filter((r) => r.userId === userId)).toHaveLength(0);
  });

  it("grants access (idempotently) when the correct password is supplied", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-a1-4@test.local");
    const userId = await seedUser(t, "client", "client-a1-4@test.local");
    const contentId = await t.run(async (ctx) =>
      ctx.db.insert("content", {
        title: "Locked Content 4",
        isPublic: false,
        createdBy: ownerId,
        password: "correct-horse-battery-staple",
      })
    );

    await t
      .withIdentity({ subject: userId })
      .mutation(api.content.grantAccessAfterPassword as any, {
        contentId,
        password: "correct-horse-battery-staple",
      });

    // Calling again with the correct password must not create a duplicate row.
    await t
      .withIdentity({ subject: userId })
      .mutation(api.content.grantAccessAfterPassword as any, {
        contentId,
        password: "correct-horse-battery-staple",
      });

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("contentAccess")
        .withIndex("by_content", (q) => q.eq("contentId", contentId))
        .collect()
    );
    expect(rows.filter((r) => r.userId === userId)).toHaveLength(1);
  });
});

describe("A2: group access must be scoped to the specific content", () => {
  async function setupGroupScenario(t: ReturnType<typeof convexTest>) {
    const ownerId = await seedUser(t, "owner", "owner-a2@test.local");
    const memberId = await seedUser(t, "client", "member-a2@test.local");

    const { contentXId, contentYId } = await t.run(async (ctx) => {
      const contentXId = await ctx.db.insert("content", {
        title: "Granted Content X",
        isPublic: false,
        status: "published",
        active: true,
        createdBy: ownerId,
      });
      const contentYId = await ctx.db.insert("content", {
        title: "Unrelated Content Y",
        isPublic: false,
        status: "published",
        active: true,
        createdBy: ownerId,
      });
      const groupId = await ctx.db.insert("userGroups", {
        name: "Group G",
        createdBy: ownerId,
        isActive: true,
      });
      await ctx.db.insert("userGroupMembers", {
        userId: memberId,
        groupId,
        addedBy: ownerId,
      });
      // Group G is granted access to content X only.
      await ctx.db.insert("contentAccess", {
        contentId: contentXId,
        userGroupId: groupId,
        grantedBy: ownerId,
        canShare: false,
      });
      return { contentXId, contentYId };
    });

    return { ownerId, memberId, contentXId, contentYId };
  }

  it("does not grant a group member access to unrelated content the group was never granted", async () => {
    const t = convexTest(schema);
    const { memberId, contentYId } = await setupGroupScenario(t);

    const resultForY = await t
      .withIdentity({ subject: memberId })
      .query(api.content.getContent, { contentId: contentYId });

    expect(resultForY).toBeNull();
  });

  it("still grants a group member access to the content actually granted to their group", async () => {
    const t = convexTest(schema);
    const { memberId, contentXId } = await setupGroupScenario(t);

    const resultForX = await t
      .withIdentity({ subject: memberId })
      .query(api.content.getContent, { contentId: contentXId });

    expect(resultForX).not.toBeNull();
    expect(resultForX?.title).toBe("Granted Content X");
  });
});

describe("A3: /api/serve-chunked must require a signed URL for protected content", () => {
  const TEST_SECRET = "test-secret-for-media-urls";
  const SECRET_BYTES = "TOP-SECRET-PAID-CONTENT-BYTES";
  let originalSecret: string | undefined;

  beforeEach(() => {
    originalSecret = process.env.MEDIA_URL_SECRET;
    process.env.MEDIA_URL_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.MEDIA_URL_SECRET;
    else process.env.MEDIA_URL_SECRET = originalSecret;
    vi.restoreAllMocks();
  });

  async function seedChunkedContent(t: ReturnType<typeof convexTest>) {
    const ownerId = await seedUser(t, "owner", `owner-a3-${Math.random()}@test.local`);
    const contentId = await t.run(async (ctx) => {
      const blob = new Blob([SECRET_BYTES], { type: "video/mp4" });
      const storageId = await ctx.storage.store(blob);
      return await ctx.db.insert("content", {
        title: "Paid Video",
        isPublic: false,
        status: "published",
        active: true,
        createdBy: ownerId,
        mimeType: "video/mp4",
        chunks: [{ storageId, size: SECRET_BYTES.length }],
      });
    });
    return { ownerId, contentId };
  }

  function stubStorageFetch() {
    return vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(SECRET_BYTES, { status: 200 }));
  }

  it("does not return the content bytes with a 200 when no sig/exp are present", async () => {
    const t = convexTest(schema);
    const { contentId } = await seedChunkedContent(t);
    stubStorageFetch();

    const res = await t.fetch(`/api/serve-chunked/${contentId}`, { method: "GET" });

    expect([401, 403]).toContain(res.status);
  });

  it("rejects a request whose signature does not match", async () => {
    const t = convexTest(schema);
    const { contentId } = await seedChunkedContent(t);
    stubStorageFetch();

    const exp = Date.now() + 15 * 60 * 1000;
    const badSig = await computeMediaSig(contentId, exp, "not-the-real-secret");

    const res = await t.fetch(
      `/api/serve-chunked/${contentId}?exp=${exp}&sig=${badSig}`,
      { method: "GET" }
    );

    expect([401, 403]).toContain(res.status);
  });

  it("rejects a request whose exp has already passed, even with a correctly-keyed signature", async () => {
    const t = convexTest(schema);
    const { contentId } = await seedChunkedContent(t);
    stubStorageFetch();

    const expiredExp = Date.now() - 60 * 1000;
    const sig = await computeMediaSig(contentId, expiredExp, TEST_SECRET);

    const res = await t.fetch(
      `/api/serve-chunked/${contentId}?exp=${expiredExp}&sig=${sig}`,
      { method: "GET" }
    );

    expect([401, 403]).toContain(res.status);
  });

  it("fails closed when MEDIA_URL_SECRET is not configured, even with a well-formed signature", async () => {
    const t = convexTest(schema);
    const { contentId } = await seedChunkedContent(t);
    stubStorageFetch();

    delete process.env.MEDIA_URL_SECRET;
    const exp = Date.now() + 15 * 60 * 1000;
    const sig = await computeMediaSig(contentId, exp, TEST_SECRET);

    const res = await t.fetch(
      `/api/serve-chunked/${contentId}?exp=${exp}&sig=${sig}`,
      { method: "GET" }
    );

    expect([401, 403]).toContain(res.status);
  });

  it("serves the content when given a validly signed URL from getSignedMediaUrl", async () => {
    const t = convexTest(schema);
    const { ownerId, contentId } = await seedChunkedContent(t);
    stubStorageFetch();

    const signedUrl: string = await t
      .withIdentity({ subject: ownerId })
      .action(api.content.getSignedMediaUrl, { contentId });

    const parsed = new URL(signedUrl, "http://localhost");
    const res = await t.fetch(`${parsed.pathname}${parsed.search}`, {
      method: "GET",
    });

    expect(res.status).toBe(200);
  });
});

describe("A3b: getSignedMediaUrl mints only for entitled viewers", () => {
  const TEST_SECRET = "test-secret-for-media-urls";
  const SECRET_BYTES = "TOP-SECRET-PAID-CONTENT-BYTES";
  let originalSecret: string | undefined;

  beforeEach(() => {
    originalSecret = process.env.MEDIA_URL_SECRET;
    process.env.MEDIA_URL_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.MEDIA_URL_SECRET;
    else process.env.MEDIA_URL_SECRET = originalSecret;
    vi.restoreAllMocks();
  });

  function stubStorageFetch() {
    return vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(SECRET_BYTES, { status: 200 }));
  }

  async function seedChunked(
    t: ReturnType<typeof convexTest>,
    overrides: Record<string, unknown> = {}
  ) {
    const ownerId = await seedUser(t, "owner", `owner-a3b-${Math.random()}@test.local`);
    const contentId = await t.run(async (ctx) => {
      const blob = new Blob([SECRET_BYTES], { type: "video/mp4" });
      const storageId = await ctx.storage.store(blob);
      return await ctx.db.insert("content", {
        title: "Chunked Video",
        isPublic: false,
        status: "published",
        active: true,
        createdBy: ownerId,
        attachmentType: "video",
        mimeType: "video/mp4",
        chunks: [{ storageId, size: SECRET_BYTES.length }],
        ...overrides,
      });
    });
    return { ownerId, contentId };
  }

  it("rejects an authed user with no grant on private chunked content", async () => {
    const t = convexTest(schema);
    const { contentId } = await seedChunked(t);
    const strangerId = await seedUser(t, "client", `client-a3b-${Math.random()}@test.local`);

    await expect(
      t
        .withIdentity({ subject: strangerId })
        .action(api.content.getSignedMediaUrl, { contentId })
    ).rejects.toThrow();
  });

  it("rejects anonymous callers without or with a wrong password on password-gated content", async () => {
    const t = convexTest(schema);
    const { contentId } = await seedChunked(t, { password: "letmein" });

    await expect(
      t.action(api.content.getSignedMediaUrl, { contentId })
    ).rejects.toThrow();
    await expect(
      t.action(api.content.getSignedMediaUrl, { contentId, password: "wrong" })
    ).rejects.toThrow();
  });

  it("mints for an anonymous caller with the correct password, and the URL serves", async () => {
    const t = convexTest(schema);
    const { contentId } = await seedChunked(t, { password: "letmein" });
    stubStorageFetch();

    const url: string = await t.action(api.content.getSignedMediaUrl, {
      contentId,
      password: "letmein",
    });

    const parsed = new URL(url, "http://localhost");
    const res = await t.fetch(`${parsed.pathname}${parsed.search}`, { method: "GET" });
    expect(res.status).toBe(200);
  });

  it("mints via a share token only for that token's content", async () => {
    const t = convexTest(schema);
    const { ownerId, contentId } = await seedChunked(t);
    const { contentId: otherContentId } = await seedChunked(t);
    const token = `tok-${Math.random()}`;
    await t.run(async (ctx) => {
      await ctx.db.insert("contentShares", {
        contentId,
        sharedBy: ownerId,
        recipientEmail: "friend@test.local",
        accessToken: token,
        viewCount: 0,
      });
    });

    const url: string = await t.action(api.content.getSignedMediaUrl, {
      contentId,
      shareToken: token,
    });
    expect(url).toContain(`/api/serve-chunked/${contentId}`);

    await expect(
      t.action(api.content.getSignedMediaUrl, {
        contentId: otherContentId,
        shareToken: token,
      })
    ).rejects.toThrow();
  });

  it("rejects an expired share token", async () => {
    const t = convexTest(schema);
    const { ownerId, contentId } = await seedChunked(t);
    const token = `tok-${Math.random()}`;
    await t.run(async (ctx) => {
      await ctx.db.insert("contentShares", {
        contentId,
        sharedBy: ownerId,
        recipientEmail: "friend@test.local",
        accessToken: token,
        viewCount: 0,
        expiresAt: Date.now() - 60 * 1000,
      });
    });

    await expect(
      t.action(api.content.getSignedMediaUrl, { contentId, shareToken: token })
    ).rejects.toThrow();
  });

  it("does not mint priced public chunked content for non-purchasers, but does for grant-holders", async () => {
    const t = convexTest(schema);
    const { ownerId, contentId } = await seedChunked(t, { isPublic: true });
    await t.run(async (ctx) => {
      await ctx.db.insert("contentPricing", {
        contentId,
        price: 1999,
        currency: "USD",
        isActive: true,
        createdBy: ownerId,
        createdAt: Date.now(),
      });
    });
    const buyerId = await seedUser(t, "client", `buyer-a3b-${Math.random()}@test.local`);

    // Anonymous and authed-but-not-purchased callers get nothing, even
    // though the content is isPublic (that only makes the purchase page
    // public, never the media).
    await expect(
      t.action(api.content.getSignedMediaUrl, { contentId })
    ).rejects.toThrow();
    await expect(
      t
        .withIdentity({ subject: buyerId })
        .action(api.content.getSignedMediaUrl, { contentId })
    ).rejects.toThrow();

    // A contentAccess grant (what completeOrderInternal writes) unlocks it.
    await t.run(async (ctx) => {
      await ctx.db.insert("contentAccess", {
        contentId,
        userId: buyerId,
        grantedBy: ownerId,
        canShare: false,
      });
    });
    const url: string = await t
      .withIdentity({ subject: buyerId })
      .action(api.content.getSignedMediaUrl, { contentId });
    expect(url).toContain(`/api/serve-chunked/${contentId}`);
  });

  it("still serves exempt (public, published, unpriced, password-free) chunked content unsigned", async () => {
    const t = convexTest(schema);
    const { contentId } = await seedChunked(t, { isPublic: true });
    stubStorageFetch();

    const res = await t.fetch(`/api/serve-chunked/${contentId}`, { method: "GET" });
    expect(res.status).toBe(200);
  });

  it("serves chunked media recorded as video/x-m4v with Content-Type video/mp4", async () => {
    const t = convexTest(schema);
    const { contentId } = await seedChunked(t, {
      isPublic: true,
      mimeType: "video/x-m4v",
    });
    stubStorageFetch();

    const res = await t.fetch(`/api/serve-chunked/${contentId}`, { method: "GET" });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("video/mp4");
  });
});

describe("A5: getContent must enforce the paywall and not leak content passwords", () => {
  async function seedPricedPublicContent(t: ReturnType<typeof convexTest>) {
    const ownerId = await seedUser(t, "owner", `owner-a5-${Math.random()}@test.local`);
    const contentId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("content", {
        title: "Paid Course",
        isPublic: true,
        status: "published",
        active: true,
        createdBy: ownerId,
      });
      await ctx.db.insert("contentPricing", {
        contentId: id,
        price: 1999,
        currency: "USD",
        isActive: true,
        createdBy: ownerId,
        createdAt: Date.now(),
      });
      return id;
    });
    return { ownerId, contentId };
  }

  it("returns null for priced public content to an authed user without a grant", async () => {
    const t = convexTest(schema);
    const { contentId } = await seedPricedPublicContent(t);
    const clientId = await seedUser(t, "client", `client-a5-${Math.random()}@test.local`);

    const result = await t
      .withIdentity({ subject: clientId })
      .query(api.content.getContent, { contentId });

    expect(result).toBeNull();
  });

  it("still returns priced content to the creator and to grant-holders", async () => {
    const t = convexTest(schema);
    const { ownerId, contentId } = await seedPricedPublicContent(t);
    const buyerId = await seedUser(t, "client", `buyer-a5-${Math.random()}@test.local`);
    await t.run(async (ctx) => {
      await ctx.db.insert("contentAccess", {
        contentId,
        userId: buyerId,
        grantedBy: ownerId,
        canShare: false,
      });
    });

    const forOwner = await t
      .withIdentity({ subject: ownerId })
      .query(api.content.getContent, { contentId });
    const forBuyer = await t
      .withIdentity({ subject: buyerId })
      .query(api.content.getContent, { contentId });

    expect(forOwner?.title).toBe("Paid Course");
    expect(forBuyer?.title).toBe("Paid Course");
  });

  it("strips the content password for viewers without EDIT_CONTENT and keeps it for editors", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", `owner-a5p-${Math.random()}@test.local`);
    const contentId = await t.run(async (ctx) =>
      ctx.db.insert("content", {
        title: "Password-gated",
        isPublic: true,
        status: "published",
        active: true,
        createdBy: ownerId,
        password: "sekrit",
      })
    );
    const clientId = await seedUser(t, "client", `client-a5p-${Math.random()}@test.local`);

    const forClient = await t
      .withIdentity({ subject: clientId })
      .query(api.content.getContent, { contentId });
    const forOwner = await t
      .withIdentity({ subject: ownerId })
      .query(api.content.getContent, { contentId });

    expect(forClient).not.toBeNull();
    expect(forClient?.password).toBeUndefined();
    expect(forOwner?.password).toBe("sekrit");
  });
});

describe("A4: third-party sharing must not bypass pricing or privacy gates", () => {
  it("denies sharing content with active pricing, even for the owner", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-a4-1@test.local");
    const contentId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("content", {
        title: "Paid Course",
        isPublic: true,
        status: "published",
        active: true,
        createdBy: ownerId,
      });
      await ctx.db.insert("contentPricing", {
        contentId: id,
        price: 1999,
        currency: "USD",
        isActive: true,
        createdBy: ownerId,
        createdAt: Date.now(),
      });
      return id;
    });

    const evaluation = await t
      .withIdentity({ subject: ownerId })
      .query(api.contentShares.canShareContent, { contentId });
    expect(evaluation.canShare).toBe(false);
    expect(evaluation.reason).toBe("Cannot share purchaseable content");

    await expect(
      t
        .withIdentity({ subject: ownerId })
        .mutation(api.contentShares.createThirdPartyShare, {
          contentId,
          recipientEmail: "friend@example.com",
          expiresInDays: 7,
        })
    ).rejects.toThrow();

    const shares = await t.run(async (ctx) =>
      ctx.db
        .query("contentShares")
        .withIndex("by_content", (q) => q.eq("contentId", contentId))
        .collect()
    );
    expect(shares).toHaveLength(0);
  });

  it("denies sharing private content for a role that only holds SHARE_CONTENT", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-a4-2@test.local");
    const clientId = await seedUser(t, "client", "client-a4-2@test.local");
    const contentId = await t.run(async (ctx) =>
      ctx.db.insert("content", {
        title: "Private Doc",
        isPublic: false,
        status: "published",
        active: true,
        createdBy: ownerId,
      })
    );

    const evaluation = await t
      .withIdentity({ subject: clientId })
      .query(api.contentShares.canShareContent, { contentId });
    expect(evaluation.canShare).toBe(false);

    await expect(
      t
        .withIdentity({ subject: clientId })
        .mutation(api.contentShares.createThirdPartyShare, {
          contentId,
          recipientEmail: "friend@example.com",
          expiresInDays: 7,
        })
    ).rejects.toThrow();

    const shares = await t.run(async (ctx) =>
      ctx.db
        .query("contentShares")
        .withIndex("by_content", (q) => q.eq("contentId", contentId))
        .collect()
    );
    expect(shares).toHaveLength(0);
  });

  it("allows a role with SHARE_WITH_THIRD_PARTY (editor) to share private, unpriced content", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-a4-3@test.local");
    const editorId = await seedUser(t, "editor", "editor-a4-3@test.local");
    const contentId = await t.run(async (ctx) =>
      ctx.db.insert("content", {
        title: "Private Doc 2",
        isPublic: false,
        status: "published",
        active: true,
        createdBy: ownerId,
      })
    );

    const result = await t
      .withIdentity({ subject: editorId })
      .mutation(api.contentShares.createThirdPartyShare, {
        contentId,
        recipientEmail: "friend@example.com",
        expiresInDays: 7,
      });
    expect(result.shareId).toBeDefined();
  });

  it("allows any role with SHARE_CONTENT to share public, published, unpriced content", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-a4-4@test.local");
    const clientId = await seedUser(t, "client", "client-a4-4@test.local");
    const contentId = await t.run(async (ctx) =>
      ctx.db.insert("content", {
        title: "Free Public Content",
        isPublic: true,
        status: "published",
        active: true,
        createdBy: ownerId,
      })
    );

    const result = await t
      .withIdentity({ subject: clientId })
      .mutation(api.contentShares.createThirdPartyShare, {
        contentId,
        recipientEmail: "friend@example.com",
        expiresInDays: 7,
      });
    expect(result.shareId).toBeDefined();
  });

  it("re-checks pricing at read time and stops handing out the content once it becomes purchaseable", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-a4-5@test.local");
    const contentId = await t.run(async (ctx) =>
      ctx.db.insert("content", {
        title: "Was Free",
        isPublic: true,
        status: "published",
        active: true,
        createdBy: ownerId,
      })
    );

    const { accessToken } = await t
      .withIdentity({ subject: ownerId })
      .mutation(api.contentShares.createThirdPartyShare, {
        contentId,
        recipientEmail: "friend@example.com",
        expiresInDays: 7,
      });

    // Content becomes purchaseable *after* the share link was minted.
    await t.withIdentity({ subject: ownerId }).mutation(api.pricing.setPricing, {
      contentId,
      price: 999,
      currency: "USD",
    });

    const result = await t.query(api.contentShares.getContentByShareToken, {
      accessToken,
    });

    expect(result.content).toBeNull();
  });
});

describe("A5: recommendations must not leak fileUrl or bypass entitlement checks", () => {
  it("createRecommendation refuses to recommend content the recommender cannot access", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-a5-1@test.local");
    // Custom permissions: RECOMMEND_CONTENT only, deliberately without
    // VIEW_ALL_CONTENT, so the "can the recommender access this?" check is
    // actually exercised (the only role with RECOMMEND_CONTENT by default —
    // "professional" — also gets VIEW_ALL_CONTENT, which would trivially pass).
    const recommenderId = await seedUser(
      t,
      "client",
      "recommender-a5-1@test.local",
      { permissions: [PERMISSIONS.RECOMMEND_CONTENT] }
    );
    const recipientId = await seedUser(t, "client", "recipient-a5-1@test.local");
    const recipient = await t.run(async (ctx) => ctx.db.get(recipientId));

    const contentId = await t.run(async (ctx) =>
      ctx.db.insert("content", {
        title: "Private Unlicensed Content",
        isPublic: false,
        status: "published",
        active: true,
        createdBy: ownerId,
      })
    );

    try {
      await t
        .withIdentity({ subject: recommenderId })
        .mutation(api.recommendations.createRecommendation, {
          contentId,
          recipientEmail: recipient!.email!,
        });
    } catch {
      // Acceptable — recommender has no access to this content.
    }

    const recs = await t.run(async (ctx) =>
      ctx.db
        .query("contentRecommendations")
        .withIndex("by_content", (q) => q.eq("contentId", contentId))
        .collect()
    );
    expect(recs).toHaveLength(0);
  });

  it("createRecommendation allows recommending content the recommender has explicit access to", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-a5-2@test.local");
    const recommenderId = await seedUser(
      t,
      "client",
      "recommender-a5-2@test.local",
      { permissions: [PERMISSIONS.RECOMMEND_CONTENT] }
    );
    const recipientId = await seedUser(t, "client", "recipient-a5-2@test.local");
    const recipient = await t.run(async (ctx) => ctx.db.get(recipientId));

    const contentId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("content", {
        title: "Granted Content",
        isPublic: false,
        status: "published",
        active: true,
        createdBy: ownerId,
      });
      await ctx.db.insert("contentAccess", {
        contentId: id,
        userId: recommenderId,
        grantedBy: ownerId,
        canShare: false,
      });
      return id;
    });

    const result = await t
      .withIdentity({ subject: recommenderId })
      .mutation(api.recommendations.createRecommendation, {
        contentId,
        recipientEmail: recipient!.email!,
      });
    expect(result.success).toBe(true);
  });

  it("getMyRecommendations withholds fileUrl for unpurchased paid content", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-a5-3@test.local");
    const recommenderId = await seedUser(t, "professional", "recommender-a5-3@test.local");
    const recipientId = await seedUser(t, "client", "recipient-a5-3@test.local");
    const recipient = await t.run(async (ctx) => ctx.db.get(recipientId));

    await t.run(async (ctx) => {
      const blob = new Blob(["paid-video-bytes"]);
      const fileId = await ctx.storage.store(blob);
      const contentId = await ctx.db.insert("content", {
        title: "Paid Video",
        isPublic: false,
        status: "published",
        active: true,
        createdBy: ownerId,
        attachmentType: "video",
        fileId,
      });
      await ctx.db.insert("contentPricing", {
        contentId,
        price: 1999,
        currency: "USD",
        isActive: true,
        createdBy: ownerId,
        createdAt: Date.now(),
      });
      await ctx.db.insert("contentRecommendations", {
        contentId,
        recommendedBy: recommenderId,
        recipientEmail: recipient!.email!,
        createdAt: Date.now(),
        isActive: true,
      });
    });

    const result = await t
      .withIdentity({ subject: recipientId })
      .query(api.recommendations.getMyRecommendations, {});

    expect(result).toHaveLength(1);
    expect(result[0]!.content.fileUrl).toBeNull();
  });

  it("getMyRecommendations returns a fileUrl once the recipient has purchased the content", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-a5-4@test.local");
    const recommenderId = await seedUser(t, "professional", "recommender-a5-4@test.local");
    const recipientId = await seedUser(t, "client", "recipient-a5-4@test.local");
    const recipient = await t.run(async (ctx) => ctx.db.get(recipientId));

    await t.run(async (ctx) => {
      const blob = new Blob(["paid-video-bytes-2"]);
      const fileId = await ctx.storage.store(blob);
      const contentId = await ctx.db.insert("content", {
        title: "Purchased Paid Video",
        isPublic: false,
        status: "published",
        active: true,
        createdBy: ownerId,
        attachmentType: "video",
        fileId,
      });
      await ctx.db.insert("orders", {
        userId: recipientId,
        contentId,
        amount: 1999,
        currency: "USD",
        status: "completed",
        paymentMethod: "mock_payment",
        createdAt: Date.now(),
        completedAt: Date.now(),
      });
      await ctx.db.insert("contentRecommendations", {
        contentId,
        recommendedBy: recommenderId,
        recipientEmail: recipient!.email!,
        createdAt: Date.now(),
        isActive: true,
      });
    });

    const result = await t
      .withIdentity({ subject: recipientId })
      .query(api.recommendations.getMyRecommendations, {});

    expect(result).toHaveLength(1);
    expect(result[0]!.content.fileUrl).not.toBeNull();
  });
});

describe("A6: thumbnail IDOR + SSRF", () => {
  it("updateContentThumbnailId refuses a caller who is neither the creator nor an EDIT_CONTENT holder", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-a6-1@test.local");
    const attackerId = await seedUser(t, "client", "attacker-a6-1@test.local");

    const { contentId, originalThumbnailId, maliciousThumbnailId } = await t.run(
      async (ctx) => {
        const originalThumbnailId = await ctx.storage.store(new Blob(["orig"]));
        const maliciousThumbnailId = await ctx.storage.store(new Blob(["evil"]));
        const contentId = await ctx.db.insert("content", {
          title: "Victim Content",
          isPublic: true,
          createdBy: ownerId,
          thumbnailId: originalThumbnailId,
        });
        return { contentId, originalThumbnailId, maliciousThumbnailId };
      }
    );

    try {
      await t
        .withIdentity({ subject: attackerId })
        .mutation(api.content.updateContentThumbnailId, {
          contentId,
          thumbnailId: maliciousThumbnailId,
        });
    } catch {
      // Acceptable.
    }

    const content = await t.run(async (ctx) => ctx.db.get(contentId));
    expect(content!.thumbnailId).toBe(originalThumbnailId);
  });

  it("updateContentThumbnailId allows the content creator to update their own thumbnail", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-a6-2@test.local");
    const { contentId, newThumbnailId } = await t.run(async (ctx) => {
      const contentId = await ctx.db.insert("content", {
        title: "My Content",
        isPublic: true,
        createdBy: ownerId,
      });
      const newThumbnailId = await ctx.storage.store(new Blob(["new"]));
      return { contentId, newThumbnailId };
    });

    await t.withIdentity({ subject: ownerId }).mutation(api.content.updateContentThumbnailId, {
      contentId,
      thumbnailId: newThumbnailId,
    });

    const content = await t.run(async (ctx) => ctx.db.get(contentId));
    expect(content!.thumbnailId).toBe(newThumbnailId);
  });

  it("updateContentThumbnailId allows a user with EDIT_CONTENT to update another user's content thumbnail", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-a6-3@test.local");
    const editorId = await seedUser(t, "editor", "editor-a6-3@test.local");
    const { contentId, newThumbnailId } = await t.run(async (ctx) => {
      const contentId = await ctx.db.insert("content", {
        title: "Owner Content",
        isPublic: true,
        createdBy: ownerId,
      });
      const newThumbnailId = await ctx.storage.store(new Blob(["new2"]));
      return { contentId, newThumbnailId };
    });

    await t.withIdentity({ subject: editorId }).mutation(api.content.updateContentThumbnailId, {
      contentId,
      thumbnailId: newThumbnailId,
    });

    const content = await t.run(async (ctx) => ctx.db.get(contentId));
    expect(content!.thumbnailId).toBe(newThumbnailId);
  });

  it("generateThumbnailFromVideo must not be reachable by unauthenticated callers to trigger an outbound fetch (SSRF)", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-a6-4@test.local");
    const contentId = await t.run(async (ctx) =>
      ctx.db.insert("content", { title: "X", isPublic: true, createdBy: ownerId })
    );

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 404 }));

    try {
      await t.action(api.generateThumbnail.generateThumbnailFromVideo, {
        contentId,
        videoUrl: "http://169.254.169.254/latest/meta-data/",
      });
    } catch {
      // Acceptable: becoming `internalAction` means it's simply unresolvable
      // from the public `api`.
    }

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("updateContentThumbnail wrapper action does not let an unauthorized caller repoint another user's thumbnail", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-a6-5@test.local");
    const attackerId = await seedUser(t, "client", "attacker-a6-5@test.local");

    const { contentId, originalThumbnailId, maliciousThumbnailId } = await t.run(
      async (ctx) => {
        const originalThumbnailId = await ctx.storage.store(new Blob(["orig2"]));
        const maliciousThumbnailId = await ctx.storage.store(new Blob(["evil2"]));
        const contentId = await ctx.db.insert("content", {
          title: "Victim Content 2",
          isPublic: true,
          createdBy: ownerId,
          thumbnailId: originalThumbnailId,
        });
        return { contentId, originalThumbnailId, maliciousThumbnailId };
      }
    );

    try {
      await t
        .withIdentity({ subject: attackerId })
        .action(api.generateThumbnail.updateContentThumbnail, {
          contentId,
          thumbnailId: maliciousThumbnailId,
        });
    } catch {
      // Acceptable.
    }

    const content = await t.run(async (ctx) => ctx.db.get(contentId));
    expect(content!.thumbnailId).toBe(originalThumbnailId);
  });
});

describe("A7: priced content must be paywalled in getPublicContent", () => {
  // Public + priced content: the page is public, the media is not.
  async function seedPricedContent(
    t: ReturnType<typeof convexTest>,
    ownerId: any,
    overrides: Record<string, unknown> = {}
  ) {
    return await t.run(async (ctx) => {
      const id = await ctx.db.insert("content", {
        title: "Paid Video",
        description: "A video for sale",
        isPublic: true,
        status: "published",
        active: true,
        createdBy: ownerId,
        ...overrides,
      });
      await ctx.db.insert("contentPricing", {
        contentId: id,
        price: 200,
        currency: "USD",
        isActive: true,
        createdBy: ownerId,
        createdAt: Date.now(),
      });
      return id;
    });
  }

  it("returns a purchase-required preview (no content/fileUrl) to anonymous visitors of public priced content", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-a7-1@test.local");
    const contentId = await seedPricedContent(t, ownerId);

    const res: any = await t.query(api.publicContent.getPublicContent, {
      contentId,
    });

    expect(res.requiresPurchase).toBe(true);
    expect(res.requiresAuth).toBe(true); // must log in before buying
    expect(res.content).toBeNull();
    expect(res.pricing.price).toBe(200);
    expect(res.preview.title).toBe("Paid Video");
    expect(JSON.stringify(res)).not.toContain("fileUrl");
  });

  it("returns purchase-required to a logged-in user without entitlement", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-a7-2@test.local");
    const clientId = await seedUser(t, "client", "client-a7-2@test.local");
    const contentId = await seedPricedContent(t, ownerId);

    const res: any = await t
      .withIdentity({ subject: clientId })
      .query(api.publicContent.getPublicContent, { contentId });

    expect(res.requiresPurchase).toBe(true);
    expect(res.requiresAuth).toBe(false);
    expect(res.content).toBeNull();
  });

  it("serves priced content to a user with a contentAccess grant (i.e. a purchaser)", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-a7-3@test.local");
    const buyerId = await seedUser(t, "client", "buyer-a7-3@test.local");
    const contentId = await seedPricedContent(t, ownerId);
    await t.run(async (ctx) => {
      // What completeOrderInternal writes after a verified Stripe payment.
      await ctx.db.insert("contentAccess", {
        contentId,
        userId: buyerId,
        grantedBy: buyerId,
        canShare: false,
      });
    });

    const res: any = await t
      .withIdentity({ subject: buyerId })
      .query(api.publicContent.getPublicContent, { contentId });

    expect(res.content).not.toBeNull();
    expect(res.content.title).toBe("Paid Video");
  });

  it("serves priced content to its creator", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-a7-4@test.local");
    const contentId = await seedPricedContent(t, ownerId);

    const res: any = await t
      .withIdentity({ subject: ownerId })
      .query(api.publicContent.getPublicContent, { contentId });

    expect(res.content).not.toBeNull();
  });

  it("does not leak preview metadata of private priced content to anonymous visitors", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-a7-5@test.local");
    const contentId = await seedPricedContent(t, ownerId, { isPublic: false });

    const res: any = await t.query(api.publicContent.getPublicContent, {
      contentId,
    });

    expect(res.requiresAuth).toBe(true);
    expect(res.content).toBeNull();
    expect(res.preview).toBeUndefined();
    expect(JSON.stringify(res)).not.toContain("Paid Video");
  });

  it("does not let a correct password bypass the paywall — neither in the query nor via grantAccessAfterPassword", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-a7-6@test.local");
    const clientId = await seedUser(t, "client", "client-a7-6@test.local");
    const contentId = await seedPricedContent(t, ownerId, {
      isPublic: false,
      password: "letmein",
    });

    const res: any = await t
      .withIdentity({ subject: clientId })
      .query(api.publicContent.getPublicContent, {
        contentId,
        password: "letmein",
      });
    expect(res.requiresPurchase).toBe(true);
    expect(res.content).toBeNull();

    await expect(
      t
        .withIdentity({ subject: clientId })
        .mutation(api.content.grantAccessAfterPassword, {
          contentId,
          password: "letmein",
        })
    ).rejects.toThrow();

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("contentAccess")
        .withIndex("by_content", (q) => q.eq("contentId", contentId))
        .collect()
    );
    expect(rows.filter((r) => r.userId === clientId)).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// CLUSTER B — Purchase + identity
// ═══════════════════════════════════════════════════════════════════════

describe("B1: completeOrder must not be a client-callable payment bypass", () => {
  let originalFlag: string | undefined;

  beforeEach(() => {
    originalFlag = process.env.ALLOW_MOCK_PAYMENTS;
    delete process.env.ALLOW_MOCK_PAYMENTS;
  });

  afterEach(() => {
    if (originalFlag === undefined) delete process.env.ALLOW_MOCK_PAYMENTS;
    else process.env.ALLOW_MOCK_PAYMENTS = originalFlag;
  });

  async function seedPendingOrder(
    t: ReturnType<typeof convexTest>,
    buyerId: any,
    ownerId: any
  ) {
    return await t.run(async (ctx) => {
      const contentId = await ctx.db.insert("content", {
        title: "Paid Item",
        isPublic: false,
        createdBy: ownerId,
      });
      const orderId = await ctx.db.insert("orders", {
        userId: buyerId,
        contentId,
        amount: 1999,
        currency: "USD",
        status: "pending",
        paymentMethod: "stripe",
        createdAt: Date.now(),
      });
      return { contentId, orderId };
    });
  }

  it("refuses to mark an order completed when ALLOW_MOCK_PAYMENTS is unset (production posture)", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-b1-1@test.local");
    const buyerId = await seedUser(t, "client", "buyer-b1-1@test.local");
    const { orderId } = await seedPendingOrder(t, buyerId, ownerId);

    await expect(
      t.withIdentity({ subject: buyerId }).mutation(api.orders.completeOrder, { orderId })
    ).rejects.toThrow();

    const order = await t.run(async (ctx) => ctx.db.get(orderId));
    expect(order!.status).toBe("pending");

    const access = await t.run(async (ctx) =>
      ctx.db
        .query("contentAccess")
        .withIndex("by_user", (q) => q.eq("userId", buyerId))
        .collect()
    );
    expect(access).toHaveLength(0);
  });

  it("still works when ALLOW_MOCK_PAYMENTS=true (explicit dev/test mock path)", async () => {
    process.env.ALLOW_MOCK_PAYMENTS = "true";
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-b1-2@test.local");
    const buyerId = await seedUser(t, "client", "buyer-b1-2@test.local");
    const { orderId } = await seedPendingOrder(t, buyerId, ownerId);

    await t.withIdentity({ subject: buyerId }).mutation(api.orders.completeOrder, { orderId });

    const order = await t.run(async (ctx) => ctx.db.get(orderId));
    expect(order!.status).toBe("completed");

    const access = await t.run(async (ctx) =>
      ctx.db
        .query("contentAccess")
        .withIndex("by_user", (q) => q.eq("userId", buyerId))
        .collect()
    );
    expect(access.length).toBeGreaterThan(0);
  });

  it("still refuses a caller who does not own the order, regardless of the flag", async () => {
    process.env.ALLOW_MOCK_PAYMENTS = "true";
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-b1-3@test.local");
    const buyerId = await seedUser(t, "client", "buyer-b1-3@test.local");
    const attackerId = await seedUser(t, "client", "attacker-b1-3@test.local");
    const { orderId } = await seedPendingOrder(t, buyerId, ownerId);

    await expect(
      t.withIdentity({ subject: attackerId }).mutation(api.orders.completeOrder, { orderId })
    ).rejects.toThrow();

    const order = await t.run(async (ctx) => ctx.db.get(orderId));
    expect(order!.status).toBe("pending");
  });
});

describe("B2: createOrder must not allow price substitution across content items", () => {
  it("refuses an order when pricingId belongs to a different content item", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-b2-1@test.local");
    const buyerId = await seedUser(t, "client", "buyer-b2-1@test.local");

    const { cheapPricingId, expensiveContentId } = await t.run(async (ctx) => {
      const cheapContentId = await ctx.db.insert("content", {
        title: "Cheap Item",
        isPublic: false,
        createdBy: ownerId,
      });
      const cheapPricingId = await ctx.db.insert("contentPricing", {
        contentId: cheapContentId,
        price: 100,
        currency: "USD",
        isActive: true,
        createdBy: ownerId,
        createdAt: Date.now(),
      });
      const expensiveContentId = await ctx.db.insert("content", {
        title: "Expensive Item",
        isPublic: false,
        createdBy: ownerId,
      });
      await ctx.db.insert("contentPricing", {
        contentId: expensiveContentId,
        price: 19900,
        currency: "USD",
        isActive: true,
        createdBy: ownerId,
        createdAt: Date.now(),
      });
      await ctx.db.insert("purchaseRequests", {
        userId: buyerId,
        contentId: expensiveContentId,
        status: "approved",
        createdAt: Date.now(),
      });
      return { cheapPricingId, expensiveContentId };
    });

    await expect(
      t.withIdentity({ subject: buyerId }).mutation(api.orders.createOrder, {
        contentId: expensiveContentId,
        pricingId: cheapPricingId,
      })
    ).rejects.toThrow();

    const orders = await t.run(async (ctx) =>
      ctx.db
        .query("orders")
        .withIndex("by_content", (q) => q.eq("contentId", expensiveContentId))
        .collect()
    );
    expect(orders).toHaveLength(0);
  });

  it("creates the order with the correct amount when pricingId matches contentId", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-b2-2@test.local");
    const buyerId = await seedUser(t, "client", "buyer-b2-2@test.local");

    const { pricingId, contentId } = await t.run(async (ctx) => {
      const contentId = await ctx.db.insert("content", {
        title: "Item",
        isPublic: false,
        createdBy: ownerId,
      });
      const pricingId = await ctx.db.insert("contentPricing", {
        contentId,
        price: 500,
        currency: "USD",
        isActive: true,
        createdBy: ownerId,
        createdAt: Date.now(),
      });
      await ctx.db.insert("purchaseRequests", {
        userId: buyerId,
        contentId,
        status: "approved",
        createdAt: Date.now(),
      });
      return { pricingId, contentId };
    });

    const { orderId } = await t
      .withIdentity({ subject: buyerId })
      .mutation(api.orders.createOrder, { contentId, pricingId });

    const order = await t.run(async (ctx) => ctx.db.get(orderId));
    expect(order!.amount).toBe(500);
    expect(order!.contentId).toBe(contentId);
  });
});

describe("B3: signup must not allow self-selecting a privileged role", () => {
  it("does not grant the professional role (VIEW_ALL_CONTENT) via a self-selected role", async () => {
    const t = convexTest(schema);
    const userId = await seedBareUser(t, "New Signup 1");

    try {
      await t.withIdentity({ subject: userId }).mutation(api.users.createUserProfile, {
        role: "professional",
      });
    } catch {
      // Acceptable — self-service signup must not grant `professional`.
    }

    const profile = await t.run(async (ctx) =>
      ctx.db
        .query("userProfiles")
        .withIndex("by_user_id", (q) => q.eq("userId", userId))
        .unique()
    );

    if (profile) {
      const perms = getEffectivePermissions(profile);
      expect(profile.role).not.toBe("professional");
      expect(perms).not.toContain(PERMISSIONS.VIEW_ALL_CONTENT);
    }
  });

  it("still allows self-selecting the client role", async () => {
    const t = convexTest(schema);
    const userId = await seedBareUser(t, "New Signup 2");

    await t.withIdentity({ subject: userId }).mutation(api.users.createUserProfile, {
      role: "client",
    });

    const profile = await t.run(async (ctx) =>
      ctx.db
        .query("userProfiles")
        .withIndex("by_user_id", (q) => q.eq("userId", userId))
        .unique()
    );
    expect(profile!.role).toBe("client");
  });

  it("still allows obtaining the professional role through a valid client invite code", async () => {
    const t = convexTest(schema);
    const adminId = await seedUser(t, "owner", "owner-b3-3@test.local");
    const userId = await seedBareUser(t, "New Signup 3");

    const code = "PROINV123";
    await t.run(async (ctx) => {
      await ctx.db.insert("clientInvites", {
        code,
        role: "professional",
        createdBy: adminId,
        createdAt: Date.now(),
        isActive: true,
      });
    });

    await t.withIdentity({ subject: userId }).mutation(api.users.createUserProfile, {
      inviteCode: code,
    });

    const profile = await t.run(async (ctx) =>
      ctx.db
        .query("userProfiles")
        .withIndex("by_user_id", (q) => q.eq("userId", userId))
        .unique()
    );
    expect(profile!.role).toBe("professional");
  });
});

describe("B4: staff invite codes must default to single-use", () => {
  it("allows exactly one redemption and refuses a second, unrelated user from reusing the same code", async () => {
    const t = convexTest(schema);
    const adminId = await seedUser(t, "owner", "owner-b4-1@test.local");
    const code = "STAFF1USE";
    await t.run(async (ctx) => {
      await ctx.db.insert("inviteCodes", {
        code,
        role: "editor",
        createdBy: adminId,
        createdAt: Date.now(),
        isActive: true,
        // `maxUses` / `currentUses` intentionally omitted: relies on the
        // "default single-use when unset" contract, and schema.ts is not
        // modified by this test file.
      });
    });

    const user1 = await seedBareUser(t, "First Redeemer");
    await t.withIdentity({ subject: user1 }).mutation(api.users.createUserProfile, {
      inviteCode: code,
    });
    const profile1 = await t.run(async (ctx) =>
      ctx.db
        .query("userProfiles")
        .withIndex("by_user_id", (q) => q.eq("userId", user1))
        .unique()
    );
    expect(profile1!.role).toBe("editor");

    const user2 = await seedBareUser(t, "Second Redeemer");
    try {
      await t.withIdentity({ subject: user2 }).mutation(api.users.createUserProfile, {
        inviteCode: code,
      });
    } catch {
      // Acceptable — the code should already be exhausted.
    }

    const profile2 = await t.run(async (ctx) =>
      ctx.db
        .query("userProfiles")
        .withIndex("by_user_id", (q) => q.eq("userId", user2))
        .unique()
    );
    expect(!profile2 || profile2.role !== "editor").toBe(true);
  });

  it("increments currentUses on a successful redemption", async () => {
    const t = convexTest(schema);
    const adminId = await seedUser(t, "owner", "owner-b4-2@test.local");
    const code = "STAFF1USEB";
    const inviteCodeId = await t.run(async (ctx) =>
      ctx.db.insert("inviteCodes", {
        code,
        role: "contributor",
        createdBy: adminId,
        createdAt: Date.now(),
        isActive: true,
      })
    );

    const user1 = await seedBareUser(t, "Redeemer");
    await t.withIdentity({ subject: user1 }).mutation(api.users.createUserProfile, {
      inviteCode: code,
    });

    const invite = await t.run(async (ctx) => ctx.db.get(inviteCodeId));
    expect(invite!.currentUses ?? 0).toBe(1);
  });
});

describe("B5: listPricedContent must not leak content.password or an unpurchased fileUrl", () => {
  it("never includes the plaintext password for priced content", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-b5-1@test.local");
    const buyerId = await seedUser(t, "client", "buyer-b5-1@test.local");

    await t.run(async (ctx) => {
      const contentId = await ctx.db.insert("content", {
        title: "Priced + Password Protected",
        isPublic: false,
        createdBy: ownerId,
        password: "supersecret123",
      });
      await ctx.db.insert("contentPricing", {
        contentId,
        price: 999,
        currency: "USD",
        isActive: true,
        createdBy: ownerId,
        createdAt: Date.now(),
      });
    });

    const result = await t
      .withIdentity({ subject: buyerId })
      .query(api.pricing.listPricedContent, {});

    expect(result).toHaveLength(1);
    expect(result[0]!.password).toBeFalsy();
    // Defense in depth: whatever shape the fix ends up with, a non-purchaser
    // must never receive a playable/downloadable fileUrl.
    expect((result[0] as any).fileUrl ?? null).toBeNull();
  });

  it("still returns price, currency, and thumbnail info for a non-owner", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-b5-2@test.local");
    const buyerId = await seedUser(t, "client", "buyer-b5-2@test.local");

    await t.run(async (ctx) => {
      const thumbnailId = await ctx.storage.store(new Blob(["thumb"]));
      const contentId = await ctx.db.insert("content", {
        title: "Priced Content",
        isPublic: false,
        createdBy: ownerId,
        thumbnailId,
      });
      await ctx.db.insert("contentPricing", {
        contentId,
        price: 1234,
        currency: "USD",
        isActive: true,
        createdBy: ownerId,
        createdAt: Date.now(),
      });
    });

    const result = await t
      .withIdentity({ subject: buyerId })
      .query(api.pricing.listPricedContent, {});

    expect(result).toHaveLength(1);
    expect(result[0]!.pricing.price).toBe(1234);
    expect(result[0]!.thumbnailUrl).not.toBeNull();
    // `hasAccess` is `existingOrder && (...)`, which short-circuits to a
    // falsy `null`/`undefined` (not strictly `false`) when there's no order —
    // assert falsiness rather than the exact primitive.
    expect(result[0]!.hasAccess).toBeFalsy();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// CLUSTER C — Quizzes
// ═══════════════════════════════════════════════════════════════════════
//
// Flagship regressions only — the full behavioral matrix lives in
// convex/quizzes.test.ts. The invariant: correct answers exist ONLY in
// quizQuestions.correctOptionIds and must never reach a learner-facing
// payload; grading is server-side.

describe("C1: quiz answers must never reach the client", () => {
  function findKeyDeep(value: unknown, key: string): boolean {
    if (value === null || typeof value !== "object") return false;
    if (Array.isArray(value)) {
      return value.some((item) => findKeyDeep(item, key));
    }
    return Object.entries(value as Record<string, unknown>).some(
      ([k, nested]) => k === key || findKeyDeep(nested, key)
    );
  }

  async function seedQuizFixture(t: ReturnType<typeof convexTest>) {
    const ownerId = await seedUser(t, "owner", `owner-c1-${Math.random()}@test.local`);
    const clientId = await seedUser(t, "client", `client-c1-${Math.random()}@test.local`);
    const contentId = await t.run(async (ctx) =>
      ctx.db.insert("content", {
        title: "Training",
        isPublic: true,
        createdBy: ownerId,
        status: "published",
        active: true,
        attachmentType: "video",
      })
    );
    const quizId = await t.run(async (ctx) =>
      ctx.db.insert("quizzes", {
        title: "Check",
        contentId,
        passingScore: 70,
        isActive: true,
        createdBy: ownerId,
      })
    );
    const questionId = await t.run(async (ctx) =>
      ctx.db.insert("quizQuestions", {
        quizId,
        order: 1,
        prompt: "Q1",
        kind: "single",
        options: [
          { id: "a", text: "Right" },
          { id: "b", text: "Wrong" },
        ],
        correctOptionIds: ["a"],
        explanation: "Because.",
        isActive: true,
      })
    );
    return { ownerId, clientId, contentId, quizId, questionId };
  }

  it("the learner fetch payload contains no correctOptionIds/explanation key", async () => {
    const t = convexTest(schema);
    const { clientId, contentId } = await seedQuizFixture(t);

    const payload = await t
      .withIdentity({ subject: clientId })
      .query(api.quizzes.getQuizForContent, { contentId });

    expect(payload).not.toBeNull();
    expect(findKeyDeep(payload, "correctOptionIds")).toBe(false);
    expect(findKeyDeep(payload, "explanation")).toBe(false);
  });

  it("a client cannot pull answers through the editing query", async () => {
    const t = convexTest(schema);
    const { clientId, quizId } = await seedQuizFixture(t);

    const payload = await t
      .withIdentity({ subject: clientId })
      .query(api.quizzes.getQuizForEditing, { quizId });
    expect(payload).toBeNull();
  });

  it("grading is server-side: the client's own correctness claims are ignored", async () => {
    const t = convexTest(schema);
    const { clientId, quizId, questionId } = await seedQuizFixture(t);

    // The mutation validator only accepts selectedOptionIds — but even a
    // well-formed wrong answer must be graded wrong server-side.
    const result = await t
      .withIdentity({ subject: clientId })
      .mutation(api.quizzes.submitQuizAttempt, {
        quizId,
        answers: [{ questionId, selectedOptionIds: ["b"] }],
      });
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);

    const attempts = await t.run(async (ctx) =>
      ctx.db
        .query("quizAttempts")
        .withIndex("by_quiz", (q) => q.eq("quizId", quizId))
        .collect()
    );
    expect(attempts[0].passed).toBe(false);
  });

  it("an unentitled learner cannot submit attempts on private content", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-c1-priv@test.local");
    const clientId = await seedUser(t, "client", "client-c1-priv@test.local");
    const contentId = await t.run(async (ctx) =>
      ctx.db.insert("content", {
        title: "Private Training",
        isPublic: false,
        createdBy: ownerId,
        status: "published",
        active: true,
      })
    );
    const quizId = await t.run(async (ctx) =>
      ctx.db.insert("quizzes", {
        title: "Private Check",
        contentId,
        passingScore: 70,
        isActive: true,
        createdBy: ownerId,
      })
    );
    const questionId = await t.run(async (ctx) =>
      ctx.db.insert("quizQuestions", {
        quizId,
        order: 1,
        prompt: "Q1",
        kind: "single",
        options: [
          { id: "a", text: "Right" },
          { id: "b", text: "Wrong" },
        ],
        correctOptionIds: ["a"],
        isActive: true,
      })
    );

    await expect(
      t.withIdentity({ subject: clientId }).mutation(
        api.quizzes.submitQuizAttempt,
        {
          quizId,
          answers: [{ questionId, selectedOptionIds: ["a"] }],
        }
      )
    ).rejects.toThrow(/access/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// CLUSTER D — Signup & purchase friction toggles
// ═══════════════════════════════════════════════════════════════════════
//
// allowPublicSignup / autoApprovePurchases (siteSettings) relax the invite
// and purchase-request gates. These tests pin the two guarantees that must
// survive the relaxation: OFF preserves today's behavior exactly, and ON
// never opens a privilege-escalation path.

describe("D1: allowPublicSignup", () => {
  async function seedEmailUser(t: ReturnType<typeof convexTest>, email: string) {
    // A users row WITH an email (password-signup shape) but no profile —
    // the email is what triggers the join-request gate in createUserProfile.
    return await t.run(async (ctx) => ctx.db.insert("users", { email, name: "New User" }));
  }

  function seedSettings(t: ReturnType<typeof convexTest>, overrides: Record<string, unknown>) {
    return t.run(async (ctx) => {
      const ownerId = await ctx.db.insert("users", { name: "Owner" });
      await ctx.db.insert("siteSettings", {
        organizationName: "Test Org",
        setupCompleted: true,
        ...overrides,
      });
      return ownerId;
    });
  }

  it("OFF (default): code-less signup without an approved join request still fails", async () => {
    const t = convexTest(schema);
    await seedSettings(t, {}); // no allowPublicSignup field at all
    const userId = await seedEmailUser(t, "walkin-d1-off@test.local");

    await expect(
      t.withIdentity({ subject: userId }).mutation(api.users.createUserProfile, {
        firstName: "Walk",
        lastName: "In",
        role: "client",
      })
    ).rejects.toThrow(/approved join request/i);
  });

  it("ON: code-less signup succeeds and lands on the client role", async () => {
    const t = convexTest(schema);
    await seedSettings(t, { allowPublicSignup: true });
    const userId = await seedEmailUser(t, "walkin-d1-on@test.local");

    await t.withIdentity({ subject: userId }).mutation(api.users.createUserProfile, {
      firstName: "Walk",
      lastName: "In",
      role: "client",
    });

    const profile = await t.run(async (ctx) =>
      ctx.db
        .query("userProfiles")
        .withIndex("by_user_id", (q) => q.eq("userId", userId))
        .unique()
    );
    expect(profile).not.toBeNull();
    expect(profile!.role).toBe("client");
  });

  it("ON: a forged 'professional' role is still clamped to client", async () => {
    const t = convexTest(schema);
    await seedSettings(t, { allowPublicSignup: true });
    const userId = await seedEmailUser(t, "walkin-d1-forge@test.local");

    await t.withIdentity({ subject: userId }).mutation(api.users.createUserProfile, {
      firstName: "Sneaky",
      lastName: "User",
      role: "professional",
    });

    const profile = await t.run(async (ctx) =>
      ctx.db
        .query("userProfiles")
        .withIndex("by_user_id", (q) => q.eq("userId", userId))
        .unique()
    );
    expect(profile!.role).toBe("client");
    expect(getEffectivePermissions(profile!)).not.toContain(
      PERMISSIONS.VIEW_ALL_CONTENT
    );
  });
});

describe("D2: autoApprovePurchases", () => {
  async function seedPricedContent(t: ReturnType<typeof convexTest>) {
    return await t.run(async (ctx) => {
      const ownerId = await ctx.db.insert("users", { name: "Owner" });
      await ctx.db.insert("userProfiles", {
        userId: ownerId,
        role: "owner",
        firstName: "O",
        lastName: "W",
        isActive: true,
      });
      const contentId = await ctx.db.insert("content", {
        title: "Priced Video",
        isPublic: true,
        createdBy: ownerId,
        status: "published",
        active: true,
      });
      const pricingId = await ctx.db.insert("contentPricing", {
        contentId,
        price: 1999,
        currency: "USD",
        isActive: true,
        createdBy: ownerId,
        createdAt: Date.now(),
      });
      return { ownerId, contentId, pricingId };
    });
  }

  it("OFF (default): createOrder without an approved request still fails", async () => {
    const t = convexTest(schema);
    const { contentId, pricingId } = await seedPricedContent(t);
    await t.run(async (ctx) => {
      await ctx.db.insert("siteSettings", {
        organizationName: "Test Org",
        setupCompleted: true,
      });
    });
    const buyerId = await seedUser(t, "client", "buyer-d2-off@test.local");

    await expect(
      t.withIdentity({ subject: buyerId }).mutation(api.orders.createOrder, {
        contentId,
        pricingId,
      })
    ).rejects.toThrow(/approved purchase request/i);
  });

  it("ON: createOrder succeeds and records an auto-approved request for audit", async () => {
    const t = convexTest(schema);
    const { contentId, pricingId } = await seedPricedContent(t);
    await t.run(async (ctx) => {
      await ctx.db.insert("siteSettings", {
        organizationName: "Test Org",
        setupCompleted: true,
        autoApprovePurchases: true,
      });
    });
    const buyerId = await seedUser(t, "client", "buyer-d2-on@test.local");

    const { orderId } = await t
      .withIdentity({ subject: buyerId })
      .mutation(api.orders.createOrder, { contentId, pricingId });
    expect(orderId).toBeDefined();

    const order = await t.run(async (ctx) => ctx.db.get(orderId));
    // Still a PENDING order — payment completion remains webhook-verified;
    // the toggle only removes the admin-approval step, never the payment.
    expect(order!.status).toBe("pending");
    expect(order!.amount).toBe(1999);

    const requests = await t.run(async (ctx) =>
      ctx.db
        .query("purchaseRequests")
        .withIndex("by_user_content", (q) =>
          q.eq("userId", buyerId).eq("contentId", contentId)
        )
        .collect()
    );
    expect(requests).toHaveLength(1);
    expect(requests[0].status).toBe("approved");
    expect(requests[0].adminNotes).toMatch(/auto-approved/i);
  });

  it("ON: entitlement still requires a completed order (no contentAccess yet)", async () => {
    const t = convexTest(schema);
    const { contentId, pricingId } = await seedPricedContent(t);
    await t.run(async (ctx) => {
      await ctx.db.insert("siteSettings", {
        organizationName: "Test Org",
        setupCompleted: true,
        autoApprovePurchases: true,
      });
    });
    const buyerId = await seedUser(t, "client", "buyer-d2-ent@test.local");

    await t
      .withIdentity({ subject: buyerId })
      .mutation(api.orders.createOrder, { contentId, pricingId });

    // The pending (unpaid) order must not unlock the media
    const result = await t
      .withIdentity({ subject: buyerId })
      .query(api.publicContent.getPublicContent, { contentId });
    expect((result as { requiresPurchase?: boolean }).requiresPurchase).toBe(true);
    expect(result.content).toBeNull();
  });
});
