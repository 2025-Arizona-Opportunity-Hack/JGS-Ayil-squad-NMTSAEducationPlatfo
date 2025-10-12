import { useState } from "react";
import { useQuery } from "convex/react";
import { 
  Video, 
  FileText, 
  FileAudio, 
  Newspaper, 
  Filter,
  Search,
  X,
  Folder,
  ExternalLink
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { ContentViewer } from "./ContentViewer";
import { ShareLinksManager } from "./ShareLinksManager";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export function ClientDashboard() {
  const allContent = useQuery(api.content.listContent, {});
  const contentGroups = useQuery(api.contentGroups.listContentGroups, {});
  const contentGroupItems = useQuery(api.contentGroups.listAllContentGroupItems, {});

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [contentTypeFilter, setContentTypeFilter] = useState<"all" | "video" | "article" | "document" | "audio">("all");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const getContentTypeCount = (type: "all" | "video" | "article" | "document" | "audio") => {
    if (type === "all") return allContent?.length || 0;
    return allContent?.filter(item => item.type === type).length || 0;
  };

  const allTags = Array.from(new Set(allContent?.flatMap(item => item.tags || [])));

  const filteredContent = allContent?.filter(item => {
    const matchesSearch = searchQuery
      ? item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    const matchesTags = selectedTags.length > 0
      ? selectedTags.every(tag => item.tags?.includes(tag))
      : true;

    const matchesType = contentTypeFilter !== "all"
      ? item.type === contentTypeFilter
      : true;

    const matchesGroup = selectedGroupId
      ? contentGroupItems?.some(groupItem => groupItem.contentId === item._id && groupItem.groupId === selectedGroupId)
      : true;

    return matchesSearch && matchesTags && matchesType && matchesGroup;
  }) || [];

  return (
    <div className="w-full h-full flex">
      <Tabs defaultValue="content" className="w-full flex">
        {/* Left Sidebar Navigation */}
        <div className="w-64 border-r bg-muted/30 flex-shrink-0">
          <div className="p-6 border-b">
            <h1 className="text-lg font-bold tracking-tight">My Content</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Browse and share resources
            </p>
          </div>
          
          <div className="p-4">
            <TabsList className="flex flex-col h-auto bg-transparent p-0 space-y-1">
              <TabsTrigger 
                value="content" 
                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:hover:bg-muted data-[state=inactive]:text-muted-foreground justify-start"
              >
                <Folder className="w-4 h-4" />
                Content Library
              </TabsTrigger>
              <TabsTrigger 
                value="shareLinks" 
                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:hover:bg-muted data-[state=inactive]:text-muted-foreground justify-start"
              >
                <ExternalLink className="w-4 h-4" />
                My Share Links
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto">
          <TabsContent value="content" className="m-0 h-full">
            <div className="flex gap-6 h-full p-6">
              {/* Filters Sidebar */}
              <div className="w-80 flex-shrink-0">
        <div className="sticky top-0 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              <h3 className="text-lg font-semibold">Filters</h3>
            </div>
            {(searchQuery || selectedTags.length > 0 || contentTypeFilter !== "all" || selectedGroupId) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedTags([]);
                  setContentTypeFilter("all");
                  setSelectedGroupId(null);
                }}
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          <Card>
            <CardContent className="p-4 space-y-4">
              {/* Search Bar */}
              <div className="space-y-2">
                <Label htmlFor="search" className="text-sm font-medium">Search Content</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="search"
                    type="text"
                    placeholder="Search by title or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-9"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {searchQuery && (
                  <p className="text-xs text-muted-foreground">
                    Found {filteredContent.length} result{filteredContent.length !== 1 ? "s" : ""}
                  </p>
                )}
              </div>

              <Separator />

              {/* Content Type Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Content Type</Label>
                <div className="space-y-1">
                  {[
                    { value: "all", label: "All Types", icon: null, count: allContent?.length || 0 },
                    { value: "video", label: "Video", icon: Video, count: getContentTypeCount("video") },
                    { value: "audio", label: "Audio", icon: FileAudio, count: getContentTypeCount("audio") },
                    { value: "article", label: "Article", icon: Newspaper, count: getContentTypeCount("article") },
                    { value: "document", label: "Document", icon: FileText, count: getContentTypeCount("document") },
                  ].map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setContentTypeFilter(type.value as any)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors",
                          contentTypeFilter === type.value
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          {Icon && <Icon className="w-4 h-4" />}
                          {type.label}
                        </span>
                        <Badge 
                          variant={contentTypeFilter === type.value ? "secondary" : "outline"}
                          className="ml-2"
                        >
                          {type.count}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tag Filter */}
              {allTags.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Filter by Tags</Label>
                    <div className="flex flex-wrap gap-2">
                      {allTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant={selectedTags.includes(tag) ? "default" : "outline"}
                          className="cursor-pointer hover:bg-primary/90"
                          onClick={() => {
                            if (selectedTags.includes(tag)) {
                              setSelectedTags(selectedTags.filter(t => t !== tag));
                            } else {
                              setSelectedTags([...selectedTags, tag]);
                            }
                          }}
                        >
                          {tag}
                          {selectedTags.includes(tag) && (
                            <X className="w-3 h-3 ml-1" />
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Content Group Filter */}
              {contentGroups && contentGroups.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Filter by Content Group</Label>
                    <select
                      value={selectedGroupId || "all"}
                      onChange={(e) => setSelectedGroupId(e.target.value === "all" ? null : e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="all">All Groups</option>
                      {contentGroups.map((group: any) => (
                        <option key={group._id} value={group._id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Results Summary */}
              <Separator />
              <div className="text-sm">
                <span className="text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{filteredContent.length}</span> of {allContent?.length || 0}
                </span>
                {filteredContent.length !== allContent?.length && (
                  <Badge variant="secondary" className="ml-2">
                    Filtered
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

              {/* Main Content Area */}
              <div className="flex-1 min-w-0 space-y-6">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">Your Content Library</h3>
                  <p className="text-sm text-muted-foreground">Access your personalized neurologic music therapy resources</p>
                </div>

                {/* Content Display */}
                <ContentViewer content={filteredContent} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="shareLinks" className="m-0 p-6 h-full">
            <ShareLinksManager />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
