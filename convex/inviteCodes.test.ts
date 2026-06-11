import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

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

describe("inviteCodes.deleteInviteCode", () => {
  it("permanently removes the staff invite-code row", async () => {
    const t = convexTest(schema);
    const ownerId = await seedOwner(t);

    const { inviteCodeId } = await t
      .withIdentity({ subject: ownerId })
      .mutation(api.inviteCodes.createInviteCode, {
        role: "editor",
      });

    await t
      .withIdentity({ subject: ownerId })
      .mutation(api.inviteCodes.deleteInviteCode, { inviteCodeId });

    const after = await t.run(async (ctx) => ctx.db.get(inviteCodeId));
    expect(after).toBeNull();
  });

  it("rejects deletion by a user without MANAGE_USERS", async () => {
    const t = convexTest(schema);
    const ownerId = await seedOwner(t);

    const { inviteCodeId } = await t
      .withIdentity({ subject: ownerId })
      .mutation(api.inviteCodes.createInviteCode, { role: "editor" });

    const clientId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("users", { email: "noperms@test.local" });
      await ctx.db.insert("userProfiles", {
        userId: id,
        role: "client",
        firstName: "No",
        lastName: "Perms",
        isActive: true,
      });
      return id;
    });

    await expect(
      t
        .withIdentity({ subject: clientId })
        .mutation(api.inviteCodes.deleteInviteCode, { inviteCodeId }),
    ).rejects.toThrow(/don't have permission/i);

    const after = await t.run(async (ctx) => ctx.db.get(inviteCodeId));
    expect(after).not.toBeNull();
  });
});

describe("inviteCodes.createInviteCodeWithSms (SMS_ENABLED=false)", () => {
  it("rejects with a clear SMS-disabled message", async () => {
    const t = convexTest(schema);
    const ownerId = await seedOwner(t);

    await expect(
      t
        .withIdentity({ subject: ownerId })
        .mutation(api.inviteCodes.createInviteCodeWithSms, {
          role: "editor",
          recipientPhone: "+14155551234",
        }),
    ).rejects.toThrow(/sms.*disabled/i);
  });
});
