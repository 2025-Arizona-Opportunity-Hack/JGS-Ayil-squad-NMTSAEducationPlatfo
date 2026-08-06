import {
  Folder, FolderTree, ExternalLink, Archive,
  Users, UsersRound, Mail,
  ShoppingCart, TrendingUp, ClipboardList,
  Settings, Bug, ListChecks, ClipboardCheck,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";

interface SidebarItem {
  value: string;
  label: string;
  icon: typeof Folder;
  permission?: boolean;
  badge?: number;
  badgeLabel?: string;
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
    canManageQuizzes: boolean;
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
  // Reactive setup-health count for the sidebar badge. Convex dedupes
  // identical query+args subscriptions across call sites, so this shares
  // its subscription with SetupHealthBanner/SetupHealth rather than opening
  // a second one. Skipped entirely for users who can't manage site settings
  // (getSetupHealth would just return null for them anyway).
  const setupHealth = useQuery(
    api.setupHealth.getSetupHealth,
    permissions.canManageSiteSettings ? {} : "skip"
  );
  const setupIssueCount = setupHealth
    ? setupHealth.counts.critical + setupHealth.counts.blocking
    : 0;

  const groups: SidebarGroup[] = [
    {
      label: "Content",
      items: [
        { value: "content", label: "Content", icon: Folder },
        { value: "contentGroups", label: "Bundles", icon: FolderTree, permission: permissions.canManageContentGroups },
        { value: "quizzes", label: "Quizzes", icon: ClipboardCheck, permission: permissions.canManageQuizzes },
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
        {
          value: "setup",
          label: "Setup",
          icon: ListChecks,
          permission: permissions.canManageSiteSettings,
          badge: setupIssueCount > 0 ? setupIssueCount : undefined,
          badgeLabel:
            setupIssueCount > 0
              ? `${setupIssueCount} setup item${setupIssueCount === 1 ? "" : "s"} need attention`
              : undefined,
        },
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
                {visibleItems.map(({ value, label, icon: Icon, badge, badgeLabel }) => {
                  const active = activeTab === value;
                  return (
                    <li key={value}>
                      <button
                        onClick={() => onTabChange(value)}
                        data-tour={`tab-${value}`}
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
                        <span className="flex-1 text-left">{label}</span>
                        {badge ? (
                          <>
                            <span
                              aria-hidden="true"
                              className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[11px] font-semibold"
                            >
                              {badge}
                            </span>
                            <span className="sr-only">{badgeLabel}</span>
                          </>
                        ) : null}
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
