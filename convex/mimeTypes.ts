// Pure MIME helpers shared by the Convex backend and the frontend
// (src/lib/mediaMime.ts). Keep this module dependency-free so both sides can
// import it directly.

// Non-standard MIME types some browsers/OSes report for files whose bytes are
// a standard container. Chromium's demuxer selects by Content-Type, so it
// refuses video/x-m4v while playing the identical bytes as video/mp4 —
// normalize to the canonical type everywhere (upload and serve).
const MIME_ALIASES: Record<string, string> = {
  "video/x-m4v": "video/mp4",
  "video/m4v": "video/mp4",
  "audio/x-m4a": "audio/mp4",
  "audio/m4a": "audio/mp4",
};

const EXTENSION_MIME: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  ogv: "video/ogg",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
  aac: "audio/aac",
  flac: "audio/flac",
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

/**
 * Map known non-standard MIME aliases to their canonical type.
 * Returns undefined for empty/missing input; passes unknown types through.
 */
export function normalizeMimeType(
  mime: string | null | undefined
): string | undefined {
  if (!mime) return undefined;
  const lower = mime.toLowerCase();
  return MIME_ALIASES[lower] ?? lower;
}

/**
 * Best-effort MIME type from a file extension, for files where the OS
 * reports an empty type (common for .m4v on Windows/Linux).
 */
export function inferMimeFromFileName(
  fileName: string | null | undefined
): string | undefined {
  if (!fileName) return undefined;
  const dot = fileName.lastIndexOf(".");
  if (dot < 0 || dot === fileName.length - 1) return undefined;
  return EXTENSION_MIME[fileName.slice(dot + 1).toLowerCase()];
}
