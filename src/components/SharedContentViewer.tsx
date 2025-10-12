import { useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useParams, useNavigate } from "react-router-dom";
import { Video, FileText, FileAudio, Newspaper, ExternalLink, User, Calendar, Tag, Eye, AlertCircle } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Navbar } from "./Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function SharedContentViewer() {
  const { accessToken } = useParams<{ accessToken: string }>();
  const navigate = useNavigate();

  const result = useQuery(
    api.contentShares.getContentByShareToken,
    accessToken ? { accessToken } : ("skip" as any)
  );
  const trackView = useMutation(api.contentShares.trackShareView);

  // Track view when content loads
  useEffect(() => {
    if (result?.content && accessToken) {
      void trackView({ accessToken }).catch(console.error);
    }
  }, [result?.content, accessToken, trackView]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="w-6 h-6 text-primary" />;
      case "article":
        return <Newspaper className="w-6 h-6 text-primary" />;
      case "document":
        return <FileText className="w-6 h-6 text-primary" />;
      case "audio":
        return <FileAudio className="w-6 h-6 text-primary" />;
      default:
        return <FileText className="w-6 h-6 text-primary" />;
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return null;
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Loading state
  if (!result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Error state
  if (result.error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <CardTitle>{result.expired ? "Link Expired" : "Content Unavailable"}</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button className="w-full" onClick={() => void navigate(-1)}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const content = result.content;
  const shareInfo = result.shareInfo;

  if (!content) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Eye className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <CardTitle>Content Not Found</CardTitle>
            <CardDescription>
              The content you're looking for doesn't exist or is no longer available.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => void navigate(-1)}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background">
        {/* Share Info Banner */}
        {shareInfo && (
        <div className="bg-primary/10 border-b border-primary/20">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>Shared by {shareInfo.sharedBy}</span>
              </div>
              {shareInfo.expiresAt && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Expires {formatDate(shareInfo.expiresAt)}</span>
                </div>
              )}
            </div>
            {shareInfo.message && (
              <p className="text-sm mt-2 italic">&ldquo;{shareInfo.message}&rdquo;</p>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            {getTypeIcon(content.type)}
            <div className="flex-1">
              <h1 className="text-3xl font-bold">{content.title}</h1>
              {content.description && (
                <p className="text-muted-foreground mt-2">{content.description}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
            {content.creatorName && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <User className="w-4 h-4" />
                <span>{content.creatorName}</span>
              </div>
            )}
            {content.publishedAt && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Published {formatDate(content.publishedAt)}</span>
              </div>
            )}
            <Badge variant="secondary">{content.type}</Badge>
            {content.isPublic && <Badge variant="outline">Public</Badge>}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Media Content */}
        {content.type === "video" && content.fileUrl && (
          <Card className="mb-8">
            <CardContent className="p-0">
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  src={content.fileUrl}
                  controls
                  className="w-full h-full"
                  preload="metadata"
                >
                  Your browser does not support video playback.
                </video>
              </div>
            </CardContent>
          </Card>
        )}

        {content.type === "audio" && content.fileUrl && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <audio src={content.fileUrl} controls className="w-full">
                Your browser does not support audio playback.
              </audio>
            </CardContent>
          </Card>
        )}

        {content.type === "document" && content.fileUrl && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <FileText className="w-16 h-16 text-primary" />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Document File</h3>
                  <p className="text-sm text-muted-foreground">Click to download or view</p>
                </div>
                <Button asChild>
                  <a href={content.fileUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Document
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {content.type === "article" && content.externalUrl && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 p-4 bg-primary/10 rounded-lg">
                <ExternalLink className="w-5 h-5 text-primary" />
                <a
                  href={content.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium flex-1"
                >
                  {content.externalUrl}
                </a>
                <Button asChild variant="outline" size="sm">
                  <a href={content.externalUrl} target="_blank" rel="noopener noreferrer">
                    Visit
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rich Text Content */}
        {content.richTextContent && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: content.richTextContent }}
              />
            </CardContent>
          </Card>
        )}

        {/* Body Content */}
        {content.body && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: content.body }}
              />
            </CardContent>
          </Card>
        )}

        {/* Tags */}
        {content.tags && content.tags.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {content.tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      </div>
    </>
  );
}

