import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { AdminDashboard } from "./components/AdminDashboard";
import { ClientDashboard } from "./components/ClientDashboard";
import { RoleSelection } from "./components/RoleSelection";
import { ProfileEditModal } from "./components/ProfileEditModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export default function App() {
  const navigate = useNavigate();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);
  const user = useQuery(api.auth.loggedInUser);
  const userProfile = useQuery(api.users.getCurrentUserProfile);

  const handleProfileUpdated = () => {
    // Force a refresh by incrementing the key
    setProfileRefreshKey((prev) => prev + 1);
  };

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

  // Not authenticated - show sign in form
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              NMTSA Content Platform
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Access your neurologic music therapy resources
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

  // Authenticated but no profile - show role selection
  if (user && !userProfile) {
    console.log("Showing role selection for user:", user.email);
    return <RoleSelection />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                NMTSA Content Platform
              </h1>
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
        {userProfile?.role === "admin" || userProfile?.role === "editor" || userProfile?.role === "contributor" ? (
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
