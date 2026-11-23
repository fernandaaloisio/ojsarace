/**
 * Cruza data/oai.ndjson com data/crossref.ndjson e grava o acervo no banco.
 *
 * O OAI do OJS da a espinha dorsal (resumo em portugues, palavras-chave, PDF,
 * secao e rotulo da edicao). O Crossref completa o que o OAI nao expoe:
 * DOI, volume/numero normalizados, elocation, ORCID, referencias e citacoes.
 * O cruzamento e por DOI quando existe e por titulo canonico no resto.
 */
import { randomUUID as uuid } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { readNdjson, fold, titleKey, slugify, displayName, sortName, log } from "./lib.mjs";

const db = new PrismaClient();
const MAX_REFS = 80;

const SECTIONS = [
  { code: "ART", name: "Artigos" },
  { code: "EDT", name: "Editorial" },
  { code: "REV", name: "Revisoes" },
  { code: "REL", name: "Relatos de caso" },
];

const AGORA = new Date();
const ANO_MAX = AGORA.getUTCFullYear() + 1;

/** O rotulo do OJS vem como "ARACE; Vol. 2 No. 2 (2015); 8-20": o volume esta
 *  no meio e as paginas no fim, por isso a varredura e no rotulo inteiro. */
function parseIssueLabel(label) {
  if (!label) return {};
  const vol = label.match(/(?:v\.|vol\.?|volume)\s*(\d+)/i);
  const num = label.match(/(?:n\.|no\.?|num\.?|n[uú]m\.?|n[uú]mero)\s*(\d+)/i);
  const year = label.match(/\((\d{4})\)/);
  const y = year ? Number(year[1]) : undefined;
  return {
    volume: vol ? Number(vol[1]) : undefined,
    number: num ? num[1] : undefined,
    year: y && y >= 2010 && y <= ANO_MAX ? y : undefined,
  };
}

/** O sufixo do DOI (arev8n11-001) e a fonte mais confiavel de volume e numero:
 *  o campo volume/issue do Crossref esta trocado em boa parte do acervo. */
function parseDoiPattern(doi) {
  const m = (doi || "").match(/are?v(\d+)\s*n(\d+)/i);
  return m ? { volume: Number(m[1]), number: m[2] } : {};
}

/** O Crossref guarda o elocation da Arace no campo page ("e15187"). */
function splitPages(page) {
  const p = (page || "").trim();
  if (!p) return {};
  if (/^e\d+$/i.test(p)) return { elocationId: p.toLowerCase() };
  const [a, b] = p.split(/\s*-+\s*/);
  return { firstPage: a || null, lastPage: b || null };
}

function issueKey({ volume, number, year }) {
  if (volume == null && number == null && year == null) return null;
  return `v${volume ?? 0}-n${(number ?? "0").toString().toLowerCase()}-${year ?? 0}`;
}

