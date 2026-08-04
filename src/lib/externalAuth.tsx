/**
 * PropelAuth ↔ Convex glue. Everything PropelAuth-specific on the frontend
 * lives here; the rest of the app only sees ConvexProviderWithAuth, the
 * AppSignOutContext bridge, and the sign-in components below.
 *
 * A future provider (e.g. Auth0) would supply the same three pieces: a
 * useAuth adapter returning { isLoading, isAuthenticated, fetchAccessToken },
 * a sign-out bridge, and sign-in/sign-up redirects. See docs/EXTERNAL_AUTH.md.
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  AuthProvider,
  useAuthInfo,
  useLogoutFunction,
  useRedirectFunctions,
} from "@propelauth/react";
import {
  ConvexProviderWithAuth,
  ConvexReactClient,
  useConvexAuth,
  useMutation,
} from "convex/react";
import { api } from "../../convex/_generated/api";
import { AppSignOutContext } from "./appAuth";
import { PROPELAUTH_URL } from "./authMode";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LogIn } from "lucide-react";

/**
 * Adapts PropelAuth's auth state to what ConvexProviderWithAuth expects.
 * PropelAuth mints a fresh access token on tab refocus, so the token is read
 * through a ref inside a stable callback — a new fetchAccessToken identity on
 * every token rotation would make Convex re-authenticate constantly.
 */
function useAuthFromPropelAuth() {
  const authInfo = useAuthInfo();
  const tokensRef = useRef(authInfo.tokens);
  tokensRef.current = authInfo.tokens;

  const fetchAccessToken = useCallback(async () => {
    return (await tokensRef.current.getAccessToken()) ?? null;
  }, []);

  return useMemo(
    () => ({
      isLoading: authInfo.loading === true,
      isAuthenticated: authInfo.isLoggedIn === true,
      fetchAccessToken,
    }),
    [authInfo.loading, authInfo.isLoggedIn, fetchAccessToken]
  );
}

/**
 * After an external login, create/find the Convex `users` row for this
 * identity. Idempotent; everything is derived server-side from the verified
 * JWT. Until it completes, api.auth.loggedInUser is null and App.tsx shows a
 * loading state.
 */
function ExternalUserSync() {
  const { isAuthenticated } = useConvexAuth();
  const ensureExternalUser = useMutation(api.externalAuth.ensureExternalUser);

  useEffect(() => {
    if (isAuthenticated) {
      ensureExternalUser().catch((err) => {
        console.error("Failed to provision external user:", err);
      });
    }
  }, [isAuthenticated, ensureExternalUser]);

  return null;
}

function PropelSignOutBridge({ children }: { children: React.ReactNode }) {
  const logout = useLogoutFunction();
  const signOut = useCallback(async () => {
    // true → PropelAuth redirects to its login page afterwards.
    await logout(true);
  }, [logout]);

  return (
    <AppSignOutContext.Provider value={signOut}>
      {children}
    </AppSignOutContext.Provider>
  );
}

/**
 * The full provider tree for external-auth builds (mounted from main.tsx in
 * place of ConvexAuthProvider).
 */
export function ExternalAuthProvider({
  client,
  children,
}: {
  client: ConvexReactClient;
  children: React.ReactNode;
}) {
  if (!PROPELAUTH_URL) {
    throw new Error(
      "VITE_AUTH_PROVIDER=propelauth requires VITE_PROPELAUTH_URL to be set"
    );
  }
  return (
    <AuthProvider authUrl={PROPELAUTH_URL}>
      <ConvexProviderWithAuth client={client} useAuth={useAuthFromPropelAuth}>
        <PropelSignOutBridge>
          <ExternalUserSync />
          {children}
        </PropelSignOutBridge>
      </ConvexProviderWithAuth>
    </AuthProvider>
  );
}

/** "Sign in with your organization account" button (hosted login redirect). */
export function ExternalSignInButton({
  label = "Sign in",
  signUp = false,
}: {
  label?: string;
  signUp?: boolean;
}) {
  const { redirectToLoginPage, redirectToSignupPage } = useRedirectFunctions();
  const redirect = () => {
    const opts = { postLoginRedirectUrl: window.location.href };
    if (signUp) redirectToSignupPage(opts);
    else redirectToLoginPage(opts);
  };
  return (
    <Button onClick={redirect} className="w-full" size="lg">
      <LogIn className="w-4 h-4 mr-2" aria-hidden="true" />
      {label}
    </Button>
  );
}

/** Replaces the password SignInForm when external auth is enabled. */
export function ExternalSignInCard({ orgName }: { orgName?: string }) {
  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          {orgName
            ? `Use your ${orgName} account to continue.`
            : "Use your organization account to continue."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ExternalSignInButton label="Sign in" />
        <ExternalSignInButton label="Create an account" signUp />
      </CardContent>
    </Card>
  );
}
