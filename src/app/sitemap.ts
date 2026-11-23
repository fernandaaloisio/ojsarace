import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/text";

export const dynamic = "force-dynamic";

/** O sitemap cobre artigos, edições e temas: é o que os rastreadores leem
 *  além do OAI-PMH. Em acervos grandes o Next divide em partes automaticamente. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [artigos, edicoes, temas, autores, paginas] = await Promise.all([
    db.article.findMany({ select: { slug: true, updatedAt: true }, orderBy: { publishedAt: "desc" } }),
    db.issue.findMany({ where: { articles: { some: {} } }, select: { slug: true, publishedAt: true } }),
    db.keyword.findMany({ where: { count: { gte: 3 } }, select: { slug: true }, orderBy: { count: "desc" }, take: 2000 }),
    db.author.findMany({ where: { articleCount: { gte: 2 } }, select: { slug: true }, take: 4000 }),
    db.staticPage.findMany({ select: { slug: true, updatedAt: true } }),
  ]);

  const agora = new Date();

  return [
    { url: SITE_URL, lastModified: agora, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/arquivo`, lastModified: agora, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/explorar`, lastModified: agora, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/autores`, lastModified: agora, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/indexacao`, lastModified: agora, changeFrequency: "monthly", priority: 0.5 },
    ...paginas.map((p) => ({
      url: `${SITE_URL}/${p.slug}`, lastModified: p.updatedAt,
      changeFrequency: "yearly" as const, priority: 0.5,
    })),
    ...edicoes.map((e) => ({
      url: `${SITE_URL}/edicao/${e.slug}`, lastModified: e.publishedAt ?? agora,
      changeFrequency: "yearly" as const, priority: 0.7,
    })),
    ...artigos.map((a) => ({
      url: `${SITE_URL}/artigo/${a.slug}`, lastModified: a.updatedAt,
      changeFrequency: "yearly" as const, priority: 0.9,
    })),
    ...temas.map((t) => ({
      url: `${SITE_URL}/explorar/${t.slug}`, lastModified: agora,
      changeFrequency: "monthly" as const, priority: 0.4,
    })),
    ...autores.map((a) => ({
      url: `${SITE_URL}/autor/${a.slug}`, lastModified: agora,
      changeFrequency: "monthly" as const, priority: 0.4,
    })),
  ];
}
