import { action, internalAction, internalQuery } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "./externalAuth";
import {
  getEffectivePermissions,
  hasPermission,
  PERMISSIONS,
} from "./permissions";
import { internal } from "./_generated/api";

// Google Cloud Storage media backend. Convex data egress is metered (and the
// free tier's 1 GB/month is a rounding error next to video streaming), so
// content media bytes live in a PRIVATE GCS bucket and are served via V4
// signed URLs minted here — never through Convex storage or an HTTP action.
//
// Configuration (per deployment, like MEDIA_URL_SECRET):
//   GCS_BUCKET          — private bucket name (e.g. ohack-dev_lms)
//   GCS_SERVICE_ACCOUNT — inline service-account JSON (client_email +
//                         private_key); same convention as backend-ohack.dev's
//                         GOOGLE_APPLICATION_CREDENTIALS.
// When unset, everything falls back to Convex storage — the NMTSA instance
// keeps working without a bucket.
//
// The bucket is private (public-access-prevention enforced): entitlement for
// every read comes from content.getSignedMediaUrl's canonical viewer-query
// chain, exactly like signed chunked media. There is no unsigned GCS URL.

export type GcsConfig = {
  bucket: string;
  clientEmail: string;
  privateKeyPem: string;
};

export function getGcsConfig(): GcsConfig | null {
  const bucket = process.env.GCS_BUCKET;
  const raw = process.env.GCS_SERVICE_ACCOUNT;
  if (!bucket || !raw) return null;
  try {
    const parsed = JSON.parse(raw) as {
      client_email?: string;
      private_key?: string;
    };
    if (!parsed.client_email || !parsed.private_key) return null;
    return {
      bucket,
      clientEmail: parsed.client_email,
      privateKeyPem: parsed.private_key,
    };
  } catch {
    return null;
  }
}

// ─── V4 URL signing (crypto.subtle, no SDK) ─────────────────────────
// https://cloud.google.com/storage/docs/access-control/signing-urls-manually

function rfc3986Encode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

// Percent-encode every path segment but keep the `/` separators.
function encodeObjectPath(path: string): string {
  return path.split("/").map(rfc3986Encode).join("/");
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
}

async function sha256Hex(text: string): Promise<string> {
  return toHex(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
  );
}