function cleanAbstract(s) {
  if (!s) return null;
  const t = s
    .replace(/<jats:[^>]*>/g, " ")
    .replace(/<\/jats:[^>]*>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > 20 ? t : null;
}

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function insertMany(model, rows, size = 1000) {
  let done = 0;
  for (const part of chunk(rows, size)) {
    await db[model].createMany({ data: part });
    done += part.length;
  }
  log(`  ${model}: ${done}`);
}

async function main() {
  const oai = readNdjson("oai.ndjson");
  const cr = readNdjson("crossref.ndjson");
  if (!oai.length && !cr.length) throw new Error("rode a coleta antes: npm run harvest:oai && npm run harvest:crossref");
  log(`fontes: ${oai.length} registros OAI, ${cr.length} trabalhos Crossref`);

  log("limpando tabelas...");
  await db.$transaction([
    db.reference.deleteMany(), db.articleKeyword.deleteMany(), db.articleAuthor.deleteMany(),
    db.article.deleteMany(), db.keyword.deleteMany(), db.author.deleteMany(),
    db.issue.deleteMany(), db.section.deleteMany(), db.staticPage.deleteMany(),
    db.boardMember.deleteMany(), db.indexerLink.deleteMany(), db.harvestRun.deleteMany(),
    db.journal.deleteMany(),
  ]);

  // ---------- periodico ----------
  const journalId = uuid();
  await db.journal.create({
    data: {
      id: journalId,
      slug: "arace",
      title: "ARACÊ",
      acronym: "ARE",
      issn: "2358-2472",
      doiPrefix: "10.56238",
      publisher: "New Science Publishers",
      qualis: "B1",
      periodicity: "Fluxo contínuo com fechamento mensal",
      openAccess: true,
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      legacyBaseUrl: "https://periodicos.newsciencepubl.com/arace",
      oaiBaseUrl: "https://periodicos.newsciencepubl.com/arace/pt_BR/oai",
      description:
        "A ARACÊ é uma revista científica interdisciplinar de acesso aberto, avaliada com Qualis CAPES B1 no quadriênio 2021-2024. Publica em fluxo contínuo, com fechamento mensal de edições, textos em português, inglês e espanhol.",
      mission:
        "Dar circulação ampla e permanente à pesquisa produzida no Brasil, sem barreira de acesso para quem lê e com avaliação por pares rigorosa para quem publica.",
      areas: JSON.stringify([
        "Interdisciplinar", "Ciências Sociais Aplicadas", "Ciências Humanas", "Ciências da Saúde",
        "Ciências Biológicas", "Ciências Agrárias", "Engenharias", "Ciências Exatas e da Terra",
        "Artes", "Arquitetura", "Educação e Ensino",
      ]),
      languages: JSON.stringify(["Português", "Inglês", "Espanhol"]),
      accentHue: 28,
    },
  });

  const sectionIds = new Map();
  for (const s of SECTIONS) {
    const id = uuid();
    sectionIds.set(s.code, id);
    await db.section.create({ data: { id, code: s.code, name: s.name } });
  }

  // ---------- indices Crossref ----------
  const crByDoi = new Map();
  const crByTitle = new Map();
  for (const w of cr) {
    if (w.type && w.type !== "journal-article") continue;   // o proprio periodico tem DOI
    if (w.doi) crByDoi.set(w.doi.toLowerCase(), w);
    const k = titleKey(w.title);
    if (k && !crByTitle.has(k)) crByTitle.set(k, w);
  }

  const used = new Set();
  const issues = new Map();     // key -> row
  const authors = new Map();    // slug -> row
  const keywords = new Map();   // normal -> row
  const articles = [];
  const articleAuthors = [];
  const articleKeywords = [];
  const references = [];
  const slugTaken = new Set();
  const assignedDoi = new Set();

  function uniqueSlug(base, hint) {
    let s = base;
    if (slugTaken.has(s) && hint) s = `${base}-${slugify(hint, 24)}`;
    let i = 2;
    while (slugTaken.has(s)) s = `${base}-${i++}`;
    slugTaken.add(s);
    return s;
  }

  function getIssue(parts, legacyUrl) {
    const key = issueKey(parts);
    if (!key) return null;
    if (!issues.has(key)) {
      const label = [
        parts.volume != null ? `v. ${parts.volume}` : null,
        parts.number != null ? `n. ${parts.number}` : null,
        parts.year != null ? `(${parts.year})` : null,
      ].filter(Boolean).join(" ") || key;
      const nNum = Number.parseInt(String(parts.number ?? "0"), 10);
      const rank = (parts.year ?? 0) * 10000 + (parts.volume ?? 0) * 100 + (Number.isNaN(nNum) ? 0 : nNum);
      issues.set(key, {
        id: uuid(), journalId, slug: key, label, rank,
        volume: parts.volume ?? null, number: parts.number != null ? String(parts.number) : null,
        year: parts.year ?? null, legacyUrl: legacyUrl ?? null, publishedAt: null,
      });
    }
    return issues.get(key);
  }

  function getAuthor({ name, orcid, affiliation }) {
    const disp = displayName(name);
    if (!disp || disp.length < 2) return null;
    const slug = slugify(disp, 70);
    if (!authors.has(slug)) {
      authors.set(slug, {
        id: uuid(), slug, name: disp, sortName: sortName(name),
        orcid: orcid ?? null, affiliation: affiliation ?? null, articleCount: 0,
      });
    }
    const a = authors.get(slug);
    if (!a.orcid && orcid) a.orcid = orcid;
    if (!a.affiliation && affiliation) a.affiliation = affiliation;
    a.articleCount += 1;
    return a;
  }

  const kwSlugs = new Set();
  function getKeyword(term) {
    const t = (term || "").replace(/\s+/g, " ").trim().replace(/[.;,]+$/, "");
    if (!t || t.length < 2 || t.length > 120) return null;
    const normal = fold(t);
    if (!keywords.has(normal)) {
      let slug = slugify(t, 70) || normal.slice(0, 60).replace(/[^a-z0-9]+/g, "-");
      let i = 2;
      while (kwSlugs.has(slug)) slug = `${slugify(t, 64)}-${i++}`;
      kwSlugs.add(slug);
      keywords.set(normal, { id: uuid(), slug, term: t, normal, count: 0 });
    }
    const k = keywords.get(normal);
    k.count += 1;
    return k;
  }

  function build(source, { oaiRec, crRec }) {
    const title = (oaiRec?.title || crRec?.title || "").replace(/\s+/g, " ").trim();
    if (!title) return;

    let doi = (crRec?.doi || oaiRec?.doi || null)?.toLowerCase() || null;
    if (doi && assignedDoi.has(doi)) doi = null;   // um DOI pertence a um unico registro
    if (doi) assignedDoi.add(doi);
    // ordem de confianca: padrao do DOI > rotulo do OJS > campos do Crossref
    const byDoi = parseDoiPattern(doi);
    const byLabel = parseIssueLabel(oaiRec?.sourceLabel);
    const crYear = crRec?.year && crRec.year >= 2010 && crRec.year <= ANO_MAX ? crRec.year : undefined;
    const parts = {
      volume: byDoi.volume ?? byLabel.volume ?? (crRec?.volume ? Number(crRec.volume) : undefined),
      number: byDoi.number ?? byLabel.number ?? crRec?.issue ?? undefined,
      year: byLabel.year ?? crYear,
    };
    const issue = getIssue(parts, oaiRec?.landingUrl);

    let published =
      (oaiRec?.date ? new Date(oaiRec.date) : null) ||
      (crRec?.year ? new Date(Date.UTC(crRec.year, (crRec.month ?? 1) - 1, crRec.day ?? 1)) : null);
    if (published && Number.isNaN(+published)) published = null;
    // datas adiantadas (ha registros com ano 2034 na origem) caem para o ano da edicao
    if (published && published.getUTCFullYear() > ANO_MAX) {
      published = parts.year ? new Date(Date.UTC(parts.year, 0, 1)) : null;
    }
    if (issue && published && (!issue.publishedAt || published < issue.publishedAt)) issue.publishedAt = published;

    const sectionCode = (oaiRec?.sets || []).map((s) => s.split(":")[1]).find((c) => sectionIds.has(c)) || "ART";
    const pag = splitPages(crRec?.page);

    const slugBase = slugify(title, 80);
    const slug = uniqueSlug(slugBase, doi ? doi.split("/").pop() : oaiRec?.oaiIdentifier?.split("/").pop());

    const id = uuid();
    const abstract = cleanAbstract(oaiRec?.abstract) || cleanAbstract(crRec?.abstract);

    // autores: Crossref primeiro (tem ORCID e afiliacao), OAI como reserva
    const srcAuthors = (crRec?.authors?.length ? crRec.authors : (oaiRec?.creators || []).map((n, i) => ({ name: n, position: i })));
    const names = [];
    const seenAuthor = new Set();
    srcAuthors.forEach((a, i) => {
      const row = getAuthor({ name: a.name || [a.given, a.family].filter(Boolean).join(" "), orcid: a.orcid, affiliation: a.affiliation });
      if (!row || seenAuthor.has(row.id)) return;
      seenAuthor.add(row.id);
      names.push(row.name);
      articleAuthors.push({
        articleId: id, authorId: row.id, position: a.position ?? i,
        role: "author", isCorresponding: a.sequence === "first" && i === 0,
        affiliation: a.affiliation ?? null,
      });
    });

    const terms = [];
    const seenKw = new Set();
    for (const s of oaiRec?.subjects || []) {
      const row = getKeyword(s);
      if (!row || seenKw.has(row.id)) continue;
      seenKw.add(row.id);
      terms.push(row.term);
      articleKeywords.push({ articleId: id, keywordId: row.id });
    }

    for (const r of (crRec?.references || []).slice(0, MAX_REFS)) {
      if (!r.doi && !r.unstructured) continue;
      references.push({
        id: uuid(), articleId: id, position: r.position ?? 0,
        doi: r.doi ?? null, unstructured: r.unstructured ?? null,
        year: r.year ? String(r.year) : null, journalTitle: r.journalTitle ?? null,
      });
    }

    articles.push({
      id, journalId, issueId: issue?.id ?? null, sectionId: sectionIds.get(sectionCode),
      slug, title, subtitle: crRec?.subtitle ?? null, abstract,
      language: (oaiRec?.language || crRec?.language || "pt").slice(0, 2).toLowerCase(),
      type: sectionCode === "EDT" ? "editorial" : "article",
      doi, elocationId: pag.elocationId ?? crRec?.elocationId ?? null,
      firstPage: pag.firstPage ?? null, lastPage: pag.lastPage ?? null,
      publishedAt: published && !Number.isNaN(+published) ? published : null,
      pdfUrl: oaiRec?.galleyUrls?.[0] ?? crRec?.pdfLink ?? null,
      legacyUrl: oaiRec?.landingUrl ?? crRec?.url ?? null,
      oaiIdentifier: oaiRec?.oaiIdentifier ?? null,
      license: crRec?.license ?? "https://creativecommons.org/licenses/by/4.0/",
      citationCount: crRec?.citationCount ?? 0,
      referenceCount: crRec?.referenceCount ?? 0,
      // fonte unica para o numero exibido ao leitor: somar bases contaria
      // a mesma citacao duas vezes
      citationSource: crRec ? "Crossref" : null,
      citationAt: crRec ? AGORA : null,
      searchBlob: fold([title, abstract, names.join(" "), terms.join(" ")].filter(Boolean).join(" ")).slice(0, 4000),
    });
  }

  log("cruzando fontes...");
  const seenDoi = new Set();
  for (const rec of oai) {
    const k = titleKey(rec.title);
    let match = rec.doi ? crByDoi.get(rec.doi.toLowerCase()) : null;
    if (!match && k) match = crByTitle.get(k);
    if (match?.doi) {
      if (seenDoi.has(match.doi.toLowerCase())) match = null;   // nao reusar o mesmo DOI
      else { used.add(match.doi.toLowerCase()); seenDoi.add(match.doi.toLowerCase()); }
    }
    build("oai", { oaiRec: rec, crRec: match || null });
  }
  let crOnly = 0;
  for (const w of cr) {
    if (w.type && w.type !== "journal-article") continue;
    if (!w.doi || used.has(w.doi.toLowerCase()) || seenDoi.has(w.doi.toLowerCase())) continue;
    seenDoi.add(w.doi.toLowerCase());
    crOnly += 1;
    build("crossref", { oaiRec: null, crRec: w });
  }
  log(`  ${articles.length} artigos (${crOnly} só do Crossref), ${issues.size} edições, ${authors.size} autores, ${keywords.size} palavras-chave`);

  log("gravando...");
  await insertMany("issue", [...issues.values()]);
  await insertMany("author", [...authors.values()]);
  await insertMany("keyword", [...keywords.values()]);
  await insertMany("article", articles, 500);
  await insertMany("articleAuthor", articleAuthors, 2000);
  await insertMany("articleKeyword", articleKeywords, 2000);
  await insertMany("reference", references, 2000);

  await db.harvestRun.create({
    data: {
      journalId, source: "oai+crossref", status: "concluido",
      finishedAt: new Date(), fetched: oai.length + cr.length,
      created: articles.length, updated: 0,
      message: `${issues.size} edicoes, ${authors.size} autores, ${keywords.size} palavras-chave, ${references.length} referencias`,
    },
  });

  await db.$disconnect();
  log("\nimportacao concluida.");
}

main().catch(async (e) => {
  console.error("falha na importacao:", e);
  await db.$disconnect();
  process.exit(1);
});
