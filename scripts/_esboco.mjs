import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
const db = new PrismaClient();

const edicao = await db.issue.findFirst({ where: { articles: { some: {} } }, orderBy: { rank: "desc" } });
const artigos = await db.article.findMany({
  where: { issueId: edicao.id }, orderBy: { elocationId: "asc" }, take: 9,
  select: { title: true, doi: true, elocationId: true, citationCount: true, language: true,
    authors: { orderBy: { position: "asc" }, select: { author: { select: { name: true } } } } },
});
const destaque = await db.article.findFirst({
  where: { issueId: edicao.id, abstract: { not: null }, citationCount: { gte: 0 } },
  orderBy: { elocationId: "asc" },
  include: { issue: true, section: true,
    authors: { orderBy: { position: "asc" }, include: { author: true } },
    keywords: { include: { keyword: true } } },
});
const anos = await db.issue.groupBy({ by: ["year"], where: { year: { not: null } }, _count: { _all: true }, orderBy: { year: "desc" } });
const porAno = [];
for (const a of anos) {
  const n = await db.article.count({ where: { issue: { year: a.year } } });
  if (n) porAno.push({ ano: a.year, edicoes: a._count._all, artigos: n });
}
const sub = await db.submission.findFirst({ include: { assignments: true, decisions: true, events: { orderBy: { createdAt: "asc" } } } });

const dados = {
  revista: await db.journal.findFirst({ select: { title: true, issn: true, doiPrefix: true, qualis: true, publisher: true, mission: true } }),
  numeros: {
    artigos: await db.article.count(),
    autores: await db.author.count(),
    edicoes: await db.issue.count(),
    palavras: await db.keyword.count(),
    citacoes: (await db.article.aggregate({ _sum: { citationCount: true } }))._sum.citationCount,
    orcid: await db.author.count({ where: { orcid: { not: null } } }),
    referencias: await db.reference.count(),
    comPdf: await db.article.count({ where: { pdfUrl: { not: null } } }),
  },
  edicao: { label: edicao.label, data: edicao.publishedAt?.toISOString().slice(0, 10),
    total: await db.article.count({ where: { issueId: edicao.id } }) },
  artigos: artigos.map((a) => ({ titulo: a.title, doi: a.doi, id: a.elocationId, cit: a.citationCount,
    idioma: a.language, autores: a.authors.map((x) => x.author.name) })),
  destaque: {
    titulo: destaque.title, resumo: destaque.abstract, doi: destaque.doi, id: destaque.elocationId,
    edicao: destaque.issue.label, secao: destaque.section?.name, idioma: destaque.language,
    data: destaque.publishedAt?.toISOString().slice(0, 10), cit: destaque.citationCount,
    autores: destaque.authors.map((x) => ({ nome: x.author.name, orcid: x.author.orcid, afil: x.affiliation })),
    palavras: destaque.keywords.map((k) => k.keyword.term),
  },
  anos: porAno,
  temas: (await db.keyword.findMany({ orderBy: { count: "desc" }, take: 44, select: { term: true, count: true } })),
  bases: (await db.indexerLink.findMany({ orderBy: { name: "asc" }, select: { name: true, kind: true, status: true, recordCount: true, lastMessage: true } })),
  submissao: sub && {
    code: sub.code, titulo: sub.title, status: sub.status, rodada: sub.round,
    pareceres: sub.assignments.map((a) => ({ status: a.status, rec: a.recommendation, scores: a.scores })),
    decisao: sub.decisions[0]?.decision,
    eventos: sub.events.map((e) => ({ tipo: e.type, texto: e.message.split("\n")[0], publico: e.publico,
      quando: e.createdAt.toISOString().slice(0, 10) })),
  },
};
fs.writeFileSync("/tmp/esboco.json", JSON.stringify(dados));
console.log("dados extraidos:", (fs.statSync("/tmp/esboco.json").size / 1024).toFixed(0), "KB");
console.log("edicao:", dados.edicao.label, dados.edicao.total, "artigos | destaque:", dados.destaque.titulo.slice(0, 50));
console.log("anos:", dados.anos.length, "| temas:", dados.temas.length, "| bases:", dados.bases.length);
await db.$disconnect();
