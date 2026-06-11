import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import { ConvexError } from "convex/values";
import schema from "./schema";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Helper: seed an owner user + profile so we can act as the inviter.
// Returns the userId we use as `subject` in withIdentity().
async function seedOwner(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      email: "owner@test.local",
      name: "Test Owner",
    });
    await ctx.db.insert("userProfiles", {
      userId,
      role: "owner",
      firstName: "Test",
      lastName: "Owner",
      isActive: true,
    });
    return userId;
  });
}

// Helper: seed a fresh user (no profile yet) to represent an invitee who
// has just signed up but not yet completed createUserProfile.
async function seedInviteeUser(
  t: ReturnType<typeof convexTest>,
  email: string,
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      email,
      name: "",
    });
  });
}

describe("clientInvites.createClientInviteWithEmail", () => {
  it("creates an active invite with the supplied role + lowercased email", async () => {
    const t = convexTest(schema);
    const ownerId = await seedOwner(t);

    const result = await t
      .withIdentity({ subject: ownerId })
      .mutation(api.clientInvites.createClientInviteWithEmail, {
        role: "client",
        email: "Invitee@Example.com",
        firstName: "Inv",
        lastName: "Itee",
      });

    expect(result.code).toMatch(/^[A-Z0-9]{8}$/);

    const stored = await t.run(async (ctx) =>
      ctx.db.get(result.inviteId as Id<"clientInvites">),
    );
    expect(stored?.email).toBe("invitee@example.com"); // lowercased
    expect(stored?.role).toBe("client");
    expect(stored?.isActive).toBe(true);
    expect(stored?.usedBy).toBeUndefined();
  });

  it("rejects a second invite for the same email while the first is still active", async () => {
    const t = convexTest(schema);
    const ownerId = await seedOwner(t);

    await t
      .withIdentity({ subject: ownerId })
      .mutation(api.clientInvites.createClientInviteWithEmail, {
        role: "client",
        email: "dup@example.com",
      });

    await expect(
      t
        .withIdentity({ subject: ownerId })
        .mutation(api.clientInvites.createClientInviteWithEmail, {
          role: "parent",
          email: "dup@example.com",
        }),
    ).rejects.toThrow(/active invite already exists/i);
  });

  it("allows a new invite after the previous one is deactivated", async () => {
    const t = convexTest(schema);
    const ownerId = await seedOwner(t);

    const first = await t
      .withIdentity({ subject: ownerId })
      .mutation(api.clientInvites.createClientInviteWithEmail, {
        role: "client",
        email: "reissue@example.com",
      });

    await t
      .withIdentity({ subject: ownerId })
      .mutation(api.clientInvites.deactivateClientInvite, {
        inviteId: first.inviteId,
      });

    const second = await t
      .withIdentity({ subject: ownerId })
      .mutation(api.clientInvites.createClientInviteWithEmail, {
        role: "client",
        email: "reissue@example.com",
      });

    expect(second.code).not.toBe(first.code);
  });

  it("rejects an invalid email", async () => {
    const t = convexTest(schema);
    const ownerId = await seedOwner(t);

    await expect(
      t
        .withIdentity({ subject: ownerId })
        .mutation(api.clientInvites.createClientInviteWithEmail, {
          role: "client",
          email: "not-an-email",
        }),
    ).rejects.toThrow(/invalid email/i);
  });
});

describe("clientInvites.validateClientInvite", () => {
  it("returns valid=true for an active, unused, unexpired code", async () => {
    const t = convexTest(schema);
    const ownerId = await seedOwner(t);

    const { code } = await t
      .withIdentity({ subject: ownerId })
      .mutation(api.clientInvites.createClientInviteWithEmail, {
        role: "professional",
        email: "pro@example.com",
      });

    const v = await t.query(api.clientInvites.validateClientInvite, { code });
    expect(v.valid).toBe(true);
    expect(v.role).toBe("professional");
  });

  it("returns valid=false with a clear error for an unknown code", async () => {
    const t = convexTest(schema);

    const v = await t.query(api.clientInvites.validateClientInvite, {
      code: "BOGUSCODE",
    });
    expect(v.valid).toBe(false);
    expect(v.error).toMatch(/invalid/i);
  });
});

describe("users.createUserProfile (via client invite)", () => {
  it("creates a profile with the role from the client invite and marks invite used", async () => {
    const t = convexTest(schema);
    const ownerId = await seedOwner(t);

    const { code } = await t
      .withIdentity({ subject: ownerId })
      .mutation(api.clientInvites.createClientInviteWithEmail, {
        role: "client",
        email: "newclient@example.com",
      });

    const inviteeId = await seedInviteeUser(t, "newclient@example.com");

    await t
      .withIdentity({ subject: inviteeId })
      .mutation(api.users.createUserProfile, {
        firstName: "New",
        lastName: "Client",
        inviteCode: code,
      });

    const profile = await t.run(async (ctx) =>
      ctx.db
        .query("userProfiles")
        .withIndex("by_user_id", (q) => q.eq("userId", inviteeId))
        .unique(),
    );
    expect(profile?.role).toBe("client");
    expect(profile?.firstName).toBe("New");

    const invite = await t.run(async (ctx) =>
      ctx.db
        .query("clientInvites")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique(),
    );
    expect(invite?.usedBy).toBe(inviteeId);
    expect(invite?.usedAt).toBeGreaterThan(0);
  });

  it("rejects re-using a client invite that was already consumed", async () => {
    const t = convexTest(schema);
    const ownerId = await seedOwner(t);

    const { code } = await t
      .withIdentity({ subject: ownerId })
      .mutation(api.clientInvites.createClientInviteWithEmail, {
        role: "client",
        email: "first@example.com",
      });

    const firstUserId = await seedInviteeUser(t, "first@example.com");
    await t
      .withIdentity({ subject: firstUserId })
      .mutation(api.users.createUserProfile, {
        firstName: "First",
        lastName: "User",
        inviteCode: code,
      });

    const secondUserId = await seedInviteeUser(t, "second@example.com");
    await expect(
      t
        .withIdentity({ subject: secondUserId })
        .mutation(api.users.createUserProfile, {
          firstName: "Second",
          lastName: "User",
          inviteCode: code,
        }),
    ).rejects.toThrow(/already been used/i);
  });

  it("rejects an unknown invite code", async () => {
    const t = convexTest(schema);
    const inviteeId = await seedInviteeUser(t, "ghost@example.com");

    await expect(
      t
        .withIdentity({ subject: inviteeId })
        .mutation(api.users.createUserProfile, {
          firstName: "Ghost",
          lastName: "User",
          inviteCode: "NOTREAL1",
        }),
    ).rejects.toThrow(/invalid invite code/i);
  });

  it("surfaces ConvexError so client receives the message (not 'Server Error')", async () => {
    // Regression test: this was the entire reason Issue 1 looked like
    // "Server Error" to admins. ConvexError payloads MUST round-trip.
    const t = convexTest(schema);
    const ownerId = await seedOwner(t);

    await t
      .withIdentity({ subject: ownerId })
      .mutation(api.clientInvites.createClientInviteWithEmail, {
        role: "client",
        email: "surface@example.com",
      });

    try {
      await t
        .withIdentity({ subject: ownerId })
        .mutation(api.clientInvites.createClientInviteWithEmail, {
          role: "client",
          email: "surface@example.com",
        });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ConvexError);
      expect((err as ConvexError<string>).data).toMatch(/active invite/i);
    }
  });
});
