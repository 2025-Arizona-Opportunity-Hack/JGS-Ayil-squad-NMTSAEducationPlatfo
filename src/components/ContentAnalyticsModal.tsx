import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Users, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ContentAnalyticsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId: Id<"content">;
  contentTitle: string;
}

export function ContentAnalyticsModal({
  open,
  onOpenChange,
  contentId,
  contentTitle,
}: ContentAnalyticsModalProps) {
  const analytics = useQuery(
    api.analytics.getContentAnalytics,
    open ? { contentId } : "skip"
  );

  if (!analytics) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Content Analytics</DialogTitle>
            <DialogDescription>Loading analytics data...</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Who Viewed This Content
          </DialogTitle>
          <DialogDescription>{contentTitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Total Views
                    </p>
                    <p className="text-2xl font-bold">{analytics.totalViews}</p>
                  </div>
                  <div className="bg-blue-50 p-2 rounded-full">
                    <Eye className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Unique Users
                    </p>
                    <p className="text-2xl font-bold">{analytics.uniqueUsers}</p>
                  </div>
                  <div className="bg-purple-50 p-2 rounded-full">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Viewers List */}
          {analytics.viewersList && analytics.viewersList.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Viewers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.viewersList.slice(0, 10).map((viewer: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {viewer.userName.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{viewer.userName}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Eye className="w-3 h-3" />
                            {viewer.viewCount} view{viewer.viewCount !== 1 ? 's' : ''}
                            {viewer.lastViewed && (
                              <>
                                {' • '}
                                <Calendar className="w-3 h-3" />
                                {formatDistanceToNow(new Date(viewer.lastViewed), { addSuffix: true })}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {analytics.viewersList.length > 10 && (
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    Showing 10 of {analytics.viewersList.length} viewers
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* No Views State */}
          {analytics.totalViews === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Eye className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Views Yet</h3>
                <p className="text-sm text-muted-foreground">
                  This content hasn't been viewed yet. Share it to start tracking analytics.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
