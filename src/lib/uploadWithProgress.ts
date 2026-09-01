// XHR-based storage upload with real progress events (fetch has no upload
// progress) and bounded retries. Convex upload URLs are single-use-ish and
// short-lived, so every attempt asks for a fresh one via `getUploadUrl`.

const RETRY_DELAYS_MS = [1_000, 3_000];

export class UploadHttpError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(`Upload failed with HTTP ${status}: ${body}`);
    this.name = "UploadHttpError";
    this.status = status;
    this.body = body;
  }
}

/**
 * POST a blob to a Convex storage upload URL, reporting upload progress and
 * retrying (with a fresh upload URL) on network errors and 5xx responses.
 * Resolves with the new storageId.
 */
export async function uploadBlobWithProgress(args: {
  getUploadUrl: () => Promise<string>;
  blob: Blob;
  contentType: string;
  /** Called with bytes-sent-so-far for the current attempt (resets on retry). */
  onProgress?: (loadedBytes: number) => void;
  attempts?: number;
}): Promise<string> {
  const { getUploadUrl, blob, contentType, onProgress, attempts = 3 } = args;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) {
      const delay =
        RETRY_DELAYS_MS[Math.min(attempt - 1, RETRY_DELAYS_MS.length - 1)];
      await new Promise((resolve) => setTimeout(resolve, delay));
      onProgress?.(0);
    }
    try {
      const uploadUrl = await getUploadUrl();
      return await xhrPost(uploadUrl, blob, contentType, onProgress);
    } catch (error) {
      lastError = error;
      // 4xx responses won't get better on retry; network errors and 5xx might.
      const retryable =
        !(error instanceof UploadHttpError) || error.status >= 500;
      if (!retryable) throw error;
    }
  }
  throw lastError;
}

export type SignedUploadTicket = {
  uploadUrl: string;
  requiredHeaders: Record<string, string>;
};

/**
 * PUT a blob to a pre-signed upload URL (GCS), sending the ticket's
 * required headers verbatim — they're part of the URL's signature, so any
 * deviation is a 403. Retries mint a fresh ticket via `getTicket` (signed
 * URLs are time-limited). Resolves with the ticket actually used, since each
 * ticket carries its own object path.
 */
export async function uploadBlobToSignedUrl<T extends SignedUploadTicket>(args: {
  getTicket: () => Promise<T>;
  blob: Blob;
  /** Called with bytes-sent-so-far for the current attempt (resets on retry). */
  onProgress?: (loadedBytes: number) => void;
  attempts?: number;
}): Promise<T> {
  const { getTicket, blob, onProgress, attempts = 3 } = args;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) {
      const delay =
        RETRY_DELAYS_MS[Math.min(attempt - 1, RETRY_DELAYS_MS.length - 1)];
      await new Promise((resolve) => setTimeout(resolve, delay));
      onProgress?.(0);
    }
    try {
      const ticket = await getTicket();
      await xhrPut(ticket.uploadUrl, blob, ticket.requiredHeaders, onProgress);
      return ticket;
    } catch (error) {
      lastError = error;
      const retryable =
        !(error instanceof UploadHttpError) || error.status >= 500;
      if (!retryable) throw error;
    }
  }
  throw lastError;
}

function xhrPut(
  url: string,
  blob: Blob,
  headers: Record<string, string>,
  onProgress?: (loadedBytes: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [name, value] of Object.entries(headers)) {
      xhr.setRequestHeader(name, value);
    }
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(e.loaded);
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new UploadHttpError(xhr.status, xhr.responseText));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new Error("Upload aborted"));
    xhr.ontimeout = () => reject(new Error("Upload timed out"));
    xhr.send(blob);
  });
}

function xhrPost(
  url: string,
  blob: Blob,
  contentType: string,
  onProgress?: (loadedBytes: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Content-Type", contentType);
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(e.loaded);
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText) as { storageId?: string };
          if (json.storageId) {
            resolve(json.storageId);
          } else {
            reject(new Error("Upload response is missing storageId"));
          }
        } catch {
          reject(new Error("Upload response was not valid JSON"));
        }
      } else {
        reject(new UploadHttpError(xhr.status, xhr.responseText));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new Error("Upload aborted"));
    xhr.ontimeout = () => reject(new Error("Upload timed out"));
    xhr.send(blob);
  });
}
