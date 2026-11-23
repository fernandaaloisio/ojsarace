import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { revista } from "@/lib/queries";
import { SITE_URL } from "@/lib/text";

/**
 * Servidor OAI-PMH 2.0 do portal.
 *
 * É o ponto por onde DOAJ, BASE, LA Referencia, Diadorim e o Google Scholar
 * colhem o acervo sem intervenção manual: basta cadastrar a baseURL
 * <SITE_URL>/api/oai em cada base uma única vez.
 *
 * Verbos: Identify, ListMetadataFormats, ListSets, ListIdentifiers,
 * ListRecords, GetRecord. Formato: oai_dc. Paginação por resumptionToken.
 */

const LOTE = 100;
const PREFIXO_ID = "oai:arace:";
const BASE_URL = `${SITE_URL}/api/oai`;

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/\u0000-\u0008|\u000b|\u000c|\u000e-\u001f/g, "");

const iso = (d: Date | null | undefined) => (d ?? new Date(0)).toISOString().replace(/\.\d{3}Z$/, "Z");

function envelope(req: string, corpo: string, verbo?: string, args: Record<string, string> = {}) {
  const attrs = Object.entries(args).map(([k, v]) => ` ${k}="${esc(v)}"`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
  <responseDate>${iso(new Date())}</responseDate>
  <request${verbo ? ` verb="${esc(verbo)}"` : ""}${attrs}>${esc(req)}</request>
${corpo}
</OAI-PMH>`;
}

function erro(req: string, codigo: string, msg: string, verbo?: string) {
  return xml(envelope(req, `  <error code="${esc(codigo)}">${esc(msg)}</error>`, verbo), 200);
}

const xml = (corpo: string, status = 200) =>
  new Response(corpo, {
    status,
    headers: {
      "Content-Type": 'text/xml; charset=utf-8',
      "Cache-Control": "public, max-age=1800, s-maxage=3600",
    },
  });

type Artigo = {
  slug: string; title: string; abstract: string | null; language: string;
  doi: string | null; publishedAt: Date | null; updatedAt: Date; pdfUrl: string | null;
  license: string | null; type: string;
  issue: { label: string; volume: number | null; number: string | null; year: number | null } | null;
  section: { code: string; name: string } | null;
  authors: { author: { name: string; orcid: string | null } }[];
  keywords: { keyword: { term: string } }[];
};

const selecao = {
  slug: true, title: true, abstract: true, language: true, doi: true,
  publishedAt: true, updatedAt: true, pdfUrl: true, license: true, type: true,
  issue: { select: { label: true, volume: true, number: true, year: true } },
  section: { select: { code: true, name: true } },
  authors: { orderBy: { position: "asc" as const }, select: { author: { select: { name: true, orcid: true } } } },
  keywords: { select: { keyword: { select: { term: true } } } },
} as const;

function cabecalho(a: Artigo) {
  return `      <header>
        <identifier>${PREFIXO_ID}${esc(a.slug)}</identifier>
        <datestamp>${iso(a.updatedAt)}</datestamp>
        <setSpec>arace</setSpec>
        <setSpec>arace:${esc(a.section?.code ?? "ART")}</setSpec>
      </header>`;
}

function dublinCore(a: Artigo, titulo: string, publisher: string, issn: string | null) {
  const l: string[] = [];
  const add = (tag: string, valor: unknown, attr = "") => {
    if (valor === null || valor === undefined || valor === "") return;
    l.push(`          <dc:${tag}${attr}>${esc(valor)}</dc:${tag}>`);
  };

  add("title", a.title, ` xml:lang="${esc(a.language)}"`);
  for (const x of a.authors) add("creator", x.author.name);
  for (const k of a.keywords) add("subject", k.keyword.term, ` xml:lang="${esc(a.language)}"`);
  add("description", a.abstract, ` xml:lang="${esc(a.language)}"`);
  add("publisher", publisher);
  add("date", a.publishedAt?.toISOString().slice(0, 10));
  add("type", a.type === "editorial" ? "info:eu-repo/semantics/editorial" : "info:eu-repo/semantics/article");
  add("type", "info:eu-repo/semantics/publishedVersion");
  add("format", "application/pdf");
  if (a.doi) add("identifier", `https://doi.org/${a.doi}`);
  add("identifier", `${SITE_URL}/artigo/${a.slug}`);
  add("source", `${titulo}; ${a.issue?.label ?? ""}`.trim());
  if (issn) add("source", issn);
  add("language", a.language);
  if (a.pdfUrl) add("relation", a.pdfUrl);
  add("rights", "info:eu-repo/semantics/openAccess");
  add("rights", a.license ?? "https://creativecommons.org/licenses/by/4.0/");

  return `        <oai_dc:dc xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/"
          xmlns:dc="http://purl.org/dc/elements/1.1/"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai_dc/ http://www.openarchives.org/OAI/2.0/oai_dc.xsd">
${l.join("\n")}
        </oai_dc:dc>`;
}

/** Token de retomada: deslocamento e filtros codificados em base64url. */
function lerToken(t: string): { skip: number; from?: string; until?: string; set?: string } | null {
  try {
    const o = JSON.parse(Buffer.from(t, "base64url").toString("utf8"));
    if (typeof o.skip !== "number" || o.skip < 0) return null;
    return o;
  } catch { return null; }
}
const gravarToken = (o: object) => Buffer.from(JSON.stringify(o), "utf8").toString("base64url");

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const verbo = sp.get("verb") ?? "";
  const pedido = BASE_URL;
  const r = await revista();

  if (!verbo) return erro(pedido, "badVerb", "O parâmetro verb é obrigatório.");

  // ---------- Identify ----------
  if (verbo === "Identify") {
    const primeiro = await db.article.findFirst({ orderBy: { updatedAt: "asc" }, select: { updatedAt: true } });
    return xml(envelope(pedido, `  <Identify>
    <repositoryName>${esc(r.title)}</repositoryName>
    <baseURL>${esc(BASE_URL)}</baseURL>
    <protocolVersion>2.0</protocolVersion>
    <adminEmail>contato@sevenevents.com.br</adminEmail>
    <earliestDatestamp>${iso(primeiro?.updatedAt)}</earliestDatestamp>
    <deletedRecord>no</deletedRecord>
    <granularity>YYYY-MM-DDThh:mm:ssZ</granularity>
    <description>
      <oai-identifier xmlns="http://www.openarchives.org/OAI/2.0/oai-identifier"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai-identifier http://www.openarchives.org/OAI/2.0/oai-identifier.xsd">
        <scheme>oai</scheme>
        <repositoryIdentifier>arace</repositoryIdentifier>
        <delimiter>:</delimiter>
        <sampleIdentifier>${PREFIXO_ID}exemplo-de-artigo</sampleIdentifier>
      </oai-identifier>
    </description>
  </Identify>`, verbo));
  }

  // ---------- ListMetadataFormats ----------
  if (verbo === "ListMetadataFormats") {
    return xml(envelope(pedido, `  <ListMetadataFormats>
    <metadataFormat>
      <metadataPrefix>oai_dc</metadataPrefix>
      <schema>http://www.openarchives.org/OAI/2.0/oai_dc.xsd</schema>
      <metadataNamespace>http://www.openarchives.org/OAI/2.0/oai_dc/</metadataNamespace>
    </metadataFormat>
  </ListMetadataFormats>`, verbo));
  }

  // ---------- ListSets ----------
  if (verbo === "ListSets") {
    const secoes = await db.section.findMany({ include: { _count: { select: { articles: true } } } });
    const itens = [
      `    <set><setSpec>arace</setSpec><setName>${esc(r.title)}</setName></set>`,
      ...secoes.filter((s) => s._count.articles > 0).map(
        (s) => `    <set><setSpec>arace:${esc(s.code)}</setSpec><setName>${esc(s.name)}</setName></set>`
      ),
    ];
    return xml(envelope(pedido, `  <ListSets>\n${itens.join("\n")}\n  </ListSets>`, verbo));
  }

  // ---------- GetRecord ----------
  if (verbo === "GetRecord") {
    const id = sp.get("identifier") ?? "";
    const prefix = sp.get("metadataPrefix");
    if (!id || !prefix) return erro(pedido, "badArgument", "identifier e metadataPrefix são obrigatórios.", verbo);
    if (prefix !== "oai_dc") return erro(pedido, "cannotDisseminateFormat", `Formato ${prefix} não suportado.`, verbo);
    if (!id.startsWith(PREFIXO_ID)) return erro(pedido, "idDoesNotExist", "Identificador fora deste repositório.", verbo);

    const a = await db.article.findUnique({ where: { slug: id.slice(PREFIXO_ID.length) }, select: selecao });
    if (!a) return erro(pedido, "idDoesNotExist", "Nenhum registro com este identificador.", verbo);

    return xml(envelope(pedido, `  <GetRecord>
    <record>
${cabecalho(a as Artigo)}
      <metadata>
${dublinCore(a as Artigo, r.title, r.publisher ?? "", r.issn)}
      </metadata>
    </record>
  </GetRecord>`, verbo, { identifier: id, metadataPrefix: prefix }));
  }

  // ---------- ListIdentifiers e ListRecords ----------
  if (verbo === "ListIdentifiers" || verbo === "ListRecords") {
    const tokenBruto = sp.get("resumptionToken");
    let skip = 0;
    let from = sp.get("from") ?? undefined;
    let until = sp.get("until") ?? undefined;
    let set = sp.get("set") ?? undefined;
    const prefix = tokenBruto ? "oai_dc" : sp.get("metadataPrefix");

    if (tokenBruto) {
      const t = lerToken(tokenBruto);
      if (!t) return erro(pedido, "badResumptionToken", "Token inválido ou expirado.", verbo);
      ({ skip, from, until, set } = { skip: t.skip, from: t.from, until: t.until, set: t.set });
    } else if (!prefix) {
      return erro(pedido, "badArgument", "metadataPrefix é obrigatório.", verbo);
    } else if (prefix !== "oai_dc") {
      return erro(pedido, "cannotDisseminateFormat", `Formato ${prefix} não suportado.`, verbo);
    }

    const where: Record<string, unknown> = {};
    if (from || until) {
      where.updatedAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(until ? { lte: new Date(until) } : {}),
      };
    }
    if (set && set !== "arace") {
      const codigo = set.split(":")[1];
      if (!codigo) return erro(pedido, "noSetHierarchy", "Set desconhecido.", verbo);
      where.section = { code: codigo };
    }

    const [total, itens] = await Promise.all([
      db.article.count({ where }),
      db.article.findMany({ where, orderBy: { id: "asc" }, skip, take: LOTE, select: selecao }),
    ]);

    if (!itens.length) {
      return erro(pedido, "noRecordsMatch", "Nenhum registro no intervalo solicitado.", verbo);
    }

    const restante = total - (skip + itens.length);
    const token = restante > 0
      ? `    <resumptionToken completeListSize="${total}" cursor="${skip}">${gravarToken({ skip: skip + LOTE, from, until, set })}</resumptionToken>`
      : `    <resumptionToken completeListSize="${total}" cursor="${skip}"></resumptionToken>`;

    const corpo = (itens as Artigo[]).map((a) =>
      verbo === "ListIdentifiers"
        ? cabecalho(a)
        : `    <record>
${cabecalho(a)}
      <metadata>
${dublinCore(a, r.title, r.publisher ?? "", r.issn)}
      </metadata>
    </record>`
    ).join("\n");

    const args: Record<string, string> = tokenBruto
      ? { resumptionToken: tokenBruto }
      : { metadataPrefix: "oai_dc", ...(set ? { set } : {}), ...(from ? { from } : {}), ...(until ? { until } : {}) };

    return xml(envelope(pedido, `  <${verbo}>\n${corpo}\n${token}\n  </${verbo}>`, verbo, args));
  }

  return erro(pedido, "badVerb", `Verbo ${verbo} não reconhecido.`);
}
