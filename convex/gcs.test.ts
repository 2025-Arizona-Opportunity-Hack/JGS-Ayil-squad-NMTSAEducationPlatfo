/// <reference types="vite/client" />
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import {
  getGcsConfig,
  signGcsUrl,
  GCS_CONTENT_PATH_PATTERN,
  type GcsConfig,
} from "./gcs";

const modules = import.meta.glob("./**/*.ts");

// GCS media backend contract: content bytes in the private bucket are served
// ONLY via V4 signed URLs minted by getSignedMediaUrl's entitlement chain —
// queries never return an unsigned URL for gcsPath content, uploads are
// permission-gated, and rows can't be pointed at arbitrary bucket objects.

// ─── key + config fixtures ──────────────────────────────────────────

async function makeKeyPair() {
  return (await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"]
  )) as CryptoKeyPair;
}

async function toPem(privateKey: CryptoKey): Promise<string> {
  const der = await crypto.subtle.exportKey("pkcs8", privateKey);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(der)));
  const lines = base64.match(/.{1,64}/g)!.join("\n");
  return `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----\n`;
}

async function makeConfig(): Promise<{ config: GcsConfig; publicKey: CryptoKey }> {
  const { privateKey, publicKey } = await makeKeyPair();
  return {
    config: {
      bucket: "test-bucket",
      clientEmail: "lms-media@test-project.iam.gserviceaccount.com",
      privateKeyPem: await toPem(privateKey),
    },
    publicKey,
  };
}

function rfc3986Encode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

// Independently rebuild the canonical request / string-to-sign from the URL
// (per the V4 spec) and check the signature against the public key.
async function verifySignedUrl(
  url: string,
  publicKey: CryptoKey,
  method: string,
  extraHeaders: Record<string, string> = {}
): Promise<boolean> {
  const parsed = new URL(url);
  const params = [...parsed.searchParams.entries()].filter(
    ([k]) => k !== "X-Goog-Signature"
  );
  const canonicalQuery = params
    .map(([k, val]) => [rfc3986Encode(k), rfc3986Encode(val)] as const)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, val]) => `${k}=${val}`)
    .join("&");
  const headerMap = new Map<string, string>([["host", parsed.host]]);
  for (const [name, value] of Object.entries(extraHeaders)) {
    headerMap.set(name.toLowerCase(), value.trim());
  }
  const names = [...headerMap.keys()].sort();
  const canonicalRequest = [
    method,
    parsed.pathname,
    canonicalQuery,
    names.map((n) => `${n}:${headerMap.get(n)}\n`).join(""),
    names.join(";"),
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const hashHex = Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(canonicalRequest)
      )
    ),
    (b) => b.toString(16).padStart(2, "0")
  ).join("");
  const stringToSign = [
    "GOOG4-RSA-SHA256",
    parsed.searchParams.get("X-Goog-Date")!,
    parsed.searchParams.get("X-Goog-Credential")!.split("/").slice(1).join("/"),
    hashHex,
  ].join("\n");
  const sigHex = parsed.searchParams.get("X-Goog-Signature")!;
  const signature = new Uint8Array(
    sigHex.match(/.{2}/g)!.map((byte) => parseInt(byte, 16))
  );
  return crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    publicKey,
    signature,
    new TextEncoder().encode(stringToSign)
  );
}

// ─── V4 signing ─────────────────────────────────────────────────────

