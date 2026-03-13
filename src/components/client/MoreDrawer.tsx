import { useLocation, useNavigate } from "react-router-dom";
import { Folder, ClipboardList, ExternalLink, MessageSquare, Star } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface MoreDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const drawerItems = [
  { path: "/bundles", label: "Bundles", icon: Folder },
  { path: "/orders", label: "Orders", icon: ClipboardList },
  { path: "/shares", label: "Shares", icon: ExternalLink },
  { path: "/requests", label: "Requests", icon: MessageSquare },
  { path: "/for-you", label: "For You", icon: Star },
] as const;

export function MoreDrawer({ open, onOpenChange }: MoreDrawerProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader>
          <SheetTitle>More</SheetTitle>
        </SheetHeader>
        <nav aria-label="Additional navigation" className="mt-4 space-y-1">
          {drawerItems.map(({ path, label, icon: Icon }) => {
            const active = location.pathname.startsWith(path);
            return (
              <button
                key={path}
                onClick={() => handleNavigate(path)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 w-full px-4 py-3 rounded-lg text-left transition-colors min-h-[44px]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-client-primary focus-visible:ring-offset-2",
                  active
                    ? "bg-client-primary/10 text-client-primary font-medium"
                    : "text-client-text hover:bg-client-surface"
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
