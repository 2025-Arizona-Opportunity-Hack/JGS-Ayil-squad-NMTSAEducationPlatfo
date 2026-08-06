import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
import { deriveContentType } from "./helpers";

/**
 * Regression suite for the derived `type` discriminator.
 *
 * The database stores `attachmentType`. The viewer components
 * (PublicContentViewer / SharedContentViewer / RecommendedContent) switch on
 * `content.type`, which is *derived* on the way out of a query. Three queries
 * were missing that derivation, so a published video rendered its title,
 * description and tags with no player at all — the content looked broken with
 * no error anywhere. These tests pin the derivation to the queries that feed
 * those components.
 */

describe("deriveContentType", () => {
  it("maps every attachmentType to the discriminator viewers switch on", () => {
    expect(deriveContentType("video")).toBe("video");
    expect(deriveContentType("audio")).toBe("audio");
    expect(deriveContentType("pdf")).toBe("document");
    expect(deriveContentType("image")).toBe("document");
    expect(deriveContentType("richtext")).toBe("article");
  });

  it("falls back to an existing type, then to article", () => {
    expect(deriveContentType(undefined, "video")).toBe("video");
    expect(deriveContentType(null, null)).toBe("article");
    expect(deriveContentType("something-unknown")).toBe("article");
  });
});

async function seedPublishedVideo(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      email: "owner@test.local",
      name: "Owner",
    });
    await ctx.db.insert("userProfiles", {
      userId,
      role: "owner",
      firstName: "Own",
      lastName: "Er",
      isActive: true,
    });
    const storageId = await ctx.storage.store(
      new Blob(["fake-video-bytes"], { type: "video/mp4" })
    );
    const contentId = await ctx.db.insert("content", {
      title: "Test Content",
      description: "This is test content",
      // Stored field. Note there is deliberately NO `type` field here —
      // that is exactly the production shape that exposed the bug.
      attachmentType: "video",
      fileId: storageId,
      isPublic: true,
      status: "published",
      active: true,
      isArchived: false,
      createdBy: userId,
      tags: ["test"],
    });
    return { userId, contentId };
  });
}

describe("published public video is renderable by the viewer", () => {
  it("getPublicContent returns type:'video' so the player renders", async () => {
    const t = convexTest(schema);
    const { contentId } = await seedPublishedVideo(t);

    const result = await t.query(api.publicContent.getPublicContent, {
      contentId,
    });

    // PublicContentViewer renders the <video> only when
    // `content.type === "video" && (content.fileUrl || content.externalUrl)`.
    expect(result.content).not.toBeNull();
    expect(result.content?.type).toBe("video");
    expect(result.content?.fileUrl).toBeTruthy();
  });

  it("getContentByShareToken returns type:'video'", async () => {
    const t = convexTest(schema);
    const { userId, contentId } = await seedPublishedVideo(t);

    const accessToken = "test-share-token-for-type-derivation";
    await t.run(async (ctx) => {
      await ctx.db.insert("contentShares", {
        contentId,
        sharedBy: userId,
        accessToken,
        recipientEmail: "third-party@test.local",
        viewCount: 0,
      });
    });

    const result = await t.query(api.contentShares.getContentByShareToken, {
      accessToken,
    });

    expect(result.content).not.toBeNull();
    expect(result.content?.type).toBe("video");
    expect(result.content?.fileUrl).toBeTruthy();
  });

  it("getMyRecommendations returns type:'video' for public unpriced content", async () => {
    const t = convexTest(schema);
    const { userId, contentId } = await seedPublishedVideo(t);

    const recipientId = await t.run(async (ctx) => {
      const rid = await ctx.db.insert("users", {
        email: "recipient@test.local",
        name: "Recipient",
      });
      await ctx.db.insert("userProfiles", {
        userId: rid,
        role: "client",
        firstName: "Re",
        lastName: "Cipient",
        isActive: true,
      });
      await ctx.db.insert("contentRecommendations", {
        contentId,
        recommendedBy: userId,
        recipientEmail: "recipient@test.local",
        recipientUserId: rid,
        createdAt: Date.now(),
        isActive: true,
      });
      return rid;
    });

    const result = await t
      .withIdentity({ subject: recipientId })
      .query(api.recommendations.getMyRecommendations, {});

    expect(result).toHaveLength(1);
    expect(result[0].content.type).toBe("video");
  });
});