describe("signGcsUrl", () => {
  it("produces a verifiable GET URL with the expected shape", async () => {
    const { config, publicKey } = await makeConfig();
    const url = await signGcsUrl({
      config,
      method: "GET",
      objectPath: "content/manual/My Video.mp4",
      expiresSeconds: 14400,
      now: new Date("2026-08-25T12:00:00.000Z"),
    });

    expect(url).toContain(
      "https://storage.googleapis.com/test-bucket/content/manual/My%20Video.mp4?"
    );
    const params = new URL(url).searchParams;
    expect(params.get("X-Goog-Algorithm")).toBe("GOOG4-RSA-SHA256");
    expect(params.get("X-Goog-Credential")).toBe(
      `${config.clientEmail}/20260825/auto/storage/goog4_request`
    );
    expect(params.get("X-Goog-Date")).toBe("20260825T120000Z");
    expect(params.get("X-Goog-Expires")).toBe("14400");
    expect(params.get("X-Goog-SignedHeaders")).toBe("host");
    expect(await verifySignedUrl(url, publicKey, "GET")).toBe(true);
  });

  it("binds extra headers into a PUT signature", async () => {
    const { config, publicKey } = await makeConfig();
    const headers = {
      "Content-Type": "video/mp4",
      "x-goog-content-length-range": "0,12345",
    };
    const url = await signGcsUrl({
      config,
      method: "PUT",
      objectPath: "content/abc/file.mp4",
      expiresSeconds: 900,
      headers,
      now: new Date("2026-08-25T12:00:00.000Z"),
    });

    expect(new URL(url).searchParams.get("X-Goog-SignedHeaders")).toBe(
      "content-type;host;x-goog-content-length-range"
    );
    expect(await verifySignedUrl(url, publicKey, "PUT", headers)).toBe(true);
    // Tampered headers must not verify.
    expect(
      await verifySignedUrl(url, publicKey, "PUT", {
        ...headers,
        "x-goog-content-length-range": "0,999999999",
      })
    ).toBe(false);
  });
});

describe("getGcsConfig", () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    saved.GCS_BUCKET = process.env.GCS_BUCKET;
    saved.GCS_SERVICE_ACCOUNT = process.env.GCS_SERVICE_ACCOUNT;
  });
  afterEach(() => {
    for (const key of ["GCS_BUCKET", "GCS_SERVICE_ACCOUNT"] as const) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it("returns null when unset or malformed", () => {
    delete process.env.GCS_BUCKET;
    delete process.env.GCS_SERVICE_ACCOUNT;
    expect(getGcsConfig()).toBeNull();

    process.env.GCS_BUCKET = "b";
    process.env.GCS_SERVICE_ACCOUNT = "not json";
    expect(getGcsConfig()).toBeNull();

    process.env.GCS_SERVICE_ACCOUNT = JSON.stringify({ client_email: "x" });
    expect(getGcsConfig()).toBeNull();
  });

  it("parses the inline service-account JSON", () => {
    process.env.GCS_BUCKET = "bkt";
    process.env.GCS_SERVICE_ACCOUNT = JSON.stringify({
      client_email: "sa@p.iam.gserviceaccount.com",
      private_key: "PEM",
    });
    expect(getGcsConfig()).toEqual({
      bucket: "bkt",
      clientEmail: "sa@p.iam.gserviceaccount.com",
      privateKeyPem: "PEM",
    });
  });
});

// ─── access control through Convex functions ────────────────────────

async function seedUser(
  t: ReturnType<typeof convexTest>,
  role: "owner" | "client"
) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      email: `${role}-${Math.random()}@test.local`,
      name: role,
    });
    await ctx.db.insert("userProfiles", {
      userId,
      role,
      firstName: "Test",
      lastName: role,
      isActive: true,
    });
    return userId;
  });
}

function seedGcsRow(
  t: ReturnType<typeof convexTest>,
  ownerId: Awaited<ReturnType<typeof seedUser>>,
  fields: Record<string, unknown> = {}
) {
  return t.run((ctx) =>
    ctx.db.insert("content", {
      title: "GCS Video",
      attachmentType: "video" as const,
      isPublic: true,
      status: "published",
      active: true,
      createdBy: ownerId,
      mimeType: "video/mp4",
      gcsPath: "content/manual/video.mp4",
      fileSize: 1234,
      ...fields,
    })
  );
}

