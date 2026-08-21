import {
  inferMimeFromFileName,
  normalizeMimeType,
} from "../../convex/mimeTypes";

export type AttachmentKind = "video" | "audio" | "image" | "pdf";

/**
 * The MIME type to trust for a selected file: the browser-reported type
 * (normalized, e.g. video/x-m4v → video/mp4), falling back to the file
 * extension when the OS reports no type at all.
 */
export function getEffectiveFileType(file: {
  name: string;
  type: string;
}): string {
  return normalizeMimeType(file.type) ?? inferMimeFromFileName(file.name) ?? "";
}

export function matchesAttachmentType(
  mime: string,
  attachmentType: AttachmentKind
): boolean {
  switch (attachmentType) {
    case "video":
      return mime.startsWith("video/");
    case "audio":
      return mime.startsWith("audio/");
    case "image":
      return mime.startsWith("image/");
    case "pdf":
      return mime.includes("pdf");
  }
}
