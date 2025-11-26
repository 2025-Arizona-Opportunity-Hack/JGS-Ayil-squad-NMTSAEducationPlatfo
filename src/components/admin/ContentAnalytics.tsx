import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  Users,
  ArrowLeft,
  Video,
  FileText,
  FileAudio,
  Newspaper,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ContentAnalytics() {
  const allAnalytics = useQuery(api.analytics.getAllContentAnalytics);
  const [selectedContentId, setSelectedContentId] = useState<Id<"content"> | null>(null);
  const contentAnalytics = useQuery(
    api.analytics.getContentAnalytics,
    selectedContentId ? { contentId: selectedContentId } : "skip"
  );

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

  if (!allAnalytics) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Calculate overall stats
  const totalViews = allAnalytics.reduce((sum, item) => sum + item.totalViews, 0);
  const totalUniqueUsers = allAnalytics.reduce((sum, item) => sum + item.uniqueUsers, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Content Analytics</h2>
        <p className="text-muted-foreground mt-2">
          Track views, engagement, and user activity across all content
        </p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Views
                </p>
                <p className="text-2xl font-bold">{totalViews}</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-full">
                <Eye className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Unique Viewers
                </p>
                <p className="text-2xl font-bold">{totalUniqueUsers}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-full">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content List */}
      <Card>
        <CardHeader>
          <CardTitle>Content Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {allAnalytics.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No analytics data available yet
            </div>
          ) : (
            <div className="space-y-3">
              {allAnalytics.map((item) => (
                <div
                  key={item.contentId}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedContentId(item.contentId)}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                      {getContentIcon(item.contentType)}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{item.contentTitle}</h4>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {item.totalViews} views
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {item.uniqueUsers} users
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {item.contentType}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Analytics Modal */}
      <Dialog open={selectedContentId !== null} onOpenChange={(open) => !open && setSelectedContentId(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedContentId(null)}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <DialogTitle>Detailed Analytics</DialogTitle>
            </div>
          </DialogHeader>

          {contentAnalytics && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Total Views</p>
                      <p className="text-2xl font-bold">{contentAnalytics.totalViews}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Unique Users</p>
                      <p className="text-2xl font-bold">{contentAnalytics.uniqueUsers}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Who Viewed */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Who Viewed This Content</CardTitle>
                </CardHeader>
                <CardContent>
                  {contentAnalytics.viewersList.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No registered users have viewed this content yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {contentAnalytics.viewersList.map((viewer) => (
                        <div
                          key={viewer.userId}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{viewer.userName}</p>
                            <p className="text-sm text-muted-foreground">
                              Last viewed: {format(new Date(viewer.lastViewed), "PPp")}
                            </p>
                          </div>
                          <div className="text-right text-sm">
                            <p className="font-medium">{viewer.viewCount} views</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
