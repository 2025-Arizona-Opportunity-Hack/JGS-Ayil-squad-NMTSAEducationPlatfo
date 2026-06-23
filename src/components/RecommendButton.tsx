import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { RecommendContentModal } from "./RecommendContentModal";

interface RecommendButtonProps {
  /** The viewer's effective permissions (from getCurrentUserProfile). */
  permissions: string[] | undefined;
  contentId: string;
  title: string;
  className?: string;
}

/**
 * "Recommend" action for the content viewer. Only rendered for users who hold
 * RECOMMEND_CONTENT (professionals), so it appears in the client portal where
 * they now land — the modal/mutation are otherwise admin-only surfaces.
 */
export function RecommendButton({
  permissions,
  contentId,
  title,
  className,
}: RecommendButtonProps) {
  const [open, setOpen] = useState(false);

  if (!hasPermission(permissions, PERMISSIONS.RECOMMEND_CONTENT)) {
    return null;
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={className}
        onClick={() => setOpen(true)}
      >
        <Share2 className="w-4 h-4 mr-2" />
        Recommend
      </Button>
      <RecommendContentModal
        content={{ _id: contentId, title }}
        isOpen={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
