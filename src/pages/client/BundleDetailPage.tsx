import { useQuery } from "convex/react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Video,
  FileText,
  FileAudio,
  Newspaper,
} from "lucide-react";
import { QuizPanel } from "@/components/quiz/QuizPanel";

function typeIcon(type: string) {
  switch (type) {
    case "video":
      return Video;
    case "audio":
      return FileAudio;
    case "article":
      return Newspaper;
    default:
      return FileText;
  }
}

export function BundleDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const bundle = useQuery(
    api.publicBundles.getBundleForLearner,
    groupId ? { groupId: groupId as any } : ("skip" as any)
  );

  if (bundle === undefined) {
    return (
      <div className="flex justify-center py-16" role="status" aria-label="Loading bundle">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-client-primary border-t-transparent" />
      </div>
    );
  }

  if (bundle === null) {
    return (
      <div className="text-center py-16">
        <h1 className="text-xl font-bold text-client-text mb-2">
          Bundle not available
        </h1>
        <p className="text-client-text-secondary mb-6">
          This bundle doesn't exist or you don't have access to it.
        </p>
        <Link
          to="/bundles"
          className="inline-flex items-center gap-2 text-client-primary hover:underline"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to bundles
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        to="/bundles"
        className="inline-flex items-center gap-2 text-sm text-client-text-secondary hover:text-client-text mb-4"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Back to bundles
      </Link>

      <div className="flex items-start gap-4 mb-6">
        {bundle.thumbnailUrl && (
          <img
            src={bundle.thumbnailUrl}
            alt=""
            className="w-16 h-16 rounded-xl object-cover shrink-0"
          />
        )}
        <div>
          <h1 className="text-2xl font-bold text-client-text">
            {bundle.name}
          </h1>
          {bundle.description && (
            <p className="text-client-text-secondary mt-1">
              {bundle.description}
            </p>
          )}
          <p className="text-sm text-client-text-secondary mt-2" role="status">
            {bundle.completedCount} of {bundle.items.length} completed
          </p>
        </div>
      </div>

      {bundle.items.length === 0 ? (
        <p
          className="text-client-text-secondary py-8 text-center"
          role="status"
        >
          This bundle doesn't have any content yet.
        </p>
      ) : (
        <ol className="space-y-2 mb-8" aria-label={`Content in ${bundle.name}, in order`}>
          {bundle.items.map((item, index) => {
            const Icon = typeIcon(item.type);
            return (
              <li key={item.groupItemId}>
                <Link
                  to={`/view/${item.contentId}`}
                  className="flex items-center gap-3 p-3 sm:p-4 bg-client-card border border-client-border rounded-xl hover:border-client-primary transition-colors min-h-[44px]"
                >
                  <span className="text-sm font-semibold text-client-text-secondary w-6 text-center shrink-0">
                    {index + 1}
                  </span>
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt=""
                      className="w-14 h-9 rounded-md object-cover shrink-0"
                    />
                  ) : (
                    <span className="flex w-14 h-9 items-center justify-center rounded-md bg-client-border/40 shrink-0">
                      <Icon
                        className="w-4 h-4 text-client-text-secondary"
                        aria-hidden="true"
                      />
                    </span>
                  )}
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-client-text truncate">
                      {item.title}
                    </span>
                    <span className="block text-xs text-client-text-secondary capitalize">
                      {item.type}
                    </span>
                  </span>
                  {item.completed ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600 shrink-0">
                      <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                      Completed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-client-text-secondary shrink-0">
                      <Circle className="w-4 h-4" aria-hidden="true" />
                      Not started
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ol>
      )}

      {/* Bundle quiz — appears after the item list; the panel handles the
          locked state until every item above is completed. */}
      {groupId && <QuizPanel groupId={groupId as any} />}
    </div>
  );
}
