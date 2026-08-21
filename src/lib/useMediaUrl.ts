import { useCallback, useEffect, useRef, useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

export type MediaUrlState = {
  url: string | null;
  status: "ready" | "loading" | "error" | "empty";
  /** True when a fresh URL can be minted (signed chunked media). */
  canRefresh: boolean;
  /** Re-mint the signed URL (e.g. after it expires mid-playback). */
  refresh: () => Promise<string | null>;
};

/**
 * Resolve the playable URL for a content row.
 *
 * Queries return a direct `fileUrl` when one exists, or
 * `requiresSignedUrl: true` for chunked media that /api/serve-chunked will
 * only serve with a valid HMAC signature. In that case this hook mints a
 * short-lived signed URL via `content.getSignedMediaUrl`, passing along the
 * viewer's password or share token so the same server-side gates apply.
 */
export function useMediaUrl(args: {
  contentId: string | undefined;
  fileUrl: string | null | undefined;
  requiresSignedUrl: boolean | undefined;
  password?: string;
  shareToken?: string;
}): MediaUrlState {
  const { contentId, fileUrl, requiresSignedUrl, password, shareToken } = args;
  const getSignedMediaUrl = useAction(api.content.getSignedMediaUrl);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  // Ignore out-of-order resolutions when args change mid-flight.
  const requestSeq = useRef(0);

  const mint = useCallback(async (): Promise<string | null> => {
    if (!contentId || !requiresSignedUrl) return null;
    const seq = ++requestSeq.current;
    try {
      const url = await getSignedMediaUrl({
        contentId: contentId as never,
        password,
        shareToken,
      });
      if (requestSeq.current === seq) {
        setSignedUrl(url);
        setFailed(false);
      }
      return url;
    } catch (error) {
      console.error("Failed to mint signed media URL:", error);
      if (requestSeq.current === seq) setFailed(true);
      return null;
    }
  }, [contentId, requiresSignedUrl, password, shareToken, getSignedMediaUrl]);

  useEffect(() => {
    setSignedUrl(null);
    setFailed(false);
    if (contentId && requiresSignedUrl) void mint();
  }, [mint, contentId, requiresSignedUrl]);

  if (!requiresSignedUrl) {
    return {
      url: fileUrl ?? null,
      status: fileUrl ? "ready" : "empty",
      canRefresh: false,
      refresh: async () => fileUrl ?? null,
    };
  }

  return {
    url: signedUrl,
    status: signedUrl ? "ready" : failed ? "error" : "loading",
    canRefresh: true,
    refresh: mint,
  };
}
