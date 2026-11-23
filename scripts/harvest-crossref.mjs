/**
 * Coleta tudo que o Crossref tem sob o ISSN da revista: DOI, paginacao,
 * elocation, ORCID dos autores, referencias e contagem de citacoes.
 * Grava data/crossref.ndjson.
 */
import { env, get, NdjsonWriter, log } from "./lib.mjs";

const ISSN = env("CROSSREF_ISSN");
const MAILTO = env("CROSSREF_MAILTO");
const ROWS = 500;

const SELECT = [
  "DOI", "title", "subtitle", "abstract", "author", "issued", "published",
  "volume", "issue", "page", "article-number", "URL", "type", "language",
  "container-title", "is-referenced-by-count", "references-count",
  "reference", "subject", "license", "link", "created",
].join(",");

async function main() {
  const out = new NdjsonWriter("crossref.ndjson");
  let cursor = "*";
  let total = null;
  let page = 0;

  for (;;) {
    const url =
      `https://api.crossref.org/journals/${ISSN}/works` +
      `?rows=${ROWS}&cursor=${encodeURIComponent(cursor)}` +
      `&select=${encodeURIComponent(SELECT)}&mailto=${encodeURIComponent(MAILTO)}`;

    const json = JSON.parse(await get(url));
    const msg = json.message;
    total ??= msg["total-results"];

    for (const it of msg.items || []) {
      const issued = it.issued?.["date-parts"]?.[0] || [];
      out.write({
        doi: it.DOI,
        title: Array.isArray(it.title) ? it.title[0] : it.title,
        subtitle: Array.isArray(it.subtitle) ? it.subtitle[0] : it.subtitle,
        abstract: it.abstract || null,
        type: it.type,
        language: it.language || null,
        volume: it.volume || null,
        issue: it.issue || null,
        page: it.page || null,
        elocationId: it["article-number"] || null,
        url: it.URL || null,
        year: issued[0] ?? null,
        month: issued[1] ?? null,
        day: issued[2] ?? null,
        created: it.created?.["date-time"] || null,
        citationCount: it["is-referenced-by-count"] ?? 0,
        referenceCount: it["references-count"] ?? 0,
        license: it.license?.[0]?.URL || null,
        pdfLink: (it.link || []).find((l) => l["content-type"] === "application/pdf")?.URL || null,
        subjects: it.subject || [],
        authors: (it.author || []).map((a, i) => ({
          position: i,
          given: a.given || null,
          family: a.family || null,
          name: a.name || [a.given, a.family].filter(Boolean).join(" "),
          orcid: a.ORCID ? a.ORCID.replace(/^https?:\/\/orcid\.org\//, "") : null,
          affiliation: (a.affiliation || []).map((x) => x.name).filter(Boolean).join("; ") || null,
          sequence: a.sequence || null,
        })),
        references: (it.reference || []).slice(0, 200).map((r, i) => ({
          position: i,
          doi: r.DOI || null,
          unstructured: r.unstructured || null,
          year: r.year || null,
          journalTitle: r["journal-title"] || null,
        })),
      });
    }

    page += 1;
    log(`pagina ${page}: ${out.count}/${total} trabalhos`);

    const next = msg["next-cursor"];
    if (!next || !msg.items?.length || out.count >= total) break;
    cursor = next;
  }

  await out.close();
  log(`\nCrossref concluido: ${out.count} trabalhos em data/crossref.ndjson`);
}

main().catch((e) => {
  console.error("falha na coleta Crossref:", e.message);
  process.exit(1);
});
