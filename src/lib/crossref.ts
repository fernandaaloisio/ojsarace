/**
 * Geração do XML de depósito de DOI no Crossref (schema 5.3.1).
 *
 * É o sentido de ida da integração: o portal publica e deposita os metadados,
 * e o Crossref passa a resolver o DOI para a página do artigo neste portal.
 * A ordem dos elementos segue a sequência exigida pelo schema; valide o
 * arquivo no validador do Crossref antes do primeiro depósito real.
 */

export type ArtigoDeposito = {
  title: string;
  doi: string | null;
  abstract: string | null;
  language: string;
  slug: string;
  publishedAt: Date | null;
  elocationId: string | null;
  firstPage: string | null;
  lastPage: string | null;
  authors: { author: { name: string; orcid: string | null }; affiliation: string | null }[];
};

export type EdicaoDeposito = {
  volume: number | null;
  number: string | null;
  year: number | null;
  publishedAt: Date | null;
};

export type RevistaDeposito = {
  title: string;
  acronym: string | null;
  issn: string | null;
  publisher: string | null;
};

const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");

/** "Maria da Silva Santos" -> {given: "Maria da Silva", surname: "Santos"} */
function partirNome(nome: string) {
  const p = nome.trim().split(/\s+/);
  if (p.length === 1) return { given: "", surname: p[0] };
  const surname = p.pop() as string;
  return { given: p.join(" "), surname };
}

function dataXml(d: Date | null, ano: number | null, indent: string) {
  const data = d ?? (ano ? new Date(Date.UTC(ano, 0, 1)) : null);
  if (!data) return "";
  return `${indent}<publication_date media_type="online">
${indent}  <month>${String(data.getUTCMonth() + 1).padStart(2, "0")}</month>
${indent}  <day>${String(data.getUTCDate()).padStart(2, "0")}</day>
${indent}  <year>${data.getUTCFullYear()}</year>
${indent}</publication_date>`;
}

export function depositoXml(opts: {
  revista: RevistaDeposito;
  edicao: EdicaoDeposito;
  artigos: ArtigoDeposito[];
  siteUrl: string;
  depositorName: string;
  depositorEmail: string;
  batchId?: string;
}): string {
  const { revista, edicao, artigos, siteUrl } = opts;
  const timestamp = Date.now();
  const batchId = opts.batchId ?? `arace-${edicao.volume ?? 0}-${edicao.number ?? 0}-${timestamp}`;

  const corpoArtigos = artigos
    .filter((a) => a.doi)
    .map((a) => {
      const contribs = a.authors.map((x, i) => {
        const { given, surname } = partirNome(x.author.name);
        return `          <person_name sequence="${i === 0 ? "first" : "additional"}" contributor_role="author">
${given ? `            <given_name>${esc(given)}</given_name>\n` : ""}            <surname>${esc(surname)}</surname>${
          x.affiliation ? `\n            <affiliations><institution><institution_name>${esc(x.affiliation)}</institution_name></institution></affiliations>` : ""
        }${x.author.orcid ? `\n            <ORCID>https://orcid.org/${esc(x.author.orcid)}</ORCID>` : ""}
          </person_name>`;
      }).join("\n");

      const paginacao = a.elocationId
        ? `        <publisher_item><item_number item_number_type="article_number">${esc(a.elocationId)}</item_number></publisher_item>`
        : a.firstPage
          ? `        <pages>\n          <first_page>${esc(a.firstPage)}</first_page>${a.lastPage ? `\n          <last_page>${esc(a.lastPage)}</last_page>` : ""}\n        </pages>`
          : "";

      return `      <journal_article publication_type="full_text" language="${esc(a.language)}">
        <titles>
          <title>${esc(a.title)}</title>
        </titles>
${contribs ? `        <contributors>\n${contribs}\n        </contributors>\n` : ""}${
        a.abstract
          ? `        <jats:abstract xmlns:jats="http://www.ncbi.nlm.nih.gov/JATS1">\n          <jats:p>${esc(a.abstract)}</jats:p>\n        </jats:abstract>\n`
          : ""
      }${dataXml(a.publishedAt, edicao.year, "        ")}
${paginacao ? paginacao + "\n" : ""}        <doi_data>
          <doi>${esc(a.doi)}</doi>
          <resource>${esc(siteUrl)}/artigo/${esc(a.slug)}</resource>
        </doi_data>
      </journal_article>`;
    }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<doi_batch xmlns="http://www.crossref.org/schema/5.3.1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:jats="http://www.ncbi.nlm.nih.gov/JATS1"
  version="5.3.1"
  xsi:schemaLocation="http://www.crossref.org/schema/5.3.1 https://www.crossref.org/schemas/crossref5.3.1.xsd">
  <head>
    <doi_batch_id>${esc(batchId)}</doi_batch_id>
    <timestamp>${timestamp}</timestamp>
    <depositor>
      <depositor_name>${esc(opts.depositorName)}</depositor_name>
      <email_address>${esc(opts.depositorEmail)}</email_address>
    </depositor>
    <registrant>${esc(revista.publisher ?? opts.depositorName)}</registrant>
  </head>
  <body>
    <journal>
      <journal_metadata language="pt">
        <full_title>${esc(revista.title)}</full_title>
${revista.acronym ? `        <abbrev_title>${esc(revista.acronym)}</abbrev_title>\n` : ""}${
    revista.issn ? `        <issn media_type="electronic">${esc(revista.issn)}</issn>\n` : ""
  }      </journal_metadata>
      <journal_issue>
${dataXml(edicao.publishedAt, edicao.year, "        ")}
${edicao.volume != null ? `        <journal_volume><volume>${edicao.volume}</volume></journal_volume>\n` : ""}${
    edicao.number != null ? `        <issue>${esc(edicao.number)}</issue>\n` : ""
  }      </journal_issue>
${corpoArtigos}
    </journal>
  </body>
</doi_batch>`;
}
