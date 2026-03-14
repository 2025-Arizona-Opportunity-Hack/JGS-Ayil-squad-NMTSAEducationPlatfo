import {
  Folder, FolderTree, ExternalLink, Archive,
  Users, UsersRound, Mail,
  ShoppingCart, TrendingUp, ClipboardList,
  Settings, Bug,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarItem {
  value: string;
  label: string;
  icon: typeof Folder;
  permission?: boolean;
}

interface SidebarGroup {
  label: string;
  items: SidebarItem[];
}

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  className?: string;
  permissions: {
    canManageContentGroups: boolean;
    canViewUsers: boolean;
    canManageUserGroups: boolean;
    canViewAnalytics: boolean;
    canViewPurchaseRequests: boolean;
    canViewOrders: boolean;
    canViewArchivedContent: boolean;
    canManageSiteSettings: boolean;
  };
}

export function AdminSidebar({ activeTab, onTabChange, permissions, className }: AdminSidebarProps) {
  const groups: SidebarGroup[] = [
    {
      label: "Content",
      items: [
        { value: "content", label: "Content", icon: Folder },
        { value: "contentGroups", label: "Bundles", icon: FolderTree, permission: permissions.canManageContentGroups },
        { value: "shareLinks", label: "Shares", icon: ExternalLink },
        { value: "archived", label: "Archived", icon: Archive, permission: permissions.canViewArchivedContent },
      ],
    },
    {
      label: "Users",
      items: [
        { value: "users", label: "Users", icon: Users, permission: permissions.canViewUsers },
        { value: "userGroups", label: "Groups", icon: UsersRound, permission: permissions.canManageUserGroups },
        { value: "joinRequests", label: "Joins", icon: Mail, permission: permissions.canViewUsers },
      ],
    },
    {
      label: "Commerce",
      items: [
        { value: "orders", label: "Orders", icon: ShoppingCart, permission: permissions.canViewOrders },
        { value: "analytics", label: "Analytics", icon: TrendingUp, permission: permissions.canViewAnalytics },
        { value: "purchaseRequests", label: "Purchases", icon: ClipboardList, permission: permissions.canViewPurchaseRequests },
      ],
    },
    {
      label: "System",
      items: [
        { value: "settings", label: "Settings", icon: Settings, permission: permissions.canManageSiteSettings },
        { value: "debug", label: "Debug", icon: Bug, permission: permissions.canManageSiteSettings },
      ],
    },
  ];

  return (
    <aside className={cn("w-52 shrink-0 border-r border-border bg-card overflow-y-auto", className)} aria-label="Admin navigation">
      <nav className="p-3 space-y-4">
        {groups.map((group) => {
          const visibleItems = group.items.filter((item) => item.permission !== false);
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label} role="group" aria-labelledby={`sidebar-group-${group.label.toLowerCase()}`} data-tour={`sidebar-${group.label.toLowerCase()}`}>
              <h3 id={`sidebar-group-${group.label.toLowerCase()}`} className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                {group.label}
              </h3>
              <ul className="space-y-0.5" role="list">
                {visibleItems.map(({ value, label, icon: Icon }) => {
                  const active = activeTab === value;
                  return (
                    <li key={value}>
                      <button
                        onClick={() => onTabChange(value)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-colors min-h-[44px]",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                          active
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        )}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
