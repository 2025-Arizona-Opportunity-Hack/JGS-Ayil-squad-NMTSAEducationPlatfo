import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import {
  computeMediaSignature,
  isSignedMediaExempt,
  timingSafeEqual,
} from "./helpers";
import { normalizeMimeType } from "./mimeTypes";

const http = httpRouter();

// --- Stripe Checkout ---

http.route({
  path: "/api/stripe/checkout",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { orderId } = body as { orderId: string };

      if (!orderId) {
        return new Response(JSON.stringify({ error: "orderId is required" }), {
          status: 400,
          headers: corsHeaders(request),
        });
      }

      // Fetch the order details
      const order = await ctx.runQuery(
        internal.stripe_helpers.getOrderDetails,
        { orderId: orderId as Id<"orders"> }
      );

      if (!order) {
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404,
          headers: corsHeaders(request),
        });
      }

      if (order.status !== "pending") {
        return new Response(
          JSON.stringify({ error: "Order is not in pending status" }),
          { status: 400, headers: corsHeaders(request) }
        );
      }

      // Call the Node.js action to create a Stripe Checkout Session
      const session = await ctx.runAction(
        internal.stripe.createCheckoutSessionAction,
        {
          orderId,
          amount: order.amount,
          currency: order.currency,
          contentTitle: order.contentTitle || "Content Purchase",
          contentDescription: order.contentDescription || undefined,
          contentId: order.contentId || "",
          userId: order.userId,
        }
      );

      // Save the Stripe session ID on the order
      await ctx.runMutation(internal.stripe_helpers.setStripeSessionId, {
        orderId: orderId as Id<"orders">,
        stripeSessionId: session.sessionId,
      });

      return new Response(JSON.stringify({ url: session.url }), {
        status: 200,
        headers: corsHeaders(request),
      });
    } catch (error) {
      console.error("Stripe checkout error:", error);
      return new Response(
        JSON.stringify({
          error:
            error instanceof Error ? error.message : "Internal server error",
        }),
        { status: 500, headers: corsHeaders(request) }
      );
    }
  }),
});

// CORS preflight for checkout
http.route({
  path: "/api/stripe/checkout",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }),
});

// --- Stripe Webhook ---

http.route({
  path: "/api/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature") || "";

    try {
      // Verify signature and parse event in Node.js action
      const event = await ctx.runAction(
        internal.stripe.verifyWebhookAction,
        { body, signature }
      );

      if (event.type === "checkout.session.completed" && event.orderId) {
        await ctx.runMutation(internal.orders.completeOrderInternal, {
          orderId: event.orderId as Id<"orders">,
          stripeSessionId: event.sessionId || "",
        });
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Webhook error:", error);
      return new Response("Webhook processing failed", { status: 400 });
    }
  }),
});

// --- CORS origin allowlist ---
//
// An instance's frontend can live at more than one origin: the primary
// SITE_URL, an apex/www alias, or a Vercel preview domain. ALLOWED_ORIGINS is
// an optional comma-separated list of additional absolute origins to trust.
// We never emit "*" and never reflect an arbitrary Origin — only an Origin
// that's actually in the computed allowlist gets echoed back; anything else
// falls back to SITE_URL (or the localhost dev default when SITE_URL isn't
// set, preserving existing local-dev behavior).

function siteUrlOrDevFallback(): string {
  const raw = process.env.SITE_URL;
  return raw ? raw.trim().replace(/\/+$/, "") : "http://localhost:5173";
}

function computeAllowedOrigins(): string[] {
  const origins = new Set<string>();
  origins.add(siteUrlOrDevFallback());
  const extra = process.env.ALLOWED_ORIGINS;
  if (extra) {
    for (const entry of extra.split(",")) {
      const trimmed = entry.trim().replace(/\/+$/, "");
      if (trimmed) origins.add(trimmed);
    }
  }
  return Array.from(origins);
}

// Pick the Access-Control-Allow-Origin value for a given request: echo the
// request's Origin header back only if it's in the allowlist, otherwise fall
// back to SITE_URL (or the localhost dev default). `request` is optional so
// OPTIONS-only handlers without a request in scope can still get a sane
// default.
function resolveAllowedOrigin(request?: Request | null): string {
  const fallback = siteUrlOrDevFallback();
  const requestOrigin = request?.headers.get("Origin");
  if (!requestOrigin) return fallback;
  return computeAllowedOrigins().includes(requestOrigin)
    ? requestOrigin
    : fallback;
}

