import { useLocation, useNavigate } from "react-router-dom";
import { House, Search, ShoppingCart, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  onMoreClick: () => void;
}

const navItems = [
  { path: "/", label: "Home", icon: House },
  { path: "/browse", label: "Browse", icon: Search },
  { path: "/shop", label: "Shop", icon: ShoppingCart },
] as const;

export function BottomNav({ onMoreClick }: BottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const moreRoutes = ["/bundles", "/orders", "/shares", "/requests", "/for-you"];
  const isMoreActive = moreRoutes.some((r) => location.pathname.startsWith(r));

  return (
    <nav
      aria-label="Bottom navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-client-card border-t border-client-border md:hidden"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map(({ path, label, icon: Icon }) => {
          const active = isActive(path);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center min-w-[64px] min-h-[44px] gap-0.5 rounded-xl px-3 py-1.5 transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-client-primary focus-visible:ring-offset-2",
                active
                  ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-[0_3px_8px_rgba(13,148,136,0.35)]"
                  : "text-client-text-secondary hover:text-client-text"
              )}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
              <span className="text-xs font-medium">{label}</span>
            </button>
          );
        })}
        <button
          onClick={onMoreClick}
          aria-current={isMoreActive ? "page" : undefined}
          aria-label="More navigation options"
          className={cn(
            "flex flex-col items-center justify-center min-w-[64px] min-h-[44px] gap-0.5 rounded-xl px-3 py-1.5 transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-client-primary focus-visible:ring-offset-2",
            isMoreActive
              ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-[0_3px_8px_rgba(13,148,136,0.35)]"
              : "text-client-text-secondary hover:text-client-text"
          )}
        >
          <MoreHorizontal className="w-5 h-5" strokeWidth={isMoreActive ? 2.5 : 2} />
          <span className="text-xs font-medium">More</span>
        </button>
      </div>
    </nav>
  );
}
