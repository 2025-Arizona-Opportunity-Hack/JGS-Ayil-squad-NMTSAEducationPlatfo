import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Users, Video, FileText, FileAudio, Newspaper } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function LiveViewers() {
  const activeViewers = useQuery(api.presence.getActiveViewers);

  const getContentIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="w-4 h-4" />;
      case "audio":
        return <FileAudio className="w-4 h-4" />;
      case "article":
        return <Newspaper className="w-4 h-4" />;
      case "document":
        return <FileText className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  if (!activeViewers) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Group viewers by content
  const viewersByContent = activeViewers.reduce((acc, viewer) => {
    if (!acc[viewer.contentId]) {
      acc[viewer.contentId] = {
        contentTitle: viewer.contentTitle,
        viewers: [],
      };
    }
    acc[viewer.contentId].viewers.push(viewer);
    return acc;
  }, {} as Record<string, { contentTitle: string; viewers: typeof activeViewers }>);

  const totalViewers = activeViewers.length;
  const uniqueContent = Object.keys(viewersByContent).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Live Viewers</h2>
        <p className="text-muted-foreground mt-2">
          See who is currently viewing content in real-time
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Active Viewers
                </p>
                <p className="text-2xl font-bold">{totalViewers}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-full">
                <Eye className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Content Being Viewed
                </p>
                <p className="text-2xl font-bold">{uniqueContent}</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-full">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Viewers by Content */}
      {totalViewers === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Eye className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Active Viewers</h3>
            <p className="text-sm text-muted-foreground">
              When users view content, they'll appear here in real-time
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(viewersByContent).map(([contentId, data]) => (
            <Card key={contentId}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Eye className="w-5 h-5 text-green-600" />
                    {data.contentTitle}
                  </CardTitle>
                  <Badge variant="secondary">
                    {data.viewers.length} viewer{data.viewers.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.viewers.map((viewer) => (
                    <div
                      key={viewer._id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <div>
                          <p className="font-medium">{viewer.userName}</p>
                          <p className="text-xs text-muted-foreground">
                            Active {formatDistanceToNow(new Date(viewer.lastHeartbeat), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Live
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
