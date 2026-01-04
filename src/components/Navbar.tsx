import { useState } from "react";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { Home, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { api } from "../../convex/_generated/api";
import { SignOutButton } from "../SignOutButton";
import { ProfileEditModal } from "./ProfileEditModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";

export function Navbar() {
  const navigate = useNavigate();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
          <div className="flex justify-between h-14 sm:h-16">
            {/* Left side - Logo and Home button */}
            <div className="flex items-center gap-2 sm:gap-4">
              <Logo size="md" showText={false} className="sm:hidden" />
              <Logo size="md" showText={true} className="hidden sm:flex" />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleHomeClick}
                className="hidden sm:flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Home
              </Button>
            </div>

            {/* Desktop navigation */}
            <div className="hidden sm:flex items-center space-x-4">
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

            {/* Mobile navigation */}
            <div className="flex sm:hidden items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleHomeClick}
              >
                <Home className="w-5 h-5" />
              </Button>
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 p-0">
                  <SheetHeader className="p-6 border-b">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage
                          src={userProfile?.profilePictureUrl || undefined}
                          alt="Profile picture"
                        />
                        <AvatarFallback>
                          {userProfile?.firstName?.charAt(0)}
                          {userProfile?.lastName?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <SheetTitle className="text-left text-base">
                          {userProfile?.firstName} {userProfile?.lastName}
                        </SheetTitle>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize mt-1">
                          {userProfile?.role}
                        </span>
                      </div>
                    </div>
                  </SheetHeader>
                  <div className="p-4 space-y-2">
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        setIsProfileModalOpen(true);
                        setMobileMenuOpen(false);
                      }}
                    >
                      Edit Profile
                    </Button>
                    <div className="pt-2 border-t">
                      <SignOutButton className="w-full" />
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
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

