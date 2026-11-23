import { db } from "@/lib/db";
import { revista } from "@/lib/queries";
import { depositoXml } from "@/lib/crossref";
import { SITE_URL } from "@/lib/text";

/**
 * XML de depósito de DOI de uma edição inteira, pronto para enviar ao Crossref.
 * Ex.: /api/crossref/v8-n11-2026
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [r, issue] = await Promise.all([
    revista(),
    db.issue.findFirst({ where: { slug } }),
  ]);
  if (!issue) return new Response("Edição não encontrada.", { status: 404 });

  const artigos = await db.article.findMany({
    where: { issueId: issue.id, doi: { not: null } },
    orderBy: [{ elocationId: "asc" }, { doi: "asc" }],
    select: {
      title: true, doi: true, abstract: true, language: true, slug: true,
      publishedAt: true, elocationId: true, firstPage: true, lastPage: true,
      authors: {
        orderBy: { position: "asc" },
        select: { affiliation: true, author: { select: { name: true, orcid: true } } },
      },
    },
  });

  const xml = depositoXml({
    revista: r,
    edicao: issue,
    artigos,
    siteUrl: SITE_URL,
    depositorName: r.publisher ?? "New Science Publishers",
    depositorEmail: process.env.CROSSREF_MAILTO ?? "contato@sevenevents.com.br",
  });

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="crossref-${slug}.xml"`,
    },
  });
}
