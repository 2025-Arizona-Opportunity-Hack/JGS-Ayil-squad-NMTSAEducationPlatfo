import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "convex/react";
import {
  House, Search, Folder, ShoppingCart, ClipboardList,
  ExternalLink, MessageSquare, Star,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Logo } from "../Logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "../ThemeToggle";
import { SignOutButton } from "../../SignOutButton";
import { cn } from "@/lib/utils";
import { navAnchor } from "@/lib/tourAnchors";
import { HelpButton } from "../guides/HelpButton";

interface ClientHeaderProps {
  onProfileClick: () => void;
  onHelpClick: () => void;
}

const desktopTabs = [
  { path: "/", label: "Home", icon: House },
  { path: "/browse", label: "Browse", icon: Search },
  { path: "/bundles", label: "Bundles", icon: Folder },
  { path: "/shop", label: "Shop", icon: ShoppingCart },
  { path: "/orders", label: "Orders", icon: ClipboardList },
  { path: "/shares", label: "Shares", icon: ExternalLink },
  { path: "/requests", label: "Requests", icon: MessageSquare },
  { path: "/for-you", label: "For You", icon: Star },
] as const;

export function ClientHeader({ onProfileClick, onHelpClick }: ClientHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const userProfile = useQuery(api.users.getCurrentUserProfile);
  const siteSettings = useQuery(api.siteSettings.getSiteSettings);
  const prominentHelp = siteSettings?.prominentHelpButton === true;

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const firstName = userProfile?.firstName || "";

  return (
    <header className="sticky top-0 z-30 bg-client-card border-b border-client-border">
      <div className="max-w-7xl mx-auto px-4">
        {/* Mobile header. The greeting truncates first; only if the controls
            still don't fit — a narrow window with very large text — do they
            move to a line of their own rather than overlap or fall off-screen. */}
        <div className="flex md:hidden flex-wrap items-center justify-between gap-x-2 gap-y-1 min-h-14 py-1.5">
          <div className="flex items-center gap-2 min-w-8 basis-0 grow">
            <Logo size="sm" showText={false} />
            <span
              className={cn(
                "text-sm font-medium text-client-text truncate",
                // Too narrow for both: a lone ellipsis says nothing.
                prominentHelp && "max-[22.4375em]:hidden",
              )}
            >
              Hi, {firstName}!
            </span>
          </div>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-1">
            <HelpButton tone="client" prominent={prominentHelp} onClick={onHelpClick} />
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={onProfileClick}
              aria-label="Open profile"
              className="min-w-[44px] min-h-[44px]"
              data-tour="client-nav-profile"
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={userProfile?.profilePictureUrl || undefined} alt="" />
                <AvatarFallback className="text-xs">
                  {userProfile?.firstName?.charAt(0)}{userProfile?.lastName?.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </Button>
            <SignOutButton className="min-w-[44px] min-h-[44px]" />
          </div>
        </div>

        {/* Desktop header. The logo, eight tabs, and four controls need about
            1,250px side by side. Narrower than that, the tabs take a row of
            their own beneath the logo and controls, rather than wrapping onto
            two lines or pushing the controls out of view. On one row, the
            organisation name truncates before anything else gives way. */}
        <div className="hidden md:grid grid-cols-[minmax(0,1fr)_auto] xl:grid-cols-[minmax(0,max-content)_1fr_auto] items-center gap-x-5 gap-y-1 py-2 xl:py-0 xl:h-16">
          <Logo size="md" showText={true} className="min-w-0" />
          <nav
            aria-label="Main navigation"
            className="col-span-2 row-start-2 flex items-center justify-between gap-0.5 xl:col-span-1 xl:col-start-2 xl:row-start-1 xl:justify-start xl:gap-1"
          >
            {desktopTabs.map(({ path, label, icon: Icon }) => {
              const active = isActive(path);
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  aria-current={active ? "page" : undefined}
                  data-tour={navAnchor(label)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors min-h-[44px]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-client-primary focus-visible:ring-offset-2",
                    active
                      ? "bg-client-primary/10 text-client-primary"
                      : "text-client-text-secondary hover:text-client-text hover:bg-client-surface"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>
          <div className="col-start-2 row-start-1 flex items-center gap-2 xl:col-start-3">
            <HelpButton tone="client" prominent={prominentHelp} onClick={onHelpClick} />
            <ThemeToggle />
            <Button
              variant="ghost"
              onClick={onProfileClick}
              aria-label="Open profile"
              className="flex items-center gap-2 min-h-[44px]"
              data-tour="client-nav-profile"
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={userProfile?.profilePictureUrl || undefined} alt="" />
                <AvatarFallback className="text-xs">
                  {userProfile?.firstName?.charAt(0)}{userProfile?.lastName?.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </Button>
            <SignOutButton className="min-h-[44px]" />
          </div>
        </div>
      </div>
    </header>
  );
}
