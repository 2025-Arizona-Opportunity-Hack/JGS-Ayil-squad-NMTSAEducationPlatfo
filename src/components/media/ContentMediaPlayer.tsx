import { useRef, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MediaUrlState } from "@/lib/useMediaUrl";

type MediaEventHandler = React.ReactEventHandler<
  HTMLVideoElement | HTMLAudioElement
>;

type ContentMediaPlayerProps = {
  kind: "video" | "audio";
  media: MediaUrlState;
  className?: string;
  poster?: string;
  preload?: string;
  onTimeUpdate?: MediaEventHandler;
  onEnded?: MediaEventHandler;
};

/**
 * The one <video>/<audio> renderer for content media. Unlike a bare media
 * tag, it makes failures visible (the pre-existing behavior was a silent
 * black box) and transparently recovers once when a signed URL expires
 * mid-playback by re-minting and resuming from the same position.
 */
export function ContentMediaPlayer({
  kind,
  media,
  className,
  poster,
  preload = "metadata",
  onTimeUpdate,
  onEnded,
}: ContentMediaPlayerProps) {
  const [failed, setFailed] = useState(false);
  const autoRecovered = useRef(false);
  const resumeAtRef = useRef(0);

  const refreshOrFail = () => {
    void media.refresh().then((url) => {
      if (!url) setFailed(true);
    });
  };

  const handleError: MediaEventHandler = (e) => {
    if (!media.url) return;
    if (media.canRefresh && !autoRecovered.current) {
      // One silent recovery: signed URLs expire eventually; re-mint and
      // resume where playback stopped.
      autoRecovered.current = true;
      resumeAtRef.current = e.currentTarget.currentTime || 0;
      refreshOrFail();
      return;
    }
    setFailed(true);
  };

  const handleLoadedMetadata: MediaEventHandler = (e) => {
    if (resumeAtRef.current > 0) {
      e.currentTarget.currentTime = resumeAtRef.current;
      resumeAtRef.current = 0;
    }
  };

  const handleRetry = () => {
    setFailed(false);
    autoRecovered.current = false;
    if (media.canRefresh) refreshOrFail();
  };

  // State panels render inside the caller's wrapper (a black aspect-video box
  // for video, a padded card for audio) — keep text readable on both.
  const panelClass = `flex w-full h-full min-h-24 flex-col items-center justify-center gap-2 p-4 text-center text-sm ${
    kind === "video" ? "text-white/90" : "text-muted-foreground"
  }`;

  if (failed || media.status === "error") {
    return (
      <div role="alert" className={panelClass}>
        <AlertCircle className="w-6 h-6" aria-hidden="true" />
        <p>This {kind} could not be loaded.</p>
        {media.canRefresh && (
          <Button
            type="button"
            variant={kind === "video" ? "secondary" : "outline"}
            size="sm"
            onClick={handleRetry}
          >
            Try again
          </Button>
        )}
      </div>
    );
  }

  if (media.status === "loading") {
    return (
      <div role="status" className={panelClass}>
        <Loader2 className="w-6 h-6 animate-spin" aria-hidden="true" />
        <p>Loading {kind}…</p>
      </div>
    );
  }

  if (!media.url) {
    return (
      <div role="status" className={panelClass}>
        <AlertCircle className="w-6 h-6" aria-hidden="true" />
        <p>This {kind} is not available.</p>
      </div>
    );
  }

  if (kind === "audio") {
    return (
      <audio
        key={media.url}
        src={media.url}
        controls
        className={className ?? "w-full"}
        onTimeUpdate={onTimeUpdate}
        onEnded={onEnded}
        onError={handleError}
        onLoadedMetadata={handleLoadedMetadata}
      >
        Your browser does not support audio playback.
      </audio>
    );
  }

  return (
    <video
      key={media.url}
      src={media.url}
      controls
      className={className ?? "w-full h-full"}
      preload={preload}
      poster={poster}
      onTimeUpdate={onTimeUpdate}
      onEnded={onEnded}
      onError={handleError}
      onLoadedMetadata={handleLoadedMetadata}
    >
      Your browser does not support video playback.
    </video>
  );
}
