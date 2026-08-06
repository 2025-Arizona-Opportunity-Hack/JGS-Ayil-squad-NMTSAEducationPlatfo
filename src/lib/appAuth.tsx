/**
 * Auth-provider-agnostic sign-out. Each provider tree in main.tsx mounts a
 * bridge that supplies the real implementation, so components never import
 * a specific auth library's hooks for signing out.
 */
import { createContext, useContext } from "react";

export const AppSignOutContext = createContext<(() => Promise<void>) | null>(
  null
);

export function useAppSignOut(): () => Promise<void> {
  const signOut = useContext(AppSignOutContext);
  if (!signOut) {
    throw new Error(
      "useAppSignOut must be used inside a provider tree from main.tsx"
    );
  }
  return signOut;
}
