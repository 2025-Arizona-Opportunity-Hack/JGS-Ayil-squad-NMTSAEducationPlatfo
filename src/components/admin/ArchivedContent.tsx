import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Video,
  FileText,
  FileAudio,
  Newspaper,
  Archive,
  ArchiveRestore,
  Search,
  Eye,
  Calendar,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ArchivedContent() {
  const archivedContent = useQuery(api.content.listArchivedContent);
  const unarchiveContent = useMutation(api.content.unarchiveContent);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContent, setSelectedContent] = useState<any>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const getContentIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="w-5 h-5" />;
      case "audio":
        return <FileAudio className="w-5 h-5" />;
      case "article":
        return <Newspaper className="w-5 h-5" />;
      case "document":
        return <FileText className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const handleUnarchive = async (contentId: string) => {
    const toastId = toast.loading("Restoring content...");
    try {
      await unarchiveContent({ contentId: contentId as any });
      toast.success("Content restored successfully!", { id: toastId });
    } catch (error) {
      console.error("Error restoring content:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to restore content",
        { id: toastId }
      );
    }
  };

  const filteredContent = archivedContent?.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      item.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  if (!archivedContent) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Archive className="w-8 h-8" />
          Archived Content
        </h2>
        <p className="text-muted-foreground mt-2">
          View and restore archived content. Archived content is hidden from all
          users except admins.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search archived content..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                Total Archived Items
              </p>
              <p className="text-2xl font-bold">{archivedContent.length}</p>
            </div>
            <div className="bg-orange-50 p-3 rounded-full">
              <Archive className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content List */}
      {filteredContent?.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Archive className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Archived Content</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery
                ? "No archived content matches your search."
                : "Content that you archive will appear here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredContent?.map((item) => (
            <Card key={item._id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-orange-50">
                      {getContentIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">{item.title}</h4>
                      {item.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {item.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant="outline" className="capitalize">
                          {item.type}
                        </Badge>
                        <Badge
                          variant={
                            item.status === "published"
                              ? "default"
                              : item.status === "draft"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {item.status}
                        </Badge>
                        {item.tags?.slice(0, 2).map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          Created by {item.creatorName}
                        </span>
                        {item.archivedAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Archived{" "}
                            {formatDistanceToNow(new Date(item.archivedAt), {
                              addSuffix: true,
                            })}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Archive className="w-3 h-3" />
                          by {item.archivedByName}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedContent(item);
                        setShowPreviewModal(true);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Preview
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => void handleUnarchive(item._id)}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      <ArchiveRestore className="w-4 h-4 mr-1" />
                      Restore
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedContent && getContentIcon(selectedContent.type)}
              {selectedContent?.title}
            </DialogTitle>
            <DialogDescription>Archived Content Preview</DialogDescription>
          </DialogHeader>

          {selectedContent && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="capitalize">
                  {selectedContent.type}
                </Badge>
                <Badge
                  variant={
                    selectedContent.status === "published"
                      ? "default"
                      : "secondary"
                  }
                >
                  {selectedContent.status}
                </Badge>
                <Badge
                  variant="outline"
                  className="border-orange-500 text-orange-600"
                >
                  <Archive className="w-3 h-3 mr-1" />
                  Archived
                </Badge>
              </div>

              {selectedContent.description && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedContent.description}
                  </p>
                </div>
              )}

              {selectedContent.body && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">Content</h4>
                  <div
                    className="prose prose-sm max-w-none p-4 bg-muted rounded-lg"
                    dangerouslySetInnerHTML={{ __html: selectedContent.body }}
                  />
                </div>
              )}

              {selectedContent.tags && selectedContent.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedContent.tags.map((tag: string, index: number) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t text-xs text-muted-foreground space-y-1">
                <p>Created by {selectedContent.creatorName}</p>
                {selectedContent.archivedAt && (
                  <p>
                    Archived by {selectedContent.archivedByName} on{" "}
                    {new Date(selectedContent.archivedAt).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => {
                    void handleUnarchive(selectedContent._id);
                    setShowPreviewModal(false);
                  }}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <ArchiveRestore className="w-4 h-4 mr-2" />
                  Restore Content
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
