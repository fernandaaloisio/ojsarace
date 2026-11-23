/**
 * Enriquecimento pelo OpenAlex: ORCID, afiliação institucional e país,
 * casados pelo DOI.
 *
 * NÃO toca na contagem de citações: o número mostrado ao leitor vem de uma
 * fonte só, o Crossref, que é onde os DOIs da revista são registrados.
 * Misturar as duas bases contaria a mesma citação duas vezes.
 *
 * O acervo herdado do OJS não traz ORCID nem afiliação (o depósito original
 * no Crossref foi feito sem esses campos). O OpenAlex agrega essas
 * informações de outras fontes, e é daí que elas vêm para cá.
 */
import { PrismaClient } from "@prisma/client";
import { env, get, log } from "./lib.mjs";

const db = new PrismaClient();
const ISSN = env("CROSSREF_ISSN");
const MAILTO = env("CROSSREF_MAILTO");
const POR_PAGINA = 200;

const limparOrcid = (u) => (u ? String(u).replace(/^https?:\/\/orcid\.org\//, "") : null);

async function main() {
  const journal = await db.journal.findUnique({ where: { slug: "arace" }, select: { id: true } });
  if (!journal) throw new Error("Periódico não encontrado. Rode antes: node scripts/import.mjs");

  const run = await db.harvestRun.create({
    data: { journalId: journal.id, source: "openalex", status: "executando" },
  });

  // índice local por DOI, para casar sem uma consulta por artigo
  const artigos = await db.article.findMany({
    where: { doi: { not: null } },
    select: {
      id: true, doi: true, citationCount: true,
      authors: { select: { authorId: true, position: true, affiliation: true, author: { select: { id: true, name: true, orcid: true } } } },
    },
  });
  const porDoi = new Map(artigos.map((a) => [a.doi, a]));
  log(`${porDoi.size} artigos com DOI no banco`);

  // O OpenAlex exige chave para paginacao por cursor; a paginacao por pagina
  // continua aberta e cobre ate 10.000 resultados, suficiente para o acervo.
  const CHAVE = env("OPENALEX_KEY", "");
  let cursor = CHAVE ? "*" : null;
  let pagina = 1;
  let lidos = 0;
  let orcids = 0;
  let afiliacoes = 0;
  const orcidPorAutor = new Map();
  const afilPorVinculo = [];

  for (;;) {
    const url =
      `https://api.openalex.org/works?filter=primary_location.source.issn:${ISSN}` +
      `&per-page=${POR_PAGINA}` +
      (cursor ? `&cursor=${encodeURIComponent(cursor)}` : `&page=${pagina}`) +
      `&mailto=${encodeURIComponent(MAILTO)}` +
      (CHAVE ? `&api_key=${encodeURIComponent(CHAVE)}` : "") +
      `&select=doi,cited_by_count,authorships`;

    const j = JSON.parse(await get(url));
    const itens = j.results || [];
    if (!itens.length) break;

    for (const w of itens) {
      lidos += 1;
      const doi = (w.doi || "").replace(/^https?:\/\/doi\.org\//, "").toLowerCase();
      const local = porDoi.get(doi);
      if (!local) continue;

      for (const [i, au] of (w.authorships || []).entries()) {
        // casa pela posição; o OpenAlex preserva a ordem de autoria
        const vinculo = local.authors.find((x) => x.position === i);
        if (!vinculo) continue;

        const orcid = limparOrcid(au.author?.orcid);
        if (orcid && !vinculo.author.orcid && !orcidPorAutor.has(vinculo.author.id)) {
          orcidPorAutor.set(vinculo.author.id, orcid);
          orcids += 1;
        }

        const inst = (au.institutions || []).map((x) => x.display_name).filter(Boolean).join("; ");
        if (inst && !vinculo.affiliation) {
          afilPorVinculo.push({ articleId: local.id, authorId: vinculo.authorId, inst });
          afiliacoes += 1;
        }
      }
    }

    const total = j.meta?.count ?? 0;
    log(`  ${lidos}/${total || "?"} trabalhos lidos`);
    if (cursor) {
      cursor = j.meta?.next_cursor;
      if (!cursor) break;
    } else {
      pagina += 1;
      // o limite da paginacao aberta e 10.000 registros
      if (lidos >= total || pagina * POR_PAGINA > 10000) break;
    }
  }

  log("gravando...");
  // o ORCID é único por autor, então grava um a um; o resto vai em lote
  for (const [autorId, orcid] of orcidPorAutor) {
    await db.author.update({ where: { id: autorId }, data: { orcid } }).catch(() => {});
  }
  for (let i = 0; i < afilPorVinculo.length; i += 500) {
    await db.$transaction(
      afilPorVinculo.slice(i, i + 500).map((v) =>
        db.articleAuthor.update({
          where: { articleId_authorId: { articleId: v.articleId, authorId: v.authorId } },
          data: { affiliation: v.inst },
        })
      )
    ).catch(() => {});
  }

  const msg = `${orcids} ORCID e ${afiliacoes} afiliações recuperados`;
  await db.harvestRun.update({
    where: { id: run.id },
    data: { status: "concluido", finishedAt: new Date(), fetched: lidos, updated: orcids + afiliacoes, message: msg },
  });
  log(`\n${msg}`);
  await db.$disconnect();
}

main().catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
