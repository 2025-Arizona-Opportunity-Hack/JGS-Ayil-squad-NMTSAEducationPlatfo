import { useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export type UploadFailureArgs = {
  step: string;
  error: unknown;
  file?: File | null;
  source?: "local" | "google_drive" | null;
  attachmentType?: string;
  httpStatus?: number;
  metadata?: Record<string, unknown>;
};

/**
 * Best-effort reporter into the `uploadLogs` table, shared by the create form
 * and the edit modal. Logging failures are swallowed by design — a broken
 * logger must never break an upload.
 */
export function useUploadFailureLogger() {
  const logUploadFailure = useMutation(api.uploadLogs.log);

  return useCallback(
    (args: UploadFailureArgs) => {
      const err = args.error;
      const errorMessage =
        err instanceof Error ? err.message : typeof err === "string" ? err : JSON.stringify(err);
      const errorName = err instanceof Error ? err.name : undefined;
      logUploadFailure({
        step: args.step,
        source: args.source ?? undefined,
        errorMessage,
        errorName,
        fileName: args.file?.name,
        fileSize: args.file?.size,
        mimeType: args.file?.type,
        attachmentType: args.attachmentType,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        httpStatus: args.httpStatus,
        metadata: args.metadata,
      }).catch(() => {});
    },
    [logUploadFailure]
  );
}