function corsHeaders(request?: Request | null) {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": resolveAllowedOrigin(request),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

// --- Chunked content serving ---
//
// Serves files that were uploaded in chunks because they exceeded Convex's
// 2-minute single-POST upload window. Each chunk lives as its own _storage
// object; this endpoint stitches them together for HTTP Range requests so the
// browser sees a single contiguous video/audio/file resource.
//
// Caveats worth knowing if you touch this:
// - We cap each response at MAX_RESPONSE_BYTES (~10 MB) so we stay safely under
//   the HTTP action 20 MiB response cap. Video players send small Range
//   requests by default; this only kicks in on full-file fetches (no Range
//   header), where we return the first slice and rely on the client to issue
//   follow-up Range requests. That's standard HTTP behavior — `Accept-Ranges:
//   bytes` advertises it.
// - Seek (scrubbing) only works if the source file has its moov atom at the
//   front (fast-start MP4/MOV). That's a property of the source file, not
//   anything we can fix here.
// - Codec compatibility is unchanged from non-chunked: MP4/H.264 plays
//   everywhere; raw .MOV/ProRes is Safari-only. Chunking doesn't transcode.

const MAX_RESPONSE_BYTES = 10 * 1024 * 1024; // 10 MB — stays under 20 MiB HTTP action cap
const SERVE_PATH_PREFIX = "/api/serve-chunked/";

function mediaCorsHeaders(
  request?: Request | null,
  extra: Record<string, string> = {}
) {
  return {
    "Access-Control-Allow-Origin": resolveAllowedOrigin(request),
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Range",
    "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
    Vary: "Origin",
    ...extra,
  };
}

// Verify the `exp`/`sig` query params on a /api/serve-chunked request against
// the HMAC contract from `content.getSignedMediaUrl` (A3). Fails closed: if
// MEDIA_URL_SECRET isn't configured, or either param is missing/malformed, or
// the signature doesn't match, or `exp` has passed, this returns false — the
// caller must then reject the request without serving any bytes.
async function verifySignedMediaRequest(
  url: URL,
  contentId: string
): Promise<boolean> {
  const secret = process.env.MEDIA_URL_SECRET;
  if (!secret) return false;

  const expParam = url.searchParams.get("exp");
  const sig = url.searchParams.get("sig");
  if (!expParam || !sig) return false;

  const exp = Number(expParam);
  if (!Number.isFinite(exp) || exp <= Date.now()) return false;

  const expectedSig = await computeMediaSignature(contentId, exp, secret);
  return timingSafeEqual(sig, expectedSig);
}

// Parse a single-range "Range: bytes=start-end" header against a known total
// size. Returns the inclusive byte range we'll actually return, or null when
// the header is malformed / a multi-range request we don't support.
function parseRange(
  header: string | null,
  totalSize: number
): { start: number; end: number } | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const [, startStr, endStr] = match;
  let start: number;
  let end: number;
  if (startStr === "" && endStr === "") return null;
  if (startStr === "") {
    // Suffix range: last N bytes
    const suffixLen = parseInt(endStr, 10);
    if (!Number.isFinite(suffixLen) || suffixLen <= 0) return null;
    start = Math.max(0, totalSize - suffixLen);
    end = totalSize - 1;
  } else {
    start = parseInt(startStr, 10);
    if (!Number.isFinite(start) || start < 0) return null;
    if (endStr === "") {
      end = totalSize - 1;
    } else {
      end = parseInt(endStr, 10);
      if (!Number.isFinite(end) || end < start) return null;
      end = Math.min(end, totalSize - 1);
    }
  }
  if (start >= totalSize) return null;
  return { start, end };
}

http.route({
  pathPrefix: SERVE_PATH_PREFIX,
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => {
    return new Response(null, {
      status: 204,
      headers: mediaCorsHeaders(request),
    });
  }),
});

