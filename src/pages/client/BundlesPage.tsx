import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import { Folder, ClipboardCheck, CheckCircle2 } from "lucide-react";
import { IconBadge } from "@/components/ui/icon-badge";

export function BundlesPage() {
  const bundles = useQuery(api.publicBundles.listMyBundles);
  const groups = bundles ?? [];

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
          {groups.map((group) => (
            <Link
              key={group._id}
              to={`/bundles/${group._id}`}
              className="flex items-start gap-3 p-4 bg-client-card border border-client-border rounded-xl hover:border-client-primary focus-visible:outline-2 focus-visible:outline-offset-2 transition-colors"
            >
              {group.thumbnailUrl ? (
                <img
                  src={group.thumbnailUrl}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover shrink-0"
                />
              ) : (
                <IconBadge icon={Folder} variant="indigo" />
              )}
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-client-text">
                  {group.name}
                </h2>
                {group.description && (
                  <p className="text-xs text-client-text-secondary mt-1 line-clamp-2">
                    {group.description}
                  </p>
                )}
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-client-text-secondary mt-2">
                  <span>
                    {group.itemCount}{" "}
                    {group.itemCount === 1 ? "item" : "items"}
                  </span>
                  {group.itemCount > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2
                        className="w-3.5 h-3.5"
                        aria-hidden="true"
                      />
                      {group.completedCount} completed
                    </span>
                  )}
                  {group.hasQuiz && (
                    <span className="inline-flex items-center gap-1">
                      <ClipboardCheck
                        className="w-3.5 h-3.5"
                        aria-hidden="true"
                      />
                      Quiz
                    </span>
                  )}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
