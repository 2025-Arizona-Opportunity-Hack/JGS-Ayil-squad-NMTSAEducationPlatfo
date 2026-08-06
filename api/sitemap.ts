/**
 * /sitemap.xml — lists the site root plus every public, published, active
 * /view/ page. Ids come from the public Convex query
 * publicContent:listPublicContentForSitemap (ids + timestamps only).
 * The host comes from the request, so one build serves every org's domain
 * (multi-org invariant: never hardcode a domain).
 */

async function fetchSitemapRows(): Promise<
  Array<{ _id: string; updatedAt: number }>
> {
  const convexUrl =
    process.env.VITE_CONVEX_URL ?? process.env.CONVEX_URL ?? "";
  if (!convexUrl) return [];
  try {
    const response = await fetch(`${convexUrl}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "publicContent:listPublicContentForSitemap",
        args: {},
        format: "json",
      }),
    });
    if (!response.ok) return [];
    const body = (await response.json()) as {
      status?: string;
      value?: Array<{ _id: string; updatedAt: number }>;
    };
    return body.status === "success" ? (body.value ?? []) : [];
  } catch {
    return [];
  }
}

export default async function handler(request: Request): Promise<Response> {
  const origin = new URL(request.url).origin;
  const rows = await fetchSitemapRows();

  const urls = [
    `  <url><loc>${origin}/</loc></url>`,
    ...rows.map(
      (row) =>
        `  <url><loc>${origin}/view/${row._id}</loc><lastmod>${new Date(
          row.updatedAt
        )
          .toISOString()
          .slice(0, 10)}</lastmod></url>`
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
