import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "../../convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  User,
  Calendar,
  Video,
  FileText,
  FileAudio,
  Newspaper,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

const reviewSchema = z.object({
  reviewNotes: z.string().min(1, "Review notes are required"),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

interface ContentReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentId: string;
}

export function ContentReviewModal({
  isOpen,
  onClose,
  contentId,
}: ContentReviewModalProps) {
  const [actionType, setActionType] = useState<"approve" | "request_changes" | "reject" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const content = useQuery(api.content.getContent, { contentId: contentId as any });
  const approveContent = useMutation(api.content.approveContent);
  const requestChanges = useMutation(api.content.requestChanges);
  const rejectContent = useMutation(api.content.rejectContent);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
  });

  const handleAction = async (action: "approve" | "request_changes" | "reject") => {
    setActionType(action);
  };

  const onSubmit = async (data: ReviewFormData) => {
    if (!actionType) return;

    setIsSubmitting(true);
    try {
      if (actionType === "approve") {
        await approveContent({
          contentId: contentId as any,
          reviewNotes: data.reviewNotes,
        });
        toast.success("Content approved and published successfully!");
      } else if (actionType === "request_changes") {
        await requestChanges({
          contentId: contentId as any,
          reviewNotes: data.reviewNotes,
        });
        toast.success("Changes requested. The contributor will be notified.");
      } else if (actionType === "reject") {
        await rejectContent({
          contentId: contentId as any,
          reviewNotes: data.reviewNotes,
        });
        toast.success("Content rejected.");
      }

      reset();
      setActionType(null);
      onClose();
    } catch (error) {
      console.error("Error reviewing content:", error);
      toast.error(`Failed to ${actionType === "approve" ? "approve" : actionType === "request_changes" ? "request changes" : "reject"} content`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="w-5 h-5 text-primary" />;
      case "article":
        return <Newspaper className="w-5 h-5 text-primary" />;
      case "document":
        return <FileText className="w-5 h-5 text-primary" />;
      case "audio":
        return <FileAudio className="w-5 h-5 text-primary" />;
      default:
        return <FileText className="w-5 h-5 text-primary" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "review":
        return <Badge className="bg-yellow-500">In Review</Badge>;
      case "published":
        return <Badge className="bg-green-500">Published</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "changes_requested":
        return <Badge className="bg-orange-500">Changes Requested</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const renderContentPreview = () => {
    if (!content) return null;

    switch (content.type) {
      case "video":
        return (
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            {content.fileUrl ? (
              <video src={content.fileUrl} controls className="w-full h-full">
                Your browser does not support video playback.
              </video>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-muted-foreground">
                  <Video className="w-16 h-16 mx-auto mb-2" />
                  <p>Video file not available</p>
                </div>
              </div>
            )}
          </div>
        );
      case "audio":
        return (
          <div className="space-y-4">
            {content.fileUrl ? (
              <audio src={content.fileUrl} controls className="w-full">
                Your browser does not support audio playback.
              </audio>
            ) : (
              <div className="flex items-center justify-center py-12 bg-muted rounded-lg">
                <div className="text-center text-muted-foreground">
                  <FileAudio className="w-16 h-16 mx-auto mb-2" />
                  <p>Audio file not available</p>
                </div>
              </div>
            )}
          </div>
        );
      case "document":
        return (
          <div className="space-y-4">
            {content.fileUrl ? (
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <FileText className="w-10 h-10 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">Document File</p>
                  <p className="text-sm text-muted-foreground">Click to download or view</p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <a href={content.fileUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Open
                  </a>
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center py-12 bg-muted rounded-lg">
                <div className="text-center text-muted-foreground">
                  <FileText className="w-16 h-16 mx-auto mb-2" />
                  <p>Document file not available</p>
                </div>
              </div>
            )}
          </div>
        );
      case "article":
        return (
          <div className="space-y-4">
            {content.externalUrl && (
              <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                <ExternalLink className="w-5 h-5 text-primary" />
                <a
                  href={content.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  {content.externalUrl}
                </a>
              </div>
            )}
            {content.richTextContent && (
              <div className="prose prose-sm max-w-none p-4 bg-muted rounded-lg">
                <div dangerouslySetInnerHTML={{ __html: content.richTextContent }} />
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  if (!content) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            {getTypeIcon(content.type)}
            Review Content: {content.title}
          </DialogTitle>
          <DialogDescription>
            Review this content and take action: approve, request changes, or reject
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Metadata */}
          <div className="w-80 border-r flex flex-col bg-muted/30">
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-6">
                {/* Status and Metadata */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status & Info</h4>
                  <div className="flex flex-wrap gap-2">
                    {getStatusBadge(content.status)}
                    <Badge variant="outline">{content.type}</Badge>
                    {content.isPublic ? (
                      <Badge variant="outline">Public</Badge>
                    ) : (
                      <Badge variant="outline">Private</Badge>
                    )}
                    {!content.active && <Badge variant="destructive">Inactive</Badge>}
                  </div>
                </div>

                <Separator />

                {/* Metadata */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <User className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs text-muted-foreground">Created by</div>
                        <div className="text-foreground">{content.creatorName}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs text-muted-foreground">Created</div>
                        <div className="text-foreground">{formatDate(content._creationTime)}</div>
                      </div>
                    </div>
                    {content.submittedForReviewAt && (
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="text-xs text-muted-foreground">Submitted</div>
                          <div className="text-foreground">{formatDate(content.submittedForReviewAt)}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tags */}
                {content.tags && content.tags.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {content.tags.map((tag: string, index: number) => (
                          <Badge key={index} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Previous Review Notes */}
                {content.reviewNotes && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Previous Review
                      </h4>
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <p className="text-sm">{content.reviewNotes}</p>
                        {content.reviewedAt && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDate(content.reviewedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-6 max-w-4xl">
                {/* Title and Description */}
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold">{content.title}</h3>
                  {content.description && (
                    <p className="text-muted-foreground text-lg">{content.description}</p>
                  )}
                </div>

                <Separator />

                {/* Content Preview */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Content Preview</h4>
                  {renderContentPreview()}
                </div>

                {/* Body Content */}
                {content.body && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Additional Content</h4>
                      <div className="prose prose-sm max-w-none p-6 bg-muted/50 rounded-lg">
                        <div dangerouslySetInnerHTML={{ __html: content.body }} />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>

            {/* Review Actions - Always visible at bottom */}
            {content.status === "review" && (
              <div className="border-t p-6 bg-background">
                <div className="space-y-4 max-w-4xl">
              <h4 className="text-sm font-medium">Take Action</h4>
              
              {!actionType ? (
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    onClick={() => handleAction("approve")}
                    className="flex flex-col items-center gap-2 h-auto py-4 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="w-6 h-6" />
                    <span>Approve & Publish</span>
                  </Button>
                  <Button
                    onClick={() => handleAction("request_changes")}
                    variant="outline"
                    className="flex flex-col items-center gap-2 h-auto py-4 border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                  >
                    <AlertCircle className="w-6 h-6" />
                    <span>Request Changes</span>
                  </Button>
                  <Button
                    onClick={() => handleAction("reject")}
                    variant="destructive"
                    className="flex flex-col items-center gap-2 h-auto py-4"
                  >
                    <XCircle className="w-6 h-6" />
                    <span>Reject</span>
                  </Button>
                </div>
              ) : (
                <form onSubmit={(e) => { void handleSubmit(onSubmit)(e); }} className="space-y-4">
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2 mb-3">
                      {actionType === "approve" && (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                          <span className="font-medium">Approving and Publishing</span>
                        </>
                      )}
                      {actionType === "request_changes" && (
                        <>
                          <AlertCircle className="w-5 h-5 text-orange-600" />
                          <span className="font-medium">Requesting Changes</span>
                        </>
                      )}
                      {actionType === "reject" && (
                        <>
                          <XCircle className="w-5 h-5 text-destructive" />
                          <span className="font-medium">Rejecting Content</span>
                        </>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reviewNotes">
                        {actionType === "approve" ? "Review Notes (optional feedback)" : "Review Notes *"}
                      </Label>
                      <Textarea
                        id="reviewNotes"
                        {...register("reviewNotes")}
                        rows={4}
                        placeholder={
                          actionType === "approve"
                            ? "Add any feedback or notes about this approval..."
                            : actionType === "request_changes"
                            ? "Describe the changes needed..."
                            : "Explain why this content is being rejected..."
                        }
                        className={errors.reviewNotes ? "border-destructive" : ""}
                      />
                      {errors.reviewNotes && (
                        <p className="text-sm text-destructive">{errors.reviewNotes.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
                          Processing...
                        </>
                      ) : (
                        <>
                          {actionType === "approve" && "Approve & Publish"}
                          {actionType === "request_changes" && "Request Changes"}
                          {actionType === "reject" && "Reject Content"}
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setActionType(null);
                        reset();
                      }}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

