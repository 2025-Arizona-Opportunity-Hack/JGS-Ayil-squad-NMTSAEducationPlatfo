import { useEffect } from "react";
import { toast } from "sonner";
import { buildGreeting } from "./greeting";

/** Longer than sonner's 4s default, to give slower readers time to register it. */
const GREETING_DURATION_MS = 5000;

export interface GreetableProfile {
  userId: string;
  firstName?: string;
}

/**
 * Shows a "Welcome back" toast once per browser session, per user.
 *
 * Session-scoped storage is what makes this fire on every arrival but not on
 * navigation or refresh. Keying on user id means a shared family device that
 * switches accounts greets the second person too.
 *
 * Safe to call before the profile has loaded — it no-ops until one is present.
 */
export function useWelcomeGreeting(profile: GreetableProfile | null | undefined): void {
  useEffect(() => {
    if (!profile) return;

    const key = `welcomeGreeted:${profile.userId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Storage blocked (private browsing, locked-down device). Skip the
      // greeting rather than risk repeating it on every render.
      return;
    }

    const { title, description } = buildGreeting(profile.firstName);
    toast.success(title, { description, duration: GREETING_DURATION_MS });
  }, [profile?.userId, profile?.firstName]);
}