async function handleChunkedServe(
  ctx: Parameters<Parameters<typeof httpAction>[0]>[0],
  request: Request,
  bodyless: boolean
): Promise<Response> {
  const url = new URL(request.url);
  const contentId = url.pathname
    .replace(SERVE_PATH_PREFIX, "")
    .replace(/\/$/, "");

  if (!contentId) {
    return new Response("Missing contentId", {
      status: 400,
      headers: mediaCorsHeaders(request),
    });
  }

  let content: {
    chunks: Array<{ storageId: Id<"_storage">; size: number }>;
    mimeType?: string;
    isPublic: boolean;
    status?: string;
    active: boolean;
    hasPassword: boolean;
    isPriced: boolean;
  } | null;
  try {
    content = await ctx.runQuery(internal.content.getChunkedContentInternal, {
      contentId: contentId as Id<"content">,
    });
  } catch {
    // Malformed contentId — Id validator throws. Treat as not found.
    return new Response("Not found", {
      status: 404,
      headers: mediaCorsHeaders(request),
    });
  }

  if (!content || !content.chunks || content.chunks.length === 0) {
    return new Response("Not found", {
      status: 404,
      headers: mediaCorsHeaders(request),
    });
  }

  // A3: content IDs are not secret (they're handed to every logged-in user
  // by e.g. pricing.listPricedContent), so this endpoint can't rely on the
  // contentId alone as an entitlement check. Public, published, active,
  // unpriced, password-free content stays servable without a signature (it
  // was never gated on anything else either); everything else — private,
  // password-protected, or priced — requires a valid, unexpired HMAC
  // signature minted by `content.getSignedMediaUrl`.
  const isExemptFromSigning = isSignedMediaExempt(content);

  if (!isExemptFromSigning) {
    const verified = await verifySignedMediaRequest(url, contentId);
    if (!verified) {
      return new Response("Forbidden", {
        status: 403,
        headers: mediaCorsHeaders(request),
      });
    }
  }

  const totalSize = content.chunks.reduce(
    (sum: number, c: { size: number }) => sum + c.size,
    0
  );
  // Normalized so already-uploaded rows recorded as e.g. video/x-m4v (which
  // Chromium's demuxer rejects) start playing without a re-upload.
  const mimeType = normalizeMimeType(content.mimeType) ?? "application/octet-stream";

  const range = parseRange(request.headers.get("range"), totalSize);

  let start: number;
  let end: number;
  let status: number;
  if (range) {
    start = range.start;
    end = range.end;
    // Clamp response size so we stay under the HTTP action body limit.
    if (end - start + 1 > MAX_RESPONSE_BYTES) {
      end = start + MAX_RESPONSE_BYTES - 1;
    }
    status = 206;
  } else {
    start = 0;
    end = Math.min(totalSize - 1, MAX_RESPONSE_BYTES - 1);
    // If we're returning the full file in one go, use 200; otherwise 206 to
    // signal partial content even though the client didn't ask for a range.
    status = end === totalSize - 1 ? 200 : 206;
  }

  // Figure out which chunks contain the [start, end] byte range and what
  // sub-range of each chunk we need.
  type ChunkSlice = {
    storageId: Id<"_storage">;
    fromInChunk: number; // inclusive
    toInChunk: number; // inclusive
  };
  const slices: Array<ChunkSlice> = [];
  let cursor = 0;
  for (const chunk of content.chunks as Array<{
    storageId: Id<"_storage">;
    size: number;
  }>) {
    const chunkStart = cursor;
    const chunkEnd = cursor + chunk.size - 1;
    if (chunkEnd < start) {
      cursor = chunkEnd + 1;
      continue;
    }
    if (chunkStart > end) break;
    slices.push({
      storageId: chunk.storageId,
      fromInChunk: Math.max(0, start - chunkStart),
      toInChunk: Math.min(chunk.size - 1, end - chunkStart),
    });
    cursor = chunkEnd + 1;
  }

  if (slices.length === 0) {
    return new Response("Range not satisfiable", {
      status: 416,
      headers: mediaCorsHeaders(request, {
        "Content-Range": `bytes */${totalSize}`,
      }),
    });
  }

  const headers: Record<string, string> = mediaCorsHeaders(request, {
    "Content-Type": mimeType,
    "Accept-Ranges": "bytes",
    "Content-Length": String(end - start + 1),
    "Cache-Control": "public, max-age=3600",
  });
  if (status === 206) {
    headers["Content-Range"] = `bytes ${start}-${end}/${totalSize}`;
  }

  if (bodyless) {
    // HEAD response — no body
    return new Response(null, { status, headers });
  }

  // Fetch each needed slice from storage and assemble the response body.
  // We use storage URLs + Range requests so we don't pull whole chunks into
  // memory when only a small sub-range is needed.
  const parts: Array<Uint8Array> = [];
  for (const slice of slices) {
    const storageUrl = await ctx.storage.getUrl(slice.storageId);
    if (!storageUrl) {
      return new Response("Chunk storage missing", {
        status: 500,
        headers: mediaCorsHeaders(request),
      });
    }
    const subRange = `bytes=${slice.fromInChunk}-${slice.toInChunk}`;
    const res = await fetch(storageUrl, { headers: { Range: subRange } });
    if (!res.ok && res.status !== 206 && res.status !== 200) {
      return new Response(`Failed to fetch chunk: ${res.status}`, {
        status: 502,
        headers: mediaCorsHeaders(request),
      });
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    parts.push(buf);
  }

  const totalLen = parts.reduce((s, p) => s + p.byteLength, 0);
  const body = new Uint8Array(totalLen);
  let offset = 0;
  for (const p of parts) {
    body.set(p, offset);
    offset += p.byteLength;
  }

  return new Response(body, { status, headers });
}

http.route({
  pathPrefix: SERVE_PATH_PREFIX,
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      return await handleChunkedServe(ctx, request, false);
    } catch (error) {
      console.error("serve-chunked GET error:", error);
      return new Response(
        error instanceof Error ? error.message : "Internal error",
        { status: 500, headers: mediaCorsHeaders(request) }
      );
    }
  }),
});

// Note: HEAD is intentionally not registered. Convex's httpRouter restricts
// methods to GET/POST/PUT/DELETE/PATCH/OPTIONS. Video elements probe with
// GET + `Range: bytes=0-0` rather than HEAD, so this isn't a real limitation.

export default http;
