export interface Greeting {
  title: string;
  description?: string;
}

/**
 * Builds the arrival greeting shown as a toast when a user reaches the portal.
 *
 * The audience includes users who are tentative about technology, so the
 * description explicitly confirms the sign-in worked rather than leaving them
 * to infer it.
 */
export function buildGreeting(firstName?: string): Greeting {
  const name = firstName?.trim();

  return {
    title: name ? `Welcome back, ${name}!` : "Welcome back!",
    description: "You're signed in.",
  };
}
