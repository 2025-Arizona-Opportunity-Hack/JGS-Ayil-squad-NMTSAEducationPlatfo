import { ConvexError } from "convex/values";

// ── Feature flags (backend) ─────────────────────────────────────────
// Flip these to re-enable. Single source of truth for both server-side
// guards and the UI mirror in src/lib/featureFlags.ts.

export const SMS_ENABLED = false;

export function assertSmsEnabled(): void {
  if (!SMS_ENABLED) {
    throw new ConvexError(
      "SMS notifications are disabled. Please use email instead."
    );
  }
}
