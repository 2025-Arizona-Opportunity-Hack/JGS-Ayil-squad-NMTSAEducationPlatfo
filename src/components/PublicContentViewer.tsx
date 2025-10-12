import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Video, FileText, FileAudio, Newspaper, ExternalLink, Lock, User, Calendar, Tag, Eye } from "lucide-react";
import { api } from "../../convex/_generated/api";
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
  const grantAccess = useMutation(api.content.grantAccessAfterPassword);

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
      <div className="min-h-screen bg-background">
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

