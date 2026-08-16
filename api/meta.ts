/**
 * Server-rendered Open Graph / Twitter card metadata for unfurl bots.
 *
 * The app is a client-rendered SPA, so link-preview crawlers (Slack,
 * iMessage, Facebook, X, LinkedIn, Discord, WhatsApp…) — which do NOT
 * execute JavaScript — would otherwise see an empty shell. vercel.json
 * rewrites /view/:id and /share/:token here for those user agents only;
 * humans and JS-rendering crawlers (Googlebot) keep the SPA.
 *
 * Security: metadata comes exclusively from the same public Convex queries
 * an anonymous visitor can call (getPublicContent / getContentByShareToken /
 * getCertificateByShareToken), so the gates in those queries (published/
 * active/date-window/paywall/private/whitelist) apply verbatim. Gated
 * content falls back to site-wide defaults.
 */

const BOT_PATH_RE = /^\/(view|share|certificate)\/([^/?#]+)/;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function stripTags(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function convexQuery(
  convexUrl: string,
  path: string,
  args: Record<string, unknown>
): Promise<unknown | null> {
  try {
    const response = await fetch(`${convexUrl}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, args, format: "json" }),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as {
      status?: string;
      value?: unknown;
    };
    return body.status === "success" ? (body.value ?? null) : null;
  } catch {
    return null;
  }
}

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  // The original path arrives via the rewrite query param (?path=…) or,
  // when hit directly, via the URL path itself.
  const path = url.searchParams.get("path") ?? url.pathname;
  const match = BOT_PATH_RE.exec(path);

  const convexUrl =
    process.env.VITE_CONVEX_URL ?? process.env.CONVEX_URL ?? "";

  const site = (await convexQuery(
    convexUrl,
    "siteSettings:getSiteSettings",
    {}
  )) as {
    organizationName?: string;
    tagline?: string;
    description?: string;
    logoUrl?: string | null;
  } | null;

  const siteName = site?.organizationName ?? "Content Portal";
  let title = siteName;
  let description =
    site?.description ??
    site?.tagline ??
    "A content portal for sharing videos, documents, and learning materials.";
  let image: string | null = site?.logoUrl ?? null;
  let noindex = false;

  if (match && convexUrl) {
    const [, kind, id] = match;
    if (kind === "view") {
      const result = (await convexQuery(
        convexUrl,
        "publicContent:getPublicContent",
        { contentId: id }
      )) as {
        content?: {
          title?: string;
          description?: string;
          thumbnailUrl?: string | null;
        } | null;
        preview?: {
          title?: string;
          description?: string | null;
          thumbnailUrl?: string | null;
        };
      } | null;
      // Full public payload, or the storefront preview for priced content —
      // both are exactly what an anonymous visitor would see.
      const meta = result?.content ?? result?.preview ?? null;
      if (meta?.title) {
        title = `${meta.title} — ${siteName}`;
        if (meta.description) description = stripTags(meta.description);
        if (meta.thumbnailUrl) image = meta.thumbnailUrl;
      }
    } else if (kind === "certificate") {
      noindex = true; // tokenized certificate links are never indexed
      const cert = (await convexQuery(
        convexUrl,
        "certificates:getCertificateByShareToken",
        { shareToken: id }
      )) as {
        recipientName?: string;
        quizTitle?: string;
        targetTitle?: string | null;
        score?: number;
        issuedAt?: number;
      } | null;
      if (cert?.recipientName && cert.quizTitle) {
        title = `${cert.recipientName} — ${cert.quizTitle} Certificate — ${siteName}`;
        description =
          `Certificate of achievement awarded to ${cert.recipientName} ` +
          `for passing “${cert.quizTitle}”` +
          (cert.targetTitle ? ` (${cert.targetTitle})` : "") +
          (typeof cert.score === "number"
            ? ` with a score of ${cert.score}%.`
            : ".");
      }
    } else {
      noindex = true; // tokenized share links are never indexed
      const result = (await convexQuery(
        convexUrl,
        "contentShares:getContentByShareToken",
        { accessToken: id }
      )) as {
        content?: {
          title?: string;
          description?: string;
          thumbnailUrl?: string | null;
        } | null;
      } | null;
      if (result?.content?.title) {
        title = `${result.content.title} — ${siteName}`;
        if (result.content.description) {
          description = stripTags(result.content.description);
        }
        if (result.content.thumbnailUrl) image = result.content.thumbnailUrl;
      }
    }
  }

  description = description.slice(0, 300);
  const canonical = `${url.origin}${path}`;
  const imageUrl = image ?? `${url.origin}/og-default.png`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
${noindex ? '<meta name="robots" content="noindex">\n' : ""}<link rel="canonical" href="${escapeHtml(canonical)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="${escapeHtml(siteName)}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(canonical)}">
<meta property="og:image" content="${escapeHtml(imageUrl)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(imageUrl)}">
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<p>${escapeHtml(description)}</p>
<p><a href="${escapeHtml(canonical)}">Open in ${escapeHtml(siteName)}</a></p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