describe("GCS media access control", () => {
  const saved: Record<string, string | undefined> = {};
  let publicKey: CryptoKey;

  beforeEach(async () => {
    saved.GCS_BUCKET = process.env.GCS_BUCKET;
    saved.GCS_SERVICE_ACCOUNT = process.env.GCS_SERVICE_ACCOUNT;
    const made = await makeConfig();
    publicKey = made.publicKey;
    process.env.GCS_BUCKET = made.config.bucket;
    process.env.GCS_SERVICE_ACCOUNT = JSON.stringify({
      client_email: made.config.clientEmail,
      private_key: made.config.privateKeyPem,
    });
  });
  afterEach(() => {
    for (const key of ["GCS_BUCKET", "GCS_SERVICE_ACCOUNT"] as const) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it("queries never return an unsigned URL for gcsPath content", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await seedUser(t, "owner");
    const contentId = await seedGcsRow(t, ownerId);

    const asOwner = t.withIdentity({ subject: ownerId });
    const owned = await asOwner.query(api.content.getContent, { contentId });
    expect(owned?.fileUrl).toBeNull();
    expect(owned?.requiresSignedUrl).toBe(true);

    // Even fully public/exempt content: the bucket is private.
    const pub = await t.query(api.publicContent.getPublicContent, {
      contentId,
    });
    expect(pub.content?.fileUrl).toBeNull();
    expect(pub.content?.requiresSignedUrl).toBe(true);
  });

  it("getSignedMediaUrl mints a verifiable V4 URL for entitled viewers", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await seedUser(t, "owner");
    const contentId = await seedGcsRow(t, ownerId);

    const url = await t
      .withIdentity({ subject: ownerId })
      .action(api.content.getSignedMediaUrl, { contentId });
    expect(url).toContain(
      "https://storage.googleapis.com/test-bucket/content/manual/video.mp4?"
    );
    expect(await verifySignedUrl(url, publicKey, "GET")).toBe(true);

    // Anonymous viewers of exempt-public content also mint (via the
    // getPublicContent leg of the entitlement chain).
    const anonUrl = await t.action(api.content.getSignedMediaUrl, {
      contentId,
    });
    expect(anonUrl).toContain("X-Goog-Signature=");
  });

  it("getSignedMediaUrl denies anonymous access to private gcs content", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await seedUser(t, "owner");
    const contentId = await seedGcsRow(t, ownerId, { isPublic: false });

    await expect(
      t.action(api.content.getSignedMediaUrl, { contentId })
    ).rejects.toThrow(/access/i);
  });

  it("fails closed when GCS is unconfigured for a gcsPath row", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await seedUser(t, "owner");
    const contentId = await seedGcsRow(t, ownerId);
    delete process.env.GCS_BUCKET;
    delete process.env.GCS_SERVICE_ACCOUNT;

    await expect(
      t
        .withIdentity({ subject: ownerId })
        .action(api.content.getSignedMediaUrl, { contentId })
    ).rejects.toThrow(/not configured/i);
  });

  it("generateGcsUploadUrl requires CREATE_CONTENT and mints pattern-valid paths", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await seedUser(t, "owner");
    const clientId = await seedUser(t, "client");

    await expect(
      t
        .withIdentity({ subject: clientId })
        .action(api.gcs.generateGcsUploadUrl, {
          fileName: "a.mp4",
          mimeType: "video/mp4",
          fileSize: 10,
        })
    ).rejects.toThrow(/permission/i);

    const ticket = await t
      .withIdentity({ subject: ownerId })
      .action(api.gcs.generateGcsUploadUrl, {
        fileName: "My Vidéo (1).mp4",
        mimeType: "video/mp4",
        fileSize: 12345,
      });
    expect(ticket).not.toBeNull();
    expect(ticket!.objectPath).toMatch(GCS_CONTENT_PATH_PATTERN);
    expect(ticket!.requiredHeaders["x-goog-content-length-range"]).toBe(
      "0,12345"
    );
    expect(ticket!.uploadUrl).toContain("X-Goog-Signature=");
  });

  it("generateGcsUploadUrl returns null when GCS is unconfigured", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await seedUser(t, "owner");
    delete process.env.GCS_BUCKET;
    delete process.env.GCS_SERVICE_ACCOUNT;

    const ticket = await t
      .withIdentity({ subject: ownerId })
      .action(api.gcs.generateGcsUploadUrl, {
        fileName: "a.mp4",
        mimeType: "video/mp4",
        fileSize: 10,
      });
    expect(ticket).toBeNull();
  });

  it("createContent rejects gcs paths the upload action didn't mint", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await seedUser(t, "owner");
    const asOwner = t.withIdentity({ subject: ownerId });
    const base = {
      title: "T",
      attachmentType: "video" as const,
      isPublic: false,
      active: true,
    };

    await expect(
      asOwner.mutation(api.content.createContent, {
        ...base,
        gcsPath: "../other-bucket-object",
      })
    ).rejects.toThrow(/invalid media path/i);

    const uuidPath = `content/${crypto.randomUUID()}/video.mp4`;
    const contentId = await asOwner.mutation(api.content.createContent, {
      ...base,
      gcsPath: uuidPath,
      fileSize: 99,
      mimeType: "video/x-m4v",
    });
    const row = await t.run((ctx) => ctx.db.get(contentId));
    expect(row?.gcsPath).toBe(uuidPath);
    // MIME aliases are normalized at create time, like the chunked path.
    expect(row?.mimeType).toBe("video/mp4");
  });

  it("updateContent swaps a convex-stored file for a gcs one", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await seedUser(t, "owner");
    const fileId = await t.run((ctx) => ctx.storage.store(new Blob(["old"])));
    const contentId = await t.run((ctx) =>
      ctx.db.insert("content", {
        title: "Swap",
        attachmentType: "video" as const,
        isPublic: false,
        status: "draft",
        active: true,
        createdBy: ownerId,
        fileId,
        mimeType: "video/mp4",
      })
    );

    const uuidPath = `content/${crypto.randomUUID()}/new.mp4`;
    await t.withIdentity({ subject: ownerId }).mutation(api.content.updateContent, {
      contentId,
      title: "Swap",
      attachmentType: "video",
      isPublic: false,
      active: true,
      gcsPath: uuidPath,
      fileSize: 555,
      mimeType: "video/mp4",
    });

    const row = await t.run((ctx) => ctx.db.get(contentId));
    expect(row?.gcsPath).toBe(uuidPath);
    expect(row?.fileId).toBeUndefined();
    expect(row?.fileSize).toBe(555);
    // The replaced Convex blob is freed.
    expect(await t.run((ctx) => ctx.storage.getUrl(fileId))).toBeNull();
  });
});

