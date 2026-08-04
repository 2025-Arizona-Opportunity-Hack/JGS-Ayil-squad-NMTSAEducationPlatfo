import { useEffect } from "react";
import { useQuery, useConvexAuth } from "convex/react";
import { useNavigate, Routes, Route } from "react-router-dom";
import { useAppSignOut } from "./lib/appAuth";
import { isExternalAuth } from "./lib/authMode";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { AdminDashboard } from "./components/AdminDashboard";
import { RoleSelection } from "./components/RoleSelection";
import { SetupWizard } from "./components/setup/SetupWizard";
import { Logo } from "./components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isAdminUser } from "@/lib/permissions";
import { ClientLayout } from "./components/client/ClientLayout";
import { HomePage } from "./pages/client/HomePage";
import { BrowsePage } from "./pages/client/BrowsePage";
import { BundlesPage } from "./pages/client/BundlesPage";
import { BundleDetailPage } from "./pages/client/BundleDetailPage";
import { ShopPage } from "./pages/client/ShopPage";
import { OrdersPage } from "./pages/client/OrdersPage";
import { SharesPage } from "./pages/client/SharesPage";
import { RequestsPage } from "./pages/client/RequestsPage";
import { ForYouPage } from "./pages/client/ForYouPage";

export default function App() {
  const navigate = useNavigate();
  const signOut = useAppSignOut();
  const { isAuthenticated } = useConvexAuth();
  const user = useQuery(api.auth.loggedInUser);
  const userProfile = useQuery(api.users.getCurrentUserProfile);
  const bootstrapNeeded = useQuery(api.users.bootstrapNeeded, {});
  const siteSetupNeeded = useQuery(api.siteSettings.isSetupNeeded);
  const siteSettings = useQuery(api.siteSettings.getSiteSettings);

  // Check if there's an invite code from sign up
  const inviteCode = localStorage.getItem("signupInviteCode");

  // Check join request status (only if user exists, no profile, no invite
  // code, and the instance doesn't allow public signup — public-signup
  // instances skip the join-request gate entirely)
  const joinRequestStatus = useQuery(
    api.joinRequests.checkJoinRequestStatus,
    user && !userProfile && !inviteCode && !siteSettings?.allowPublicSignup && user.email
      ? { email: user.email }
      : "skip"
  );

  // Update document title based on site settings
  useEffect(() => {
    if (siteSettings?.organizationName) {
      document.title = `${siteSettings.organizationName} - Content Portal`;
    }
  }, [siteSettings?.organizationName]);

  // Swap in the org's uploaded favicon when one is configured. Falls back to
  // the neutral default `<link id="favicon">` already in index.html when
  // siteSettings has no faviconUrl (e.g. before setup, or an org that never
  // uploaded one), so there's never a broken/missing icon.
  useEffect(() => {
    if (!siteSettings?.faviconUrl) return;
    const link =
      document.getElementById("favicon") as HTMLLinkElement | null;
    if (link && link.href !== siteSettings.faviconUrl) {
      link.href = siteSettings.faviconUrl;
    }
  }, [siteSettings?.faviconUrl]);

  // Check if user just logged in and should be redirected to content
  useEffect(() => {
    if (user && userProfile) {
      const returnToContent = sessionStorage.getItem("returnToContent");
      if (returnToContent) {
        sessionStorage.removeItem("returnToContent");
        // Navigate to the content page after login
        void navigate(`/view/${returnToContent}?fromLogin=true`);
      }
    }
  }, [user, userProfile, navigate]);

  // Loading state - wait for user query to resolve first
  // userProfile can be null/false, but user should not be undefined
  if (user === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Setup wizard — shown when no profiles exist OR site setup not complete
  // This handles both first-run bootstrap and site configuration
  if (bootstrapNeeded || siteSetupNeeded) {
    return <SetupWizard />;
  }

  // Not authenticated — show sign in form for returning users
  if (!user) {
    // External auth: the token is valid but ensureExternalUser hasn't
    // finished creating the users row yet — show a loading state instead of
    // flashing the sign-in screen at an already-signed-in user.
    if (isExternalAuth && isAuthenticated) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-4">Setting up your account...</p>
          </div>
        </div>
      );
    }
    const siteName = siteSettings?.organizationName || "Content Platform";
    const siteTagline = siteSettings?.tagline || "Access your resources";

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Logo size="xl" showText={false} />
            </div>
            <h2 className="text-3xl font-extrabold text-foreground">
              {siteName}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {siteTagline}
            </p>
          </div>
          <SignInForm />
        </div>
      </div>
    );
  }

  // If we have a user but userProfile is still loading
  if (user && userProfile === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Loading your profile...
          </h2>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  // Authenticated but no profile — check join requests or show role selection
  if (user && !userProfile) {
    // Wait for settings before gating: while they load we can't tell whether
    // this instance allows public signup, and flashing the denial screen at a
    // legitimate signup would be worse than a moment of spinner.
    if (siteSettings === undefined) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-4">Checking access...</p>
          </div>
        </div>
      );
    }

    // Check for an approved join request — unless they have an invite code,
    // or the instance allows public signup (the server-side role clamp in
    // users.createUserProfile still limits code-less signups to client/parent).
    if (!inviteCode && !siteSettings?.allowPublicSignup) {
      // The status query is skipped when the account has no email (possible
      // with some external-auth tokens) — fall through to the denial screen
      // rather than spinning forever on a query that will never run.
      if (user.email && joinRequestStatus === undefined) {
        return (
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-4">Checking access...</p>
            </div>
          </div>
        );
      }

      if (joinRequestStatus?.status !== "approved") {
        const getMessage = () => {
          if (joinRequestStatus?.status === "pending_verification") {
            return "Please verify your email first. Check your inbox for the verification link.";
          }
          if (joinRequestStatus?.status === "pending") {
            return "Your join request is pending admin review. You'll receive an email once approved.";
          }
          if (joinRequestStatus?.status === "denied") {
            return "Your join request was denied. Please contact support.";
          }
          return "No approved join request found for this email. Please request access first.";
        };

        return (
          <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <Logo size="lg" showText={false} className="mx-auto mb-4" />
                <CardTitle>Access Not Available</CardTitle>
                <CardDescription>{getMessage()}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => signOut()} variant="outline" className="w-full">
                  Back to Sign In
                </Button>
              </CardContent>
            </Card>
          </div>
        );
      }
    }

    return <RoleSelection />;
  }

  const isAdmin = isAdminUser(userProfile?.effectivePermissions);

  if (isAdmin) {
    return <AdminDashboard />;
  }

  // Client user — use ClientLayout with nested routes
  return (
    <Routes>
      <Route element={<ClientLayout />}>
        <Route index element={<HomePage />} />
        <Route path="browse" element={<BrowsePage />} />
        <Route path="bundles" element={<BundlesPage />} />
        <Route path="bundles/:groupId" element={<BundleDetailPage />} />
        <Route path="shop" element={<ShopPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="shares" element={<SharesPage />} />
        <Route path="requests" element={<RequestsPage />} />
        <Route path="for-you" element={<ForYouPage />} />
      </Route>
    </Routes>
  );
}
