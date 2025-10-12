import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { History, RotateCcw, Eye, Clock, User, Video, FileText, FileAudio, Newspaper, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { VideoThumbnail } from "./VideoThumbnail";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ContentVersionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  contentId: string;
  contentTitle: string;
}

interface Version {
  _id: string;
  versionNumber: number;
  title: string;
  description?: string;
  type: "video" | "article" | "document" | "audio";
  createdBy: string;
  createdAt: number;
  changeDescription?: string;
  creatorName: string;
  status: string;
  isPublic: boolean;
  active: boolean;
  fileId?: string;
  externalUrl?: string;
  richTextContent?: string;
  body?: string;
  thumbnailId?: string;
  tags?: string[];
  startDate?: number;
  endDate?: number;
}

export function ContentVersionHistory({
  isOpen,
  onClose,
  contentId,
  contentTitle,
}: ContentVersionHistoryProps) {
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [versionToRevert, setVersionToRevert] = useState<number | null>(null);

  const versions = useQuery(api.contentVersions.getVersionHistory, {
    contentId: contentId as any,
  });

  const versionDetails = useQuery(
    api.contentVersions.getVersion,
    selectedVersion && showPreview
      ? { contentId: contentId as any, versionNumber: selectedVersion.versionNumber }
      : "skip" as any
  );

  const revertToVersion = useMutation(api.contentVersions.revertToVersion);

  const handleRevert = async (versionNumber: number) => {
    const toastId = toast.loading(`Reverting to version ${versionNumber}...`);
    
    try {
      await revertToVersion({
        contentId: contentId as any,
        versionNumber,
      });
      toast.success(`Successfully reverted to version ${versionNumber}`, { id: toastId });
      setVersionToRevert(null);
      onClose();
    } catch (error) {
      console.error("Error reverting to version:", error);
      toast.error(error instanceof Error ? error.message : "Failed to revert to version", { id: toastId });
    }
  };

  const handlePreview = (version: Version) => {
    setSelectedVersion(version);
    setShowPreview(true);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
      case "published": return "default";
      case "review": return "secondary";
      case "draft": return "outline";
      case "rejected": return "destructive";
      default: return "outline";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video": return <Video className="w-5 h-5 text-primary" />;
      case "article": return <Newspaper className="w-5 h-5 text-primary" />;
      case "document": return <FileText className="w-5 h-5 text-primary" />;
      case "audio": return <FileAudio className="w-5 h-5 text-primary" />;
      default: return <FileText className="w-5 h-5 text-primary" />;
    }
  };

  const renderContentPreview = (version: any) => {
    if (!version) return null;

    const fileUrl = version.fileUrl;
    const thumbnailUrl = version.thumbnailUrl;

    switch (version.type) {
      case "video":
        return (
          <div className="space-y-4">
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              {fileUrl ? (
                <video 
                  src={fileUrl} 
                  controls 
                  className="w-full h-full"
                  preload="metadata"
                >
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
            {thumbnailUrl && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Thumbnail:</span>
                <img src={thumbnailUrl} alt="Thumbnail" className="h-16 rounded border" />
              </div>
            )}
          </div>
        );

      case "audio":
        return (
          <div className="space-y-4">
            {fileUrl ? (
              <audio src={fileUrl} controls className="w-full">
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
            {fileUrl ? (
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <FileText className="w-10 h-10 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">Document File</p>
                  <p className="text-sm text-muted-foreground">Click to download or view</p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer">
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
            {version.externalUrl && (
              <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                <ExternalLink className="w-5 h-5 text-primary" />
                <a 
                  href={version.externalUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  {version.externalUrl}
                </a>
              </div>
            )}
            {version.richTextContent && (
              <div className="prose prose-sm max-w-none p-4 bg-muted rounded-lg">
                <div dangerouslySetInnerHTML={{ __html: version.richTextContent }} />
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={isOpen && !showPreview} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <History className="w-5 h-5" />
              <DialogTitle>Version History</DialogTitle>
            </div>
            <DialogDescription>
              {contentTitle} - {versions?.length || 0} versions
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {versions?.map((version, index) => (
                <Card key={version._id} className={index === 0 ? "border-primary" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="font-mono">
                            v{version.versionNumber}
                          </Badge>
                          {index === 0 && (
                            <Badge variant="default">Current</Badge>
                          )}
                          <Badge variant={getStatusBadgeVariant(version.status)}>
                            {version.status}
                          </Badge>
                          {version.isPublic && (
                            <Badge variant="secondary">Public</Badge>
                          )}
                          {version.active && (
                            <Badge variant="outline">Active</Badge>
                          )}
                        </div>

                        <div>
                          <h4 className="font-medium">{version.title}</h4>
                          {version.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {version.description}
                            </p>
                          )}
                        </div>

                        {version.changeDescription && (
                          <p className="text-sm italic text-muted-foreground">
                            {version.changeDescription}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {version.creatorName}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(version.createdAt)}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreview(version)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Preview
                        </Button>
                        {index !== 0 && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setVersionToRevert(version.versionNumber)}
                          >
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Revert
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {(!versions || versions.length === 0) && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <History className="w-12 h-12 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No version history available</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>

          <Separator />
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Version Preview Modal */}
      {selectedVersion && (
        <Dialog open={showPreview} onOpenChange={(open) => {
          if (!open) {
            setShowPreview(false);
            setSelectedVersion(null);
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>
                Version {selectedVersion.versionNumber} Preview
              </DialogTitle>
              <DialogDescription>
                Created by {selectedVersion.creatorName} on {formatDate(selectedVersion.createdAt)}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">v{selectedVersion.versionNumber}</Badge>
                  <Badge variant={getStatusBadgeVariant(selectedVersion.status)}>
                    {selectedVersion.status}
                  </Badge>
                  <Badge variant="secondary">
                    <span className="mr-1">{getTypeIcon(selectedVersion.type)}</span>
                    {selectedVersion.type}
                  </Badge>
                  {selectedVersion.isPublic && <Badge>Public</Badge>}
                  {selectedVersion.active && <Badge variant="outline">Active</Badge>}
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">{selectedVersion.title}</h3>
                  {selectedVersion.description && (
                    <p className="text-muted-foreground">{selectedVersion.description}</p>
                  )}
                </div>

                {selectedVersion.changeDescription && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm italic">{selectedVersion.changeDescription}</p>
                  </div>
                )}

                <Separator />

                {/* Content Preview */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    {getTypeIcon(selectedVersion.type)}
                    Content Preview
                  </h4>
                  {versionDetails ? (
                    renderContentPreview(versionDetails)
                  ) : (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                    </div>
                  )}
                </div>

                <Separator />

                {/* Body Content */}
                {versionDetails?.body && (
                  <>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Additional Content</h4>
                      <div className="prose prose-sm max-w-none p-4 bg-muted rounded-lg">
                        <div dangerouslySetInnerHTML={{ __html: versionDetails.body }} />
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Tags */}
                {versionDetails?.tags && versionDetails.tags.length > 0 && (
                  <>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {versionDetails.tags.map((tag: string) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Availability Dates */}
                {(versionDetails?.startDate || versionDetails?.endDate) && (
                  <>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Availability</h4>
                      <dl className="grid grid-cols-2 gap-2 text-sm">
                        {versionDetails.startDate && (
                          <>
                            <dt className="text-muted-foreground">Start Date:</dt>
                            <dd>{formatDate(versionDetails.startDate)}</dd>
                          </>
                        )}
                        {versionDetails.endDate && (
                          <>
                            <dt className="text-muted-foreground">End Date:</dt>
                            <dd>{formatDate(versionDetails.endDate)}</dd>
                          </>
                        )}
                      </dl>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Version Details */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Version Metadata</h4>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <dt className="text-muted-foreground">Version Number:</dt>
                    <dd className="font-medium">{selectedVersion.versionNumber}</dd>
                    <dt className="text-muted-foreground">Status:</dt>
                    <dd className="capitalize">{selectedVersion.status}</dd>
                    <dt className="text-muted-foreground">Type:</dt>
                    <dd className="capitalize">{selectedVersion.type}</dd>
                    <dt className="text-muted-foreground">Visibility:</dt>
                    <dd>{selectedVersion.isPublic ? "Public" : "Private"}</dd>
                    <dt className="text-muted-foreground">Active:</dt>
                    <dd>{selectedVersion.active ? "Yes" : "No"}</dd>
                    <dt className="text-muted-foreground">Created By:</dt>
                    <dd>{selectedVersion.creatorName}</dd>
                    <dt className="text-muted-foreground">Created At:</dt>
                    <dd>{formatDate(selectedVersion.createdAt)}</dd>
                  </dl>
                </div>
              </div>
            </ScrollArea>

            <Separator />
            <div className="flex justify-between">
              <Button
                variant="secondary"
                onClick={() => setVersionToRevert(selectedVersion.versionNumber)}
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Revert to This Version
              </Button>
              <Button variant="outline" onClick={() => {
                setShowPreview(false);
                setSelectedVersion(null);
              }}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirmation Dialog for Revert */}
      <AlertDialog open={versionToRevert !== null} onOpenChange={(open) => !open && setVersionToRevert(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert to Version {versionToRevert}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the content from version {versionToRevert}. A new version will be created to preserve the current state. This action can be undone by reverting to another version.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => versionToRevert && void handleRevert(versionToRevert)}>
              Revert
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

