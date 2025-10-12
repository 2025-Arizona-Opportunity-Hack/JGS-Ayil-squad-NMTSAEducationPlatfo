import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Video, FileText, FileAudio, Newspaper, Folder, Plus, X, Search } from "lucide-react";
import { api } from "../../convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";

interface ContentGroupContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
}

export function ContentGroupContentModal({ 
  isOpen, 
  onClose, 
  groupId, 
  groupName 
}: ContentGroupContentModalProps) {
  const [showAddContent, setShowAddContent] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const groupWithItems = useQuery(api.contentGroups.getContentGroupWithItems, 
    { groupId: groupId as any }
  );
  const availableContent = useQuery(api.contentGroups.getAvailableContent, 
    { groupId: groupId as any }
  );
  
  const addContentToGroup = useMutation(api.contentGroups.addContentToGroup);
  const removeContentFromGroup = useMutation(api.contentGroups.removeContentFromGroup);

  const handleAddContent = async (contentId: string) => {
    try {
      await addContentToGroup({
        groupId: groupId as any,
        contentId: contentId as any,
      });
      setShowAddContent(false);
      setSearchTerm("");
    } catch (error) {
      console.error("Error adding content to group:", error);
    }
  };

  const handleRemoveContent = async (groupItemId: string) => {
    try {
      await removeContentFromGroup({
        groupItemId: groupItemId as any,
      });
    } catch (error) {
      console.error("Error removing content from group:", error);
    }
  };

  const getTypeIcon = (type: string) => {
    const iconProps = { className: "w-5 h-5" };
    switch (type) {
      case "video": return <Video {...iconProps} />;
      case "article": return <Newspaper {...iconProps} />;
      case "document": return <FileText {...iconProps} />;
      case "audio": return <FileAudio {...iconProps} />;
      default: return <Folder {...iconProps} />;
    }
  };

  const filteredAvailableContent = availableContent?.filter(content => {
    const searchLower = searchTerm.toLowerCase();
    return (
      content.title.toLowerCase().includes(searchLower) ||
      content.description?.toLowerCase().includes(searchLower) ||
      content.tags?.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }) || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Content: {groupName}</DialogTitle>
          <DialogDescription>
            Add or remove content from this group
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Content in Group */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-medium">
                Content in Group ({groupWithItems?.items?.length || 0})
              </h4>
              <Button
                onClick={() => setShowAddContent(!showAddContent)}
                size="sm"
                variant={showAddContent ? "outline" : "default"}
              >
                {showAddContent ? (
                  <>
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Content
                  </>
                )}
              </Button>
            </div>

            {groupWithItems?.items && groupWithItems.items.length > 0 ? (
              <div className="space-y-2">
                {groupWithItems.items.map((item) => (
                  <Card key={item._id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="text-muted-foreground">
                          {getTypeIcon(item.type)}
                        </div>
                        <div className="flex-1">
                          <h5 className="font-medium">{item.title}</h5>
                          {item.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge variant="outline" className="capitalize">
                              {item.type}
                            </Badge>
                            <Badge variant={item.isPublic ? "default" : "secondary"}>
                              {item.isPublic ? "Public" : "Private"}
                            </Badge>
                            {item.tags && item.tags.length > 0 && (
                              <>
                                {item.tags.slice(0, 2).map((tag, index) => (
                                  <Badge key={index} variant="outline">
                                    {tag}
                                  </Badge>
                                ))}
                                {item.tags.length > 2 && (
                                  <span className="text-xs text-muted-foreground">
                                    +{item.tags.length - 2}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { void handleRemoveContent(item.groupItemId); }}
                        className="text-destructive hover:text-destructive"
                      >
                        Remove
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Folder className="w-12 h-12 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No content in this group yet</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Add Content Section */}
          {showAddContent && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-3">Add Content to Group</h4>
                
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search available content..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2">
                  {filteredAvailableContent.length > 0 ? (
                    filteredAvailableContent.map((content) => (
                      <Card key={content._id} className="hover:bg-accent/50 transition-colors">
                        <CardContent className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="text-muted-foreground">
                              {getTypeIcon(content.type)}
                            </div>
                            <div className="flex-1">
                              <h5 className="font-medium">{content.title}</h5>
                              {content.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {content.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="capitalize">
                                  {content.type}
                                </Badge>
                                <Badge variant={content.isPublic ? "default" : "secondary"}>
                                  {content.isPublic ? "Public" : "Private"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { void handleAddContent(content._id); }}
                          >
                            Add
                          </Button>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <Search className="w-12 h-12 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">
                          {searchTerm 
                            ? "No content found matching your search" 
                            : "No available content to add"
                          }
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <Separator />
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
