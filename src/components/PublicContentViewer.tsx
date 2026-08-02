import { useState, useEffect, useRef } from "react";
import { sanitizeHtml } from "@/lib/sanitize";
import { useQuery, useMutation } from "convex/react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Video, FileText, FileAudio, Newspaper, ExternalLink, Lock, Calendar, Tag, Eye, DollarSign, CheckCircle2 } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Navbar } from "./Navbar";
import { Logo } from "./Logo";
import { PurchasePaywall } from "./PurchasePaywall";
import { RecommendButton } from "./RecommendButton";
import { QuizPanel } from "./quiz/QuizPanel";
import { usePageMeta } from "@/lib/usePageMeta";
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
  // Viewer's profile — used to surface the "Recommend" action for professionals
  // (RECOMMEND_CONTENT). Returns null for anonymous viewers, hiding the button.
  const userProfile = useQuery(api.users.getCurrentUserProfile);
  const grantAccess = useMutation(api.content.grantAccessAfterPassword);
  const trackView = useMutation(api.analytics.trackView);
  const sessionIdRef = useRef<string>(`session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  // Watch-progress tracking (feeds quiz completion gating). Only recorded
  // for signed-in users with a profile; anonymous playback is untracked.
  const recordProgress = useMutation(api.progress.recordProgress);
  const markCompleted = useMutation(api.progress.markContentCompleted);
  const myProgress = useQuery(
    api.progress.getMyProgressForContents,
    userProfile && contentId
      ? { contentIds: [contentId as any] }
      : ("skip" as any)
  );
  const lastReportedProgressRef = useRef(0);
  const isSignedIn = !!userProfile;

  // Human-facing title/description (unfurl bots get api/meta.ts instead)
  const previewMeta =
    result && "preview" in result ? (result.preview as any) : null;
  usePageMeta({
    title: result?.content?.title ?? previewMeta?.title ?? null,
    description:
      result?.content?.description ?? previewMeta?.description ?? null,
  });
  const isMarkedWatched = !!(contentId && myProgress?.[contentId]?.completed);

  const handleMediaTimeUpdate = (
    e: React.SyntheticEvent<HTMLVideoElement | HTMLAudioElement>
  ) => {
    if (!isSignedIn || !contentId) return;
    const el = e.currentTarget;
    if (!el.duration || !isFinite(el.duration)) return;
    const fraction = el.currentTime / el.duration;
    // Report on ~10% steps and when crossing the 90% completion threshold,
    // rather than on every timeupdate tick (~4/sec).
    const last = lastReportedProgressRef.current;
    if (fraction - last >= 0.1 || (fraction >= 0.9 && last < 0.9)) {
      lastReportedProgressRef.current = fraction;
      void recordProgress({
        contentId: contentId as any,
        progress: fraction,
      }).catch(() => {});
    }
  };

  const handleMediaEnded = () => {
    if (!isSignedIn || !contentId) return;
    lastReportedProgressRef.current = 1;
    void recordProgress({ contentId: contentId as any, progress: 1 }).catch(
      () => {}
    );
  };

  const handleMarkWatched = () => {
    if (!isSignedIn || !contentId) return;
    void markCompleted({ contentId: contentId as any }).catch(() => {});
  };

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

  // Grant access when password is correct. The server (grantAccessAfterPassword)
  // re-verifies the password itself — it's the authority here, not this
  // client-side "we already got content back" check, which is just a signal
  // for when to bother asking.
  useEffect(() => {
    if (result?.content && attemptedPassword && contentId) {
      const verifiedPassword = attemptedPassword;
      // Password was correct (per the server, via getPublicContent) and we
      // have content - grant permanent access so future visits skip the
      // password prompt.
      void grantAccess({ contentId: contentId as any, password: verifiedPassword }).catch((err) => {
        console.error("Failed to grant access:", err);
        // Don't show a hard error here — the viewer can already see the
        // content this visit via the password they entered; only the
        // permanent-access grant (for future visits) failed.
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
    }
  }, [result?.content, contentId, trackView]);

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

  // Paywall: priced content the viewer isn't entitled to. Checked before the
  // auth wall so anonymous visitors see the purchase page (with a login CTA)
  // rather than a dead-end "Authentication Required".
  if (result && "requiresPurchase" in result && result.requiresPurchase && contentId) {
    return (
      <PurchasePaywall
        contentId={contentId}
        preview={result.preview}
        pricing={result.pricing}
        requiresAuth={!!result.requiresAuth}
        onGoToLogin={handleGoToLogin}
      />
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
                  By {content.authorName || content.creatorName || "Unknown"}
                </p>
                {content.description && (
                  <div className="text-sm sm:text-base text-muted-foreground mt-3 max-w-3xl" dangerouslySetInnerHTML={{ __html: sanitizeHtml(content.description) }} />
                )}
              </div>
              <RecommendButton
                permissions={userProfile?.effectivePermissions}
                contentId={contentId ?? ""}
                title={content.title}
                className="shrink-0"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-4 sm:mt-5 text-xs sm:text-sm">
              {content.publishedAt && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Published {formatDate(content.publishedAt)}</span>
                </div>
              )}
              {content.type && <Badge variant="secondary" className="capitalize">{content.type}</Badge>}
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
                      onTimeUpdate={handleMediaTimeUpdate}
                      onEnded={handleMediaEnded}
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
                {/* Embedded players can't emit playback events, so completion
                    is a manual acknowledgement for external videos. */}
                {isSignedIn && !content.fileUrl && content.externalUrl && (
                  <div className="p-3 sm:p-4 border-t">
                    {isMarkedWatched ? (
                      <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                        <CheckCircle2 className="w-4 h-4 text-green-600" aria-hidden="true" />
                        Marked as watched
                      </p>
                    ) : (
                      <Button type="button" variant="outline" size="sm" onClick={handleMarkWatched}>
                        <CheckCircle2 className="w-4 h-4 mr-2" aria-hidden="true" />
                        Mark as watched
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {content.type === "audio" && (content.fileUrl || content.externalUrl) && (
            <Card className="mb-6 sm:mb-10 shadow-sm rounded-lg sm:rounded-xl border">
              <CardContent className="p-4 sm:p-6 md:p-8">
                {content.fileUrl ? (
                  <audio
                    src={content.fileUrl}
                    controls
                    className="w-full"
                    onTimeUpdate={handleMediaTimeUpdate}
                    onEnded={handleMediaEnded}
                  >
                    Your browser does not support audio playback.
                  </audio>
                ) : content.externalUrl && (
                  <div className="space-y-4">
                    <audio
                      src={content.externalUrl}
                      controls
                      className="w-full"
                      onTimeUpdate={handleMediaTimeUpdate}
                      onEnded={handleMediaEnded}
                    >
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
                {/* Documents have no playback events; completion is manual. */}
                {isSignedIn && (
                  <div className="mt-4 pt-4 border-t">
                    {isMarkedWatched ? (
                      <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                        <CheckCircle2 className="w-4 h-4 text-green-600" aria-hidden="true" />
                        Marked as read
                      </p>
                    ) : (
                      <Button type="button" variant="outline" size="sm" onClick={handleMarkWatched}>
                        <CheckCircle2 className="w-4 h-4 mr-2" aria-hidden="true" />
                        Mark as read
                      </Button>
                    )}
                  </div>
                )}
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

          {/* Quiz (renders nothing when no quiz exists for this content
              or the viewer isn't signed in / entitled) */}
          {isSignedIn && contentId && (
            <QuizPanel contentId={contentId as any} />
          )}

          {/* Description Content */}
          {content.description && (
            <Card className="mb-6 sm:mb-10 shadow-sm rounded-lg sm:rounded-xl border">
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="text-lg sm:text-xl font-semibold">Description</CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <div
                  className="prose prose-sm md:prose-base max-w-none break-words"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(content.description) }}
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
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(content.body) }}
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

