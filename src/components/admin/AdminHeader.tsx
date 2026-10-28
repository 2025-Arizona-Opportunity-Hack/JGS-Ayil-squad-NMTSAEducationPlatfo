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
import { HelpButton } from "../guides/HelpButton";
import { cn } from "@/lib/utils";

interface AdminHeaderProps {
  onProfileClick: () => void;
  onHelpClick: () => void;
  activeTab: string;
  onTabChange: (value: string) => void;
  sidebarPermissions: React.ComponentProps<typeof AdminSidebar>["permissions"];
}

export function AdminHeader({ onProfileClick, onHelpClick, activeTab, onTabChange, sidebarPermissions }: AdminHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userProfile = useQuery(api.users.getCurrentUserProfile);
  const siteSettings = useQuery(api.siteSettings.getSiteSettings);
  const orgName = siteSettings?.organizationName || "Content Platform";
  const prominentHelp = siteSettings?.prominentHelpButton === true;

  const handleMobileTabChange = (value: string) => {
    onTabChange(value);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-card border-b border-border">
      {/* The organisation name truncates first; only if the controls still
          don't fit — a narrow window with very large text — do they move to a
          line of their own rather than overlap or fall off-screen. */}
      <div className="px-4 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 min-h-14 sm:min-h-16 py-1.5">
        <div className="flex items-center gap-3 min-w-[44px] basis-0 grow">
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
          {/* Mobile: icon only (text moves to the second row below). On the
              narrowest screens the labelled Help button needs its room, and the
              organisation is still named in that second row. */}
          <Logo
            size="md"
            showText={false}
            className={cn("md:hidden", prominentHelp && "max-[24.9375em]:hidden")}
          />
          {/* Desktop: icon + truncated text. */}
          <Logo size="md" showText={true} className="hidden md:flex min-w-0" />
          <span className="hidden sm:inline-flex shrink-0 items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
            Admin
          </span>
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-1 sm:gap-2">
          <HelpButton tone="admin" prominent={prominentHelp} onClick={onHelpClick} data-tour="help-button" />
          <ThemeToggle />
          <Button
            variant="ghost"
            onClick={onProfileClick}
            aria-label="Open profile"
            className="flex items-center gap-2 min-h-[44px] min-w-[44px] px-1.5 sm:px-4"
          >
            <Avatar className="w-8 h-8">
              <AvatarImage src={userProfile?.profilePictureUrl || undefined} alt="" />
              <AvatarFallback className="text-xs">
                {userProfile?.firstName?.charAt(0)}{userProfile?.lastName?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline text-sm">{userProfile?.firstName}</span>
          </Button>
          <SignOutButton className="min-w-[44px] min-h-[44px] px-3 sm:px-4" />
        </div>
      </div>
      {/* Mobile-only second row: org name. Inherits the header's sticky
          positioning by being inside <header>. Hidden at md+ where the
          name lives inline in the Logo. */}
      <div className="md:hidden px-4 py-2 border-t border-border/60">
        <p
          className="text-sm font-semibold text-foreground truncate"
          title={orgName}
        >
          {orgName}
        </p>
      </div>
    </header>
  );
}
