import { uploadBlobWithProgress } from "./uploadWithProgress";

// Files larger than the threshold go through the chunked-upload path so we
// don't blow past Convex's 2-minute single-POST window — 50 MB clears it even
// on a ~4 Mbps residential uplink. Below it, the single-POST flow is faster
// and the file is served directly from storage instead of /api/serve-chunked.
export const CHUNKED_UPLOAD_THRESHOLD_BYTES = 50 * 1024 * 1024; // 50 MB
export const CHUNK_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB per chunk — retry and progress granularity

export type ContentUploadResult =
  | { kind: "single"; storageId: string }
  | { kind: "chunked"; chunks: Array<{ storageId: string; size: number }> };

/** Carries where an upload died so callers can report it to uploadLogs. */
export class ContentUploadError extends Error {
  cause: unknown;
  info: {
    chunked: boolean;
    chunkIndex?: number;
    totalChunks?: number;
    uploadedBytes: number;
    totalBytes: number;
  };

  constructor(cause: unknown, info: ContentUploadError["info"]) {
    super(cause instanceof Error ? cause.message : "Upload failed");
    this.name = "ContentUploadError";
    this.cause = cause;
    this.info = info;
  }
}

/**
 * Upload a content file to Convex storage, choosing single-POST or the
 * chunked path by size. The one upload pipeline for both the create form
 * (ContentManager) and the edit modal — each chunk retries independently via
 * uploadBlobWithProgress, and progress is reported in absolute bytes across
 * the whole file.
 */
export async function uploadContentFile(args: {
  file: File;
  contentType: string;
  getUploadUrl: () => Promise<string>;
  onProgress?: (uploadedBytes: number, totalBytes: number) => void;
}): Promise<ContentUploadResult> {
  const { file, contentType, getUploadUrl, onProgress } = args;
  const totalBytes = file.size;

  if (totalBytes <= CHUNKED_UPLOAD_THRESHOLD_BYTES) {
    try {
      const storageId = await uploadBlobWithProgress({
        getUploadUrl,
        blob: file,
        contentType,
        onProgress: (loadedBytes) => onProgress?.(loadedBytes, totalBytes),
      });
      return { kind: "single", storageId };
    } catch (error) {
      throw new ContentUploadError(error, {
        chunked: false,
        uploadedBytes: 0,
        totalBytes,
      });
    }
  }

  const totalChunks = Math.ceil(totalBytes / CHUNK_SIZE_BYTES);
  const chunks: Array<{ storageId: string; size: number }> = [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE_BYTES;
    const end = Math.min(start + CHUNK_SIZE_BYTES, totalBytes);
    try {
      const storageId = await uploadBlobWithProgress({
        getUploadUrl,
        blob: file.slice(start, end),
        contentType,
        onProgress: (loadedBytes) => onProgress?.(start + loadedBytes, totalBytes),
      });
      chunks.push({ storageId, size: end - start });
    } catch (error) {
      throw new ContentUploadError(error, {
        chunked: true,
        chunkIndex: i,
        totalChunks,
        uploadedBytes: start,
        totalBytes,
      });
    }
  }

  return { kind: "chunked", chunks };
}
