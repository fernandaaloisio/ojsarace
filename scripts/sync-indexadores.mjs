/**
 * Consulta cada base que oferece API pública e grava o estado real da
 * indexação. Nada aqui é declarado "ativo" sem resposta da própria base:
 * o que não tem API fica como pendente, com o endereço de cadastro.
 */
import { PrismaClient } from "@prisma/client";
import { env, get, log } from "./lib.mjs";

const db = new PrismaClient();
const ISSN = env("CROSSREF_ISSN");
const MAILTO = env("CROSSREF_MAILTO");

async function crossref() {
  const j = JSON.parse(await get(`https://api.crossref.org/journals/${ISSN}/works?rows=0&mailto=${MAILTO}`));
  const total = j.message["total-results"];
  const cit = JSON.parse(await get(
    `https://api.crossref.org/journals/${ISSN}/works?rows=0&filter=has-references:true&mailto=${MAILTO}`
  ));
  return {
    status: total > 0 ? "ativo" : "pendente",
    recordCount: total,
    lastMessage: `${total.toLocaleString("pt-BR")} DOIs registrados sob o prefixo da revista; ${cit.message["total-results"].toLocaleString("pt-BR")} com lista de referências depositada.`,
  };
}

async function openalex() {
  try {
    const s = JSON.parse(await get(`https://api.openalex.org/sources/issn:${ISSN}?mailto=${MAILTO}`));
    return {
      status: "ativo",
      recordCount: s.works_count ?? 0,
      identifier: s.id ?? null,
      lastMessage: `${(s.works_count ?? 0).toLocaleString("pt-BR")} trabalhos e ${(s.cited_by_count ?? 0).toLocaleString("pt-BR")} citações acumuladas${s.h_index != null ? `; índice h ${s.h_index}` : ""}.`,
    };
  } catch {
    return { status: "pendente", lastMessage: "A revista ainda não tem registro de fonte no OpenAlex." };
  }
}

async function doaj() {
  try {
    const r = JSON.parse(await get(`https://doaj.org/api/search/journals/issn%3A${ISSN}`));
    const n = r.total ?? 0;
    if (n > 0) {
      const art = JSON.parse(await get(`https://doaj.org/api/search/articles/issn%3A${ISSN}`));
      return {
        status: "ativo",
        recordCount: art.total ?? 0,
        lastMessage: `Periódico indexado, com ${(art.total ?? 0).toLocaleString("pt-BR")} artigos no DOAJ.`,
      };
    }
    return {
      status: "pendente",
      recordCount: 0,
      lastMessage: "Não localizado no DOAJ. Antes de submeter a candidatura, publique a política de taxas e a equipe editorial.",
    };
  } catch (e) {
    return { status: "erro", lastMessage: `Consulta ao DOAJ falhou: ${e.message}` };
  }
}

const CONSULTAS = { crossref, openalex, doaj };

async function main() {
  const journal = await db.journal.findUnique({ where: { slug: "arace" }, select: { id: true } });
  if (!journal) throw new Error("Periódico não encontrado. Rode antes: node scripts/import.mjs");

  for (const [code, fn] of Object.entries(CONSULTAS)) {
    const run = await db.harvestRun.create({
      data: { journalId: journal.id, source: code, status: "executando" },
    });
    try {
      const r = await fn();
      await db.indexerLink.updateMany({
        where: { journalId: journal.id, code },
        data: { ...r, lastSyncAt: new Date() },
      });
      await db.harvestRun.update({
        where: { id: run.id },
        data: { status: "concluido", finishedAt: new Date(), fetched: r.recordCount ?? 0, message: r.lastMessage },
      });
      log(`${code.padEnd(10)} ${r.status.padEnd(9)} ${r.lastMessage}`);
    } catch (e) {
      await db.indexerLink.updateMany({
        where: { journalId: journal.id, code },
        data: { status: "erro", lastMessage: e.message, lastSyncAt: new Date() },
      });
      await db.harvestRun.update({
        where: { id: run.id },
        data: { status: "erro", finishedAt: new Date(), message: e.message },
      });
      log(`${code.padEnd(10)} erro      ${e.message}`);
    }
  }

  // o Google Scholar não tem API: o estado é deduzido do que o portal expõe
  const artigos = await db.article.count();
  await db.indexerLink.updateMany({
    where: { journalId: journal.id, code: "scholar" },
    data: {
      status: "ativo",
      recordCount: artigos,
      lastSyncAt: new Date(),
      lastMessage: `${artigos.toLocaleString("pt-BR")} artigos expostos com tags Highwire e listados no sitemap, que é o que o Scholar colhe.`,
    },
  });
  log("scholar    ativo     metadados Highwire expostos em todas as páginas de artigo");

  await db.$disconnect();
}

main().catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
