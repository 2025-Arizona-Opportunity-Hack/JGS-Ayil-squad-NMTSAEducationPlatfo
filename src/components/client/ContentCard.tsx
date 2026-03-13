import { useNavigate } from "react-router-dom";
import { FileText, Play, Download, FileAudio, Newspaper } from "lucide-react";
import { IconBadge } from "@/components/ui/icon-badge";
import type { IconBadgeVariant } from "@/components/ui/icon-badge";
import { cn } from "@/lib/utils";

const typeConfig: Record<string, { icon: typeof FileText; variant: IconBadgeVariant; label: string }> = {
  richtext: { icon: FileText, variant: "teal", label: "Article" },
  video: { icon: Play, variant: "indigo", label: "Video" },
  audio: { icon: FileAudio, variant: "green", label: "Audio" },
  pdf: { icon: Download, variant: "amber", label: "PDF" },
  image: { icon: Newspaper, variant: "teal", label: "Image" },
  article: { icon: FileText, variant: "teal", label: "Article" },
};

interface ContentCardProps {
  id: string;
  title: string;
  contentType: string;
  isFree?: boolean;
  isNew?: boolean;
  metadata?: string;
  progress?: number;
  className?: string;
}

export function ContentCard({
  id, title, contentType, isFree, isNew, metadata, progress, className,
}: ContentCardProps) {
  const navigate = useNavigate();
  const config = typeConfig[contentType] || typeConfig.richtext;

  return (
    <button
      onClick={() => navigate(`/view/${id}`)}
      className={cn(
        "flex flex-col bg-client-card border border-client-border rounded-xl overflow-hidden text-left transition-shadow hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-client-primary focus-visible:ring-offset-2",
        "min-h-[44px] w-full",
        className
      )}
      aria-label={`${title} — ${config.label}${isFree ? ", free" : ""}${isNew ? ", new" : ""}`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <IconBadge icon={config.icon} variant={config.variant} size="sm" />
        <span className="text-xs font-medium text-client-text-secondary uppercase tracking-wide">
          {config.label}
        </span>
        <div className="flex gap-1.5 ml-auto">
          {isNew && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-client-primary/10 text-client-primary">
              New
            </span>
          )}
          {isFree && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-client-success/10 text-client-success">
              Free
            </span>
          )}
        </div>
      </div>
      <div className="px-4 pb-3 flex-1">
        <h3 className="text-sm font-semibold text-client-text line-clamp-2">{title}</h3>
        {metadata && (
          <p className="text-xs text-client-text-secondary mt-1">{metadata}</p>
        )}
      </div>
      {progress !== undefined && progress > 0 && (
        <div className="px-4 pb-3">
          <div
            className="w-full h-1.5 bg-client-border rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${progress}% complete`}
          >
            <div
              className="h-full bg-client-primary rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </button>
  );
}
