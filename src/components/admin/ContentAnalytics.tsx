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
  Clock,
  TrendingUp,
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

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
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
  const avgTimeAcrossAll =
    allAnalytics.length > 0
      ? Math.round(
          allAnalytics.reduce((sum, item) => sum + item.averageTimeSpent, 0) /
            allAnalytics.length
        )
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Content Analytics</h2>
        <p className="text-muted-foreground mt-2">
          Track views, engagement, and user activity across all content
        </p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Avg. Time Spent
                </p>
                <p className="text-2xl font-bold">{formatTime(avgTimeAcrossAll)}</p>
              </div>
              <div className="bg-purple-50 p-3 rounded-full">
                <Clock className="w-6 h-6 text-purple-600" />
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
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatTime(item.averageTimeSpent)} avg
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                      <p className="text-xs text-muted-foreground">Unique Sessions</p>
                      <p className="text-2xl font-bold">{contentAnalytics.uniqueSessions}</p>
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
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Avg. Time</p>
                      <p className="text-2xl font-bold">
                        {formatTime(contentAnalytics.averageTimeSpent)}
                      </p>
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
                            <p className="text-muted-foreground">
                              {formatTime(viewer.totalTimeSpent)} total
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Recent Activity (Last 30 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Views in last 30 days:</span>
                      <span className="font-semibold">{contentAnalytics.recentViews}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
