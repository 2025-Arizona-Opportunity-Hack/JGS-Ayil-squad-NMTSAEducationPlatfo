import { useEffect } from "react";
import { toast } from "sonner";
import { WelcomeToast } from "@/components/WelcomeToast";
import { buildGreeting } from "./greeting";

/**
 * Long enough to read unhurried, but it still clears itself for anyone who
 * walks away. The card carries its own dismiss button so nobody has to wait.
 */
const GREETING_DURATION_MS = 10000;

export interface GreetableProfile {
  userId: string;
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string | null;
}

/**
 * Shows a "Welcome back" card once per browser session, per user.
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
    toast.custom(
      (id) => (
        <WelcomeToast
          title={title}
          description={description}
          firstName={profile.firstName}
          lastName={profile.lastName}
          profilePictureUrl={profile.profilePictureUrl}
          onDismiss={() => toast.dismiss(id)}
        />
      ),
      {
        duration: GREETING_DURATION_MS,
        // The Toaster gives every toast a background and shadow (see
        // components/ui/sonner.tsx). This card draws its own, so strip the
        // wrapper's or they stack into a box-inside-a-box.
        unstyled: true,
        classNames: { toast: "w-full !bg-transparent !border-0 !p-0 !shadow-none" },
      }
    );
  }, [
    profile?.userId,
    profile?.firstName,
    profile?.lastName,
    profile?.profilePictureUrl,
  ]);
}
