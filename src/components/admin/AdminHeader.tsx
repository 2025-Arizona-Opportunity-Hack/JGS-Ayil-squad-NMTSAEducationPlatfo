import { useState } from "react";
import { useQuery } from "convex/react";
import { Menu } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Logo } from "../Logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "../ThemeToggle";
import { SignOutButton } from "../../SignOutButton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AdminSidebar } from "./AdminSidebar";

interface AdminHeaderProps {
  onProfileClick: () => void;
  activeTab: string;
  onTabChange: (value: string) => void;
  sidebarPermissions: React.ComponentProps<typeof AdminSidebar>["permissions"];
}

export function AdminHeader({ onProfileClick, activeTab, onTabChange, sidebarPermissions }: AdminHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userProfile = useQuery(api.users.getCurrentUserProfile);

  const handleMobileTabChange = (value: string) => {
    onTabChange(value);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-card border-b border-border">
      <div className="px-4 flex items-center justify-between h-14 sm:h-16">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden min-w-[44px] min-h-[44px]" aria-label="Open navigation menu">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetHeader className="p-4 border-b">
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <AdminSidebar
                activeTab={activeTab}
                onTabChange={handleMobileTabChange}
                permissions={sidebarPermissions}
                className="w-full border-r-0"
              />
            </SheetContent>
          </Sheet>
          <Logo size="md" showText={true} />
          <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
            Admin
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            onClick={onProfileClick}
            aria-label="Open profile"
            className="flex items-center gap-2 min-h-[44px]"
          >
            <Avatar className="w-8 h-8">
              <AvatarImage src={userProfile?.profilePictureUrl || undefined} alt="" />
              <AvatarFallback className="text-xs">
                {userProfile?.firstName?.charAt(0)}{userProfile?.lastName?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline text-sm">{userProfile?.firstName}</span>
          </Button>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
