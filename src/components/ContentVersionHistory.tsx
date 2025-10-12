import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { History, RotateCcw, Eye, Clock, User } from "lucide-react";
import { api } from "../../convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  type: string;
  createdBy: string;
  createdAt: number;
  changeDescription?: string;
  creatorName: string;
  status: string;
  isPublic: boolean;
  active: boolean;
}

export function ContentVersionHistory({
  isOpen,
  onClose,
  contentId,
  contentTitle,
}: ContentVersionHistoryProps) {
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const versions = useQuery(api.contentVersions.getVersionHistory, {
    contentId: contentId as any,
  });

  const revertToVersion = useMutation(api.contentVersions.revertToVersion);

  const handleRevert = async (versionNumber: number) => {
    if (!confirm(`Are you sure you want to revert to version ${versionNumber}? This will create a new version with the content from version ${versionNumber}.`)) {
      return;
    }

    try {
      await revertToVersion({
        contentId: contentId as any,
        versionNumber,
      });
      alert(`Successfully reverted to version ${versionNumber}`);
      onClose();
    } catch (error) {
      console.error("Error reverting to version:", error);
      alert(error instanceof Error ? error.message : "Failed to revert to version");
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
                            onClick={() => void handleRevert(version.versionNumber)}
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
                  <Badge variant="secondary">{selectedVersion.type}</Badge>
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

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Version Details</h4>
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
                onClick={() => void handleRevert(selectedVersion.versionNumber)}
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
    </>
  );
}

