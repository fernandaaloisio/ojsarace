import { db } from "@/lib/db";
import { revista } from "@/lib/queries";
import { SITE_URL } from "@/lib/text";

const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET() {
  const [r, artigos] = await Promise.all([
    revista(),
    db.article.findMany({
      orderBy: { publishedAt: "desc" },
      take: 60,
      select: {
        slug: true, title: true, abstract: true, publishedAt: true, doi: true,
        authors: { orderBy: { position: "asc" }, select: { author: { select: { name: true } } } },
        issue: { select: { label: true } },
      },
    }),
  ]);

  const itens = artigos.map((a) => `    <item>
      <title>${esc(a.title)}</title>
      <link>${SITE_URL}/artigo/${esc(a.slug)}</link>
      <guid isPermaLink="false">${a.doi ? `doi:${esc(a.doi)}` : `${SITE_URL}/artigo/${esc(a.slug)}`}</guid>
      ${a.publishedAt ? `<pubDate>${a.publishedAt.toUTCString()}</pubDate>` : ""}
      <dc:creator>${esc(a.authors.map((x) => x.author.name).join(", "))}</dc:creator>
      <category>${esc(a.issue?.label ?? "")}</category>
      <description>${esc((a.abstract ?? "").slice(0, 600))}</description>
    </item>`).join("\n");

  const corpo = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(r.title)} — últimos artigos</title>
    <link>${SITE_URL}</link>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <description>${esc(r.description)}</description>
    <language>pt-BR</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${itens}
  </channel>
</rss>`;

  return new Response(corpo, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=1800, s-maxage=3600",
    },
  });
}