async function importSigningKey(pem: string): Promise<CryptoKey> {
  const base64 = pem
    .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

/**
 * Mint a V4 signed URL for one object. `headers` become part of the
 * signature — the client must send them byte-for-byte (that's how the PUT
 * size cap is enforced server-side). Exported for tests; `now` is injectable
 * because the signature embeds the timestamp.
 */
export async function signGcsUrl(args: {
  config: GcsConfig;
  method: "GET" | "PUT" | "DELETE";
  objectPath: string;
  expiresSeconds: number;
  headers?: Record<string, string>;
  now?: Date;
}): Promise<string> {
  const { config, method, objectPath, expiresSeconds } = args;
  const now = args.now ?? new Date();
  // 2026-08-25T12:34:56.789Z → 20260825T123456Z
  const timestamp = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const datestamp = timestamp.slice(0, 8);
  const scope = `${datestamp}/auto/storage/goog4_request`;
  const host = "storage.googleapis.com";
  const canonicalUri = `/${config.bucket}/${encodeObjectPath(objectPath)}`;

  const headerMap = new Map<string, string>([["host", host]]);
  for (const [name, value] of Object.entries(args.headers ?? {})) {
    headerMap.set(name.toLowerCase(), value.trim());
  }
  const sortedHeaderNames = [...headerMap.keys()].sort();
  const canonicalHeaders = sortedHeaderNames
    .map((name) => `${name}:${headerMap.get(name)}\n`)
    .join("");
  const signedHeaders = sortedHeaderNames.join(";");

  const queryParams: Array<[string, string]> = [
    ["X-Goog-Algorithm", "GOOG4-RSA-SHA256"],
    ["X-Goog-Credential", `${config.clientEmail}/${scope}`],
    ["X-Goog-Date", timestamp],
    ["X-Goog-Expires", String(expiresSeconds)],
    ["X-Goog-SignedHeaders", signedHeaders],
  ];
  const canonicalQuery = queryParams
    .map(([k, val]) => [rfc3986Encode(k), rfc3986Encode(val)] as const)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, val]) => `${k}=${val}`)
    .join("&");

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = [
    "GOOG4-RSA-SHA256",
    timestamp,
    scope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const key = await importSigningKey(config.privateKeyPem);
  const signature = toHex(
    await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      new TextEncoder().encode(stringToSign)
    )
  );

  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Goog-Signature=${signature}`;
}

// ─── Upload URLs ────────────────────────────────────────────────────

// Matches only paths generateGcsUploadUrl mints (uuid segment), so
// createContent/updateContent can't be pointed at an arbitrary bucket object.
// Migration paths attached via the internal maintenance:attachGcsMedia are
// exempt from this pattern (admin-only, run from the CLI).
export const GCS_CONTENT_PATH_PATTERN =
  /^content\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[A-Za-z0-9._-]{1,200}$/;

const UPLOAD_URL_TTL_SECONDS = 15 * 60;
const MAX_GCS_UPLOAD_BYTES = 5 * 1024 * 1024 * 1024; // 5 GiB

function sanitizeFileName(fileName: string): string {
  const cleaned = fileName.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 200);
  return cleaned.replace(/^[._-]+/, "") || "file";
}

// Same CREATE_CONTENT gate as content.generateUploadUrl, reachable from the
// action runtime (actions have no ctx.db).
export const checkCreateContentPermission = internalQuery({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) return false;
    return hasPermission(
      getEffectivePermissions(profile),
      PERMISSIONS.CREATE_CONTENT
    );
  },
});

export type GcsUploadTicket = {
  uploadUrl: string;
  objectPath: string;
  requiredHeaders: Record<string, string>;
};

/**
 * Mint a signed PUT URL for a direct browser→GCS upload. Returns null when
 * GCS isn't configured so the client falls back to Convex storage. The
 * signed x-goog-content-length-range header caps the object at the declared
 * size — a client sending different headers (or more bytes) gets a 403 from
 * GCS itself.
 */
export const generateGcsUploadUrl = action({
  args: {
    fileName: v.string(),
    mimeType: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args): Promise<GcsUploadTicket | null> => {
    const allowed: boolean = await ctx.runQuery(
      internal.gcs.checkCreateContentPermission,
      {}
    );
    if (!allowed) {
      throw new ConvexError("You don't have permission to upload content");
    }

    const config = getGcsConfig();
    if (!config) return null;

    if (args.fileSize <= 0 || args.fileSize > MAX_GCS_UPLOAD_BYTES) {
      throw new ConvexError("Invalid file size");
    }

    const objectPath = `content/${crypto.randomUUID()}/${sanitizeFileName(args.fileName)}`;
    const requiredHeaders = {
      "Content-Type": args.mimeType,
      "x-goog-content-length-range": `0,${args.fileSize}`,
    };
    const uploadUrl = await signGcsUrl({
      config,
      method: "PUT",
      objectPath,
      expiresSeconds: UPLOAD_URL_TTL_SECONDS,
      headers: requiredHeaders,
    });
    return { uploadUrl, objectPath, requiredHeaders };
  },
});

// ─── Deletion ───────────────────────────────────────────────────────

// GCS never garbage-collects either — delete/replace mutations schedule this
// (mutations can't fetch) whenever a row's gcsPath reference drops. Object
// paths contain a per-upload uuid, so a path is owned by exactly one row and
// a direct delete is safe. Best-effort: a 404 means it's already gone.
export const deleteGcsObject = internalAction({
  args: { objectPath: v.string() },
  handler: async (_ctx, args) => {
    const config = getGcsConfig();
    if (!config) {
      console.error(
        "GCS not configured; cannot delete object:",
        args.objectPath
      );
      return null;
    }
    const url = await signGcsUrl({
      config,
      method: "DELETE",
      objectPath: args.objectPath,
      expiresSeconds: 300,
    });
    const res = await fetch(url, { method: "DELETE" });
    if (!res.ok && res.status !== 404) {
      console.error(
        "Failed to delete GCS object:",
        args.objectPath,
        res.status,
        await res.text()
      );
    }
    return null;
  },
});
