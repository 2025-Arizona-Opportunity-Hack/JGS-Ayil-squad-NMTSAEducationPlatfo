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
import { cn } from "@/lib/utils";

interface ClientHeaderProps {
  onProfileClick: () => void;
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

export function ClientHeader({ onProfileClick }: ClientHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const userProfile = useQuery(api.users.getCurrentUserProfile);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const firstName = userProfile?.firstName || "";

  return (
    <header className="sticky top-0 z-30 bg-client-card border-b border-client-border">
      <div className="max-w-7xl mx-auto px-4">
        {/* Mobile header */}
        <div className="flex md:hidden items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <Logo size="sm" showText={false} />
            <span className="text-sm font-medium text-client-text">
              Hi, {firstName}!
            </span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={onProfileClick}
              aria-label="Open profile"
              className="min-w-[44px] min-h-[44px]"
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={userProfile?.profilePictureUrl || undefined} alt="" />
                <AvatarFallback className="text-xs">
                  {userProfile?.firstName?.charAt(0)}{userProfile?.lastName?.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </div>
        </div>

        {/* Desktop header */}
        <div className="hidden md:flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <Logo size="md" showText={true} />
            <nav aria-label="Main navigation" className="flex items-center gap-1">
              {desktopTabs.map(({ path, label, icon: Icon }) => {
                const active = isActive(path);
                return (
                  <button
                    key={path}
                    onClick={() => navigate(path)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px]",
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
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
