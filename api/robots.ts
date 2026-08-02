/**
 * /robots.txt — dynamic because the Sitemap directive must be an absolute
 * URL and each org deployment serves its own domain (multi-org invariant:
 * never hardcode a domain).
 */
export default function handler(request: Request): Response {
  const origin = new URL(request.url).origin;
  const body = `# /view/ pages are the public, indexable content surface.
# /share/ links are semi-secret tokenized URLs - never index them.
User-agent: *
Allow: /view/
Disallow: /share/

Sitemap: ${origin}/sitemap.xml
`;
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
