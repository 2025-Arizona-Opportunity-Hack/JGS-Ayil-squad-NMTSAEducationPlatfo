import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { AdminDashboard } from "./components/AdminDashboard";
import { ClientDashboard } from "./components/ClientDashboard";
import { RoleSelection } from "./components/RoleSelection";
import { ProfileEditModal } from "./components/ProfileEditModal";
import { SiteSetup } from "./components/SiteSetup";
import { Logo } from "./components/Logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { hasPermission, hasAnyPermission, PERMISSIONS } from "@/lib/permissions";

export default function App() {
  const navigate = useNavigate();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);
  const user = useQuery(api.auth.loggedInUser);
  const userProfile = useQuery(api.users.getCurrentUserProfile);
  const bootstrapNeeded = useQuery(api.users.bootstrapNeeded, {});
  const siteSetupNeeded = useQuery(api.siteSettings.isSetupNeeded);
  const siteSettings = useQuery(api.siteSettings.getSiteSettings);
  const createOwnerProfile = useMutation(api.users.createOwnerProfile);
  const [ownerBootstrapping, setOwnerBootstrapping] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);

  const handleProfileUpdated = () => {
    // Force a refresh by incrementing the key
    setProfileRefreshKey((prev) => prev + 1);
  };

  // Update document title based on site settings
  useEffect(() => {
    if (siteSettings?.organizationName) {
      document.title = `${siteSettings.organizationName} - Content Portal`;
    }
  }, [siteSettings?.organizationName]);

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

  // If this is the very first login (no profiles exist), create owner profile
  useEffect(() => {
    if (user && userProfile === null && bootstrapNeeded && !ownerBootstrapping) {
      setOwnerBootstrapping(true);
      void (async () => {
        try {
          await createOwnerProfile({});
          // Force refresh of profile
          setProfileRefreshKey((prev) => prev + 1);
        } catch (err) {
          console.error("Owner bootstrap failed:", err);
        } finally {
          setOwnerBootstrapping(false);
        }
      })();
    }
  }, [user, userProfile, bootstrapNeeded, ownerBootstrapping, createOwnerProfile]);

  console.log("App state:", {
    user: !!user,
    userProfile: !!userProfile,
    userUndefined: user === undefined,
    profileUndefined: userProfile === undefined,
  });

  // Loading state - wait for user query to resolve first
  // userProfile can be null/false, but user should not be undefined
  if (user === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Not authenticated - show sign in form or join request
  if (!user) {
    const siteName = siteSettings?.organizationName || "Content Platform";
    const siteTagline = siteSettings?.tagline || "Access your resources";
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Logo size="xl" showText={false} />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900">
              {siteName}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Loading your profile...
          </h2>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  // Authenticated but no profile
  // If bootstrap needed, we're creating owner profile, so show loading
  if (user && !userProfile) {
    if (bootstrapNeeded || ownerBootstrapping) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Initializing your owner account...
            </h2>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      );
    }
    console.log("Showing role selection for user:", user.email);
    return <RoleSelection />;
  }

  // Owner needs to complete site setup
  if (userProfile?.role === "owner" && siteSetupNeeded && !setupComplete) {
    return <SiteSetup onComplete={() => setSetupComplete(true)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <Logo size="md" showText={true} />
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => setIsProfileModalOpen(true)}
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage
                    src={userProfile?.profilePictureUrl || undefined}
                    alt="Profile picture"
                  />
                  <AvatarFallback className="text-xs">
                    {userProfile?.firstName?.charAt(0)}
                    {userProfile?.lastName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-gray-700">
                  {userProfile?.firstName} {userProfile?.lastName}
                </span>
              </Button>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                {userProfile?.role}
              </span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto py-6 sm:px-6 lg:px-8">
        {hasAnyPermission(userProfile?.effectivePermissions, [
          PERMISSIONS.CREATE_CONTENT,
          PERMISSIONS.EDIT_CONTENT,
          PERMISSIONS.VIEW_ALL_CONTENT,
          PERMISSIONS.VIEW_USERS,
          PERMISSIONS.MANAGE_SITE_SETTINGS,
        ]) ? (
          <AdminDashboard />
        ) : (
          <ClientDashboard />
        )}
      </main>

      {/* Profile Edit Modal */}
      {userProfile && (
        <ProfileEditModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          onProfileUpdated={handleProfileUpdated}
          currentProfile={{
            firstName: userProfile.firstName,
            lastName: userProfile.lastName,
            profilePictureId: userProfile.profilePictureId,
            profilePictureUrl: userProfile.profilePictureUrl || undefined,
          }}
        />
      )}
    </div>
  );
}
