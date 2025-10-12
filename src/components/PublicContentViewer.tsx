import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Video, FileText, FileAudio, Newspaper, ExternalLink, Lock, Calendar, Tag, Eye, DollarSign } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { usePresence } from "@/hooks/usePresence";
import { Navbar } from "./Navbar";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function PublicContentViewer() {
  const { contentId } = useParams<{ contentId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [attemptedPassword, setAttemptedPassword] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  const result = useQuery(
    api.publicContent.getPublicContent,
    contentId ? { contentId: contentId as any, password: attemptedPassword } : ("skip" as any)
  );
  const pricing = useQuery(
    api.pricing.getPricing,
    contentId ? { contentId: contentId as any } : ("skip" as any)
  );
  const grantAccess = useMutation(api.content.grantAccessAfterPassword);
  const trackView = useMutation(api.analytics.trackView);
  const updateTimeSpent = useMutation(api.analytics.updateTimeSpent);
  
  const startTimeRef = useRef<number>(Date.now());
  const sessionIdRef = useRef<string>(`session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  // Debug logging
  useEffect(() => {
    if (result) {
      console.log("PublicContentViewer result:", {
        requiresAuth: result.requiresAuth,
        requiresPassword: result.requiresPassword,
        error: result.error,
        hasContent: !!result.content,
        attemptedPassword,
      });
    }
  }, [result, attemptedPassword]);

  // Check if user just logged in and needs to enter password
  useEffect(() => {
    if (result && !hasCheckedAuth) {
      setHasCheckedAuth(true);
      
      // If password is required and no password has been attempted yet
      if (result.requiresPassword && !attemptedPassword && !result.requiresAuth) {
        setShowPasswordDialog(true);
      }
    }
  }, [result, hasCheckedAuth, attemptedPassword]);

  // Check for returning from login (via URL param)
  useEffect(() => {
    const fromLogin = searchParams.get("fromLogin");
    if (fromLogin === "true" && result?.requiresPassword && !attemptedPassword) {
      setShowPasswordDialog(true);
    }
  }, [searchParams, result, attemptedPassword]);

  // Check if password was incorrect
  useEffect(() => {
    if (result?.error === "Incorrect password") {
      setError("Incorrect password. Please try again.");
      setShowPasswordDialog(true);
      setPassword(""); // Clear the password field
    }
  }, [result]);

  // Grant access when password is correct
  useEffect(() => {
    if (result?.content && attemptedPassword && contentId) {
      // Password was correct and we have content - grant permanent access
      void grantAccess({ contentId: contentId as any }).catch((err) => {
        console.error("Failed to grant access:", err);
        // Don't show error to user - they still have access via password
      });
    }
  }, [result?.content, attemptedPassword, contentId, grantAccess]);

  // Track view when content is loaded
  useEffect(() => {
    if (result?.content && contentId) {
      void trackView({
        contentId: contentId as any,
        sessionId: sessionIdRef.current,
      });
      startTimeRef.current = Date.now();
    }
  }, [result?.content, contentId, trackView]);

  // Update time spent periodically and on unmount
  useEffect(() => {
    if (!result?.content || !contentId) return;

    const sessionId = sessionIdRef.current;
    const updateInterval = setInterval(() => {
      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
      void updateTimeSpent({
        contentId: contentId as any,
        sessionId,
        timeSpent,
      });
    }, 30000); // Update every 30 seconds

    return () => {
      clearInterval(updateInterval);
      // Final update on unmount
      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
      void updateTimeSpent({
        contentId: contentId as any,
        sessionId,
        timeSpent,
      });
    };
  }, [result?.content, contentId, updateTimeSpent]);

  // Track presence for authenticated users
  usePresence({
    contentId: contentId as any,
    contentTitle: result?.content?.title || "",
  });

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

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Please enter a password");
      return;
    }
    setAttemptedPassword(password);
    setShowPasswordDialog(false);
  };

  const handleGoToLogin = () => {
    // Store content ID in sessionStorage so we can return here after login
    if (contentId) {
      sessionStorage.setItem("returnToContent", contentId);
    }
    void navigate("/");
  };

  // Show password dialog if required and user is authenticated
  if (result?.requiresPassword && !attemptedPassword && !result?.requiresAuth) {
    // User is authenticated, password is required, no error - show loading with dialog
    if (!showPasswordDialog) {
      setShowPasswordDialog(true);
    }
    
    // Return a loading state while showing the password dialog
    return (
      <>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent" />
        </div>

        {/* Password Dialog */}
        <Dialog open={showPasswordDialog} onOpenChange={(open) => {
          setShowPasswordDialog(open);
          if (!open) {
            setError(null);
            setPassword("");
            void navigate(-1);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                <DialogTitle>Password Required</DialogTitle>
              </div>
              <DialogDescription>
                This content is password protected. Enter the password to view it.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="Enter password"
                  autoFocus
                  className={error ? "border-destructive" : ""}
                />
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>
              <div className="flex gap-3">
                <Button type="submit" className="flex-1">
                  Submit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void navigate(-1)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Show auth required message (only if authentication is needed)
  if (result?.requiresAuth && !result?.error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Logo size="md" showText={false} />
            </div>
            <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              This content is private. Please log in to view it.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button onClick={handleGoToLogin}>Go to Login</Button>
            <Button variant="outline" onClick={() => void navigate(-1)}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error message if there's an error
  if (result?.error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Logo size="md" showText={false} />
            </div>
            <Eye className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <CardTitle>Content Unavailable</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {result.requiresAuth && (
              <Button onClick={handleGoToLogin}>Go to Login</Button>
            )}
            {result.requiresPassword && !attemptedPassword && (
              <Button onClick={() => setShowPasswordDialog(true)}>
                Enter Password
              </Button>
            )}
            <Button variant="outline" onClick={() => void navigate(-1)}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const content = result?.content;

  if (!content && !result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Logo size="md" showText={false} />
            </div>
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
        {/* Header */}
        <div className="border-b bg-gradient-to-r from-background to-muted/40">
          <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="hidden sm:block">
                {getTypeIcon(content.type)}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight tracking-tight break-words">
                  {content.title}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground italic mt-2">
                  By {content.authorName || "Neurological Music Therapy Services of Arizona"}
                </p>
                {content.description && (
                  <p className="text-sm sm:text-base text-muted-foreground mt-3 max-w-3xl">
                    {content.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-4 sm:mt-5 text-xs sm:text-sm">
              {content.publishedAt && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Published {formatDate(content.publishedAt)}</span>
                </div>
              )}
              <Badge variant="secondary" className="capitalize">{content.type}</Badge>
              {content.isPublic && <Badge variant="outline">Public</Badge>}
              {pricing && pricing.isActive && (
                <Badge variant="outline" className="gap-1">
                  <DollarSign className="w-3 h-3" />
                  {`$${(pricing.price / 100).toFixed(2)}`}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-10 max-w-5xl">
          {/* Media Content */}
          {content.type === "video" && (content.fileUrl || content.externalUrl) && (
            <Card className="mb-6 sm:mb-10 shadow-lg rounded-lg sm:rounded-xl overflow-hidden border">
              <CardContent className="p-0">
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  {content.fileUrl ? (
                    <video
                      src={content.fileUrl}
                      controls
                      className="w-full h-full"
                      preload="metadata"
                    >
                      Your browser does not support video playback.
                    </video>
                  ) : content.externalUrl && (
                    <iframe
                      src={content.externalUrl.includes('youtube.com') || content.externalUrl.includes('youtu.be') 
                        ? content.externalUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')
                        : content.externalUrl
                      }
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={content.title}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {content.type === "audio" && (content.fileUrl || content.externalUrl) && (
            <Card className="mb-6 sm:mb-10 shadow-sm rounded-lg sm:rounded-xl border">
              <CardContent className="p-4 sm:p-6 md:p-8">
                {content.fileUrl ? (
                  <audio src={content.fileUrl} controls className="w-full">
                    Your browser does not support audio playback.
                  </audio>
                ) : content.externalUrl && (
                  <div className="space-y-4">
                    <audio src={content.externalUrl} controls className="w-full">
                      Your browser does not support audio playback.
                    </audio>
                    <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                      <ExternalLink className="w-4 h-4" />
                      <a href={content.externalUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        Open in new tab
                      </a>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {content.type === "document" && content.fileUrl && (
            <Card className="mb-6 sm:mb-10 shadow-sm rounded-lg sm:rounded-xl border">
              <CardContent className="p-4 sm:p-6 md:p-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-primary" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-base sm:text-lg">Document File</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">Click to download or view</p>
                  </div>
                  <Button asChild className="w-full sm:w-auto">
                    <a href={content.fileUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Open Document</span>
                      <span className="sm:hidden">Open</span>
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {content.type === "article" && content.externalUrl && !content.richTextContent && (
            <Card className="mb-6 sm:mb-10 shadow-sm rounded-lg sm:rounded-xl border">
              <CardContent className="p-4 sm:p-6 md:p-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 sm:p-4 bg-primary/10 rounded-lg">
                  <ExternalLink className="w-5 h-5 text-primary flex-shrink-0" />
                  <a
                    href={content.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-medium flex-1 truncate text-sm sm:text-base"
                  >
                    {content.externalUrl}
                  </a>
                  <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                    <a href={content.externalUrl} target="_blank" rel="noopener noreferrer">
                      Visit
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rich Text Content (not for articles) */}
          {content.type !== "article" && content.richTextContent && (
            <Card className="mb-6 sm:mb-10 shadow-sm rounded-lg sm:rounded-xl border">
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="text-lg sm:text-xl font-semibold">Content</CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <div
                  className="prose prose-sm md:prose-base max-w-none break-words"
                  dangerouslySetInnerHTML={{ __html: content.richTextContent }}
                />
              </CardContent>
            </Card>
          )}

          {/* Body Content */}
          {content.body && (
            <Card className="mb-6 sm:mb-10 shadow-sm rounded-lg sm:rounded-xl border">
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="text-lg sm:text-xl font-semibold">Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <div
                  className="prose prose-sm md:prose-base max-w-none break-words"
                  dangerouslySetInnerHTML={{ __html: content.body }}
                />
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {content.tags && content.tags.length > 0 && (
            <Card className="shadow-sm rounded-lg sm:rounded-xl border">
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Tag className="w-4 h-4 sm:w-5 sm:h-5" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {content.tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="capitalize text-xs sm:text-sm">
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

