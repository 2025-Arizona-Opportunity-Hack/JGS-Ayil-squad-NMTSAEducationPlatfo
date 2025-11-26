import { useState } from "react";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { Home } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { SignOutButton } from "../SignOutButton";
import { ProfileEditModal } from "./ProfileEditModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";

export function Navbar() {
  const navigate = useNavigate();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);
  const user = useQuery(api.auth.loggedInUser);
  const userProfile = useQuery(api.users.getCurrentUserProfile);

  const handleProfileUpdated = () => {
    setProfileRefreshKey((prev) => prev + 1);
  };

  const handleHomeClick = () => {
    navigate("/");
  };

  // Don't show navbar if not authenticated
  if (!user || !userProfile) {
    return null;
  }

  return (
    <>
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <Logo size="md" showText={true} />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleHomeClick}
                className="flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Home
              </Button>
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
    </>
  );
}