describe("maintenance:attachGcsMedia", () => {
  it("repoints a chunked row at GCS and frees the chunk blobs", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await seedUser(t, "owner");
    const chunkA = await t.run((ctx) => ctx.storage.store(new Blob(["aa"])));
    const chunkB = await t.run((ctx) => ctx.storage.store(new Blob(["bb"])));
    const contentId = await t.run((ctx) =>
      ctx.db.insert("content", {
        title: "Big video",
        attachmentType: "video" as const,
        isPublic: true,
        status: "published",
        active: true,
        createdBy: ownerId,
        mimeType: "video/mp4",
        fileSize: 4,
        chunks: [
          { storageId: chunkA, size: 2 },
          { storageId: chunkB, size: 2 },
        ],
      })
    );

    const result = await t.mutation(internal.maintenance.attachGcsMedia, {
      contentId,
      gcsPath: "content/manual/big-video.mp4",
    });
    expect(result.freedChunkBlobs).toBe(2);

    const row = await t.run((ctx) => ctx.db.get(contentId));
    expect(row?.gcsPath).toBe("content/manual/big-video.mp4");
    expect(row?.chunks).toBeUndefined();
    expect(row?.fileSize).toBe(4); // metadata kept unless overridden
    expect(await t.run((ctx) => ctx.storage.getUrl(chunkA))).toBeNull();
    expect(await t.run((ctx) => ctx.storage.getUrl(chunkB))).toBeNull();
  });
});
