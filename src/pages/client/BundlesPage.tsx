import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Folder } from "lucide-react";
import { IconBadge } from "@/components/ui/icon-badge";

export function BundlesPage() {
  const contentGroups = useQuery(api.contentGroups.listContentGroups);
  const groups = contentGroups ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-client-text mb-6">
        Content Bundles
      </h1>
      {groups.length === 0 ? (
        <p
          className="text-client-text-secondary py-8 text-center"
          role="status"
        >
          No bundles available yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group: any) => (
            <div
              key={group._id}
              className="flex items-start gap-3 p-4 bg-client-card border border-client-border rounded-xl"
            >
              <IconBadge icon={Folder} variant="indigo" />
              <div>
                <h2 className="text-sm font-semibold text-client-text">
                  {group.name}
                </h2>
                {group.description && (
                  <p className="text-xs text-client-text-secondary mt-1">
                    {group.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
