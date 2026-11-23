import { db } from "./db";
import { fold } from "./text";
import { cache } from "react";

export const JOURNAL_SLUG = "arace";

const itemSelect = {
  id: true, slug: true, title: true, abstract: true, doi: true, elocationId: true,
  firstPage: true, lastPage: true, language: true, publishedAt: true, pdfUrl: true,
  legacyUrl: true, citationCount: true, type: true,
  issue: { select: { slug: true, label: true, volume: true, number: true, year: true } },
  section: { select: { code: true, name: true } },
  authors: {
    orderBy: { position: "asc" as const },
    select: { position: true, author: { select: { slug: true, name: true, orcid: true } } },
  },
} as const;

export type ItemArtigo = Awaited<ReturnType<typeof listarArtigos>>["itens"][number];

export const revista = cache(async () => {
  const j = await db.journal.findUnique({ where: { slug: JOURNAL_SLUG } });
  if (!j) throw new Error("Periódico não encontrado. Rode: npm run import");
  return {
    ...j,
    areasLista: safeJson<string[]>(j.areas, []),
    idiomasLista: safeJson<string[]>(j.languages, []),
  };
});

function safeJson<T>(s: string | null, fallback: T): T {
  if (!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

export const panorama = cache(async () => {
  const [artigos, autores, edicoes, palavras, citacoes, ultima, primeiroAno] = await Promise.all([
    db.article.count(),
    db.author.count(),
    db.issue.count(),
    db.keyword.count(),
    db.article.aggregate({ _sum: { citationCount: true } }),
    db.issue.findFirst({
      where: { articles: { some: {} } },
      orderBy: [{ rank: "desc" }],
      select: { slug: true, label: true, volume: true, number: true, year: true, publishedAt: true,
                _count: { select: { articles: true } } },
    }),
    db.issue.findFirst({ where: { year: { not: null } }, orderBy: { year: "asc" }, select: { year: true } }),
  ]);
  return {
    artigos, autores, edicoes, palavras,
    citacoes: citacoes._sum.citationCount ?? 0,
    ultimaEdicao: ultima,
    anoInicial: primeiroAno?.year ?? null,
  };
});

/** Edicao corrente: a de maior volume/numero que tenha artigos. */
export const edicaoAtual = cache(async () => {
  const issue = await db.issue.findFirst({
    where: { articles: { some: {} } },
    orderBy: [{ rank: "desc" }],
  });
  if (!issue) return null;
  const artigos = await db.article.findMany({
    where: { issueId: issue.id },
    orderBy: [{ elocationId: "asc" }, { doi: "asc" }],
    select: itemSelect,
  });
  return { issue, artigos };
});

export const edicaoPorSlug = cache(async (slug: string) => {
  const issue = await db.issue.findFirst({ where: { slug }, include: { _count: { select: { articles: true } } } });
  if (!issue) return null;
  const artigos = await db.article.findMany({
    where: { issueId: issue.id },
    orderBy: [{ section: { code: "asc" } }, { elocationId: "asc" }, { doi: "asc" }],
    select: itemSelect,
  });
  return { issue, artigos };
});

/** Arquivo agrupado por ano, com a contagem usada na barra de cada edicao. */
export const arquivo = cache(async () => {
  const issues = await db.issue.findMany({
    orderBy: [{ rank: "desc" }],
    include: { _count: { select: { articles: true } } },
  });
  const comArtigos = issues.filter((i) => i._count.articles > 0);
  const maior = Math.max(1, ...comArtigos.map((i) => i._count.articles));
  const porAno = new Map<number, typeof comArtigos>();
  for (const i of comArtigos) {
    const ano = i.year ?? 0;
    if (!porAno.has(ano)) porAno.set(ano, []);
    porAno.get(ano)!.push(i);
  }
  return {
    maior,
    anos: [...porAno.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([ano, edicoes]) => ({
        ano,
        edicoes,
        total: edicoes.reduce((s, e) => s + e._count.articles, 0),
      })),
  };
});

export const artigoPorSlug = cache(async (slug: string) => {
  return db.article.findUnique({
    where: { slug },
    include: {
      issue: true,
      section: true,
      journal: true,
      authors: { orderBy: { position: "asc" }, include: { author: true } },
      keywords: { include: { keyword: true } },
      references: { orderBy: { position: "asc" } },
    },
  });
});

/** Artigos da mesma edicao e com palavras-chave em comum. */
export const relacionados = cache(async (articleId: string, keywordIds: string[], limite = 6) => {
  if (!keywordIds.length) return [];
  const vinculos = await db.articleKeyword.findMany({
    where: { keywordId: { in: keywordIds }, articleId: { not: articleId } },
    select: { articleId: true },
    take: 600,
  });
  const contagem = new Map<string, number>();
  for (const v of vinculos) contagem.set(v.articleId, (contagem.get(v.articleId) ?? 0) + 1);
  const ids = [...contagem.entries()].sort((a, b) => b[1] - a[1]).slice(0, limite).map(([id]) => id);
  if (!ids.length) return [];
  const artigos = await db.article.findMany({ where: { id: { in: ids } }, select: itemSelect });
  return ids.map((id) => artigos.find((a) => a.id === id)).filter(Boolean) as typeof artigos;
}); 

export type FiltroBusca = {
  q?: string;
  ano?: number;
  idioma?: string;
  secao?: string;
  palavra?: string;
  autor?: string;
  ordem?: "recentes" | "antigos" | "citados" | "relevancia";
  pagina?: number;
  porPagina?: number;
};

export async function listarArtigos(f: FiltroBusca) {
  const porPagina = Math.min(f.porPagina ?? 20, 100);
  const pagina = Math.max(1, f.pagina ?? 1);

  const where: Record<string, unknown> = {};
  const and: Record<string, unknown>[] = [];

  if (f.q?.trim()) {
    // searchBlob guardado sem acento e em minuscula: o SQLite nao tem
    // busca insensivel a acento, entao a comparacao e feita no mesmo formato
    for (const termo of fold(f.q).split(/\s+/).filter((t) => t.length > 1).slice(0, 6)) {
      and.push({ searchBlob: { contains: termo } });
    }
  }
  if (f.ano) and.push({ issue: { year: f.ano } });
  if (f.idioma) and.push({ language: f.idioma });
  if (f.secao) and.push({ section: { code: f.secao } });
  if (f.palavra) and.push({ keywords: { some: { keyword: { slug: f.palavra } } } });
  if (f.autor) and.push({ authors: { some: { author: { slug: f.autor } } } });
  if (and.length) where.AND = and;

  const orderBy =
    f.ordem === "antigos" ? [{ publishedAt: "asc" as const }]
    : f.ordem === "citados" ? [{ citationCount: "desc" as const }, { publishedAt: "desc" as const }]
    : [{ publishedAt: "desc" as const }, { id: "desc" as const }];

  const [total, itens] = await Promise.all([
    db.article.count({ where }),
    db.article.findMany({ where, orderBy, skip: (pagina - 1) * porPagina, take: porPagina, select: itemSelect }),
  ]);

  return { total, itens, pagina, porPagina, paginas: Math.max(1, Math.ceil(total / porPagina)) };
}

/** Facetas para a barra de filtros, calculadas sobre o acervo inteiro. */
export const facetas = cache(async () => {
  const [anos, idiomas, secoes] = await Promise.all([
    db.issue.groupBy({ by: ["year"], where: { year: { not: null } }, _count: { _all: true }, orderBy: { year: "desc" } }),
    db.article.groupBy({ by: ["language"], _count: { _all: true }, orderBy: { _count: { language: "desc" } } }),
    db.section.findMany({ include: { _count: { select: { articles: true } } } }),
  ]);
  return {
    anos: anos.map((a) => a.year as number),
    idiomas: idiomas.map((i) => ({ codigo: i.language, total: i._count._all })),
    secoes: secoes.filter((s) => s._count.articles > 0).map((s) => ({ codigo: s.code, nome: s.name, total: s._count.articles })),
  };
});

export const palavrasTop = cache(async (limite = 60) =>
  db.keyword.findMany({ orderBy: { count: "desc" }, take: limite, select: { slug: true, term: true, count: true } })
);

export const palavraPorSlug = cache(async (slug: string) =>
  db.keyword.findUnique({ where: { slug }, select: { slug: true, term: true, count: true } })
);

export const autorPorSlug = cache(async (slug: string) => {
  const autor = await db.author.findUnique({ where: { slug } });
  if (!autor) return null;
  const vinculos = await db.articleAuthor.findMany({
    where: { authorId: autor.id },
    select: { article: { select: itemSelect }, affiliation: true },
  });
  const artigos = vinculos
    .map((v) => v.article)
    .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0));
  const coautores = new Map<string, { slug: string; name: string; n: number }>();
  for (const a of artigos) {
    for (const x of a.authors) {
      if (x.author.slug === slug) continue;
      const atual = coautores.get(x.author.slug) ?? { slug: x.author.slug, name: x.author.name, n: 0 };
      atual.n += 1;
      coautores.set(x.author.slug, atual);
    }
  }
  return {
    autor,
    artigos,
    citacoes: artigos.reduce((s, a) => s + a.citationCount, 0),
    afiliacoes: [...new Set(vinculos.map((v) => v.affiliation).filter(Boolean))] as string[],
    coautores: [...coautores.values()].sort((a, b) => b.n - a.n).slice(0, 12),
  };
});

export const autoresTop = cache(async (limite = 40) =>
  db.author.findMany({ orderBy: { articleCount: "desc" }, take: limite,
    select: { slug: true, name: true, articleCount: true, orcid: true, affiliation: true } })
);

export const maisCitados = cache(async (limite = 8) =>
  db.article.findMany({ where: { citationCount: { gt: 0 } }, orderBy: { citationCount: "desc" }, take: limite, select: itemSelect })
);

export const paginaPorSlug = cache(async (slug: string) => {
  const j = await db.journal.findUnique({ where: { slug: JOURNAL_SLUG }, select: { id: true } });
  if (!j) return null;
  return db.staticPage.findUnique({ where: { journalId_slug: { journalId: j.id, slug } } });
});

export const paginasNav = cache(async () => {
  const j = await db.journal.findUnique({ where: { slug: JOURNAL_SLUG }, select: { id: true } });
  if (!j) return [];
  return db.staticPage.findMany({
    where: { journalId: j.id, nav: true },
    orderBy: { position: "asc" },
    select: { slug: true, title: true },
  });
});

export const indexadores = cache(async () => {
  const j = await db.journal.findUnique({ where: { slug: JOURNAL_SLUG }, select: { id: true } });
  if (!j) return [];
  return db.indexerLink.findMany({ where: { journalId: j.id }, orderBy: [{ kind: "asc" }, { name: "asc" }] });
});

export const ultimaColeta = cache(async () =>
  db.harvestRun.findFirst({ orderBy: { startedAt: "desc" } })
);

/** Serie anual de publicacoes, para o grafico do panorama. */
export const serieAnual = cache(async () => {
  const issues = await db.issue.findMany({
    where: { year: { not: null } },
    select: { year: true, _count: { select: { articles: true } } },
  });
  const porAno = new Map<number, number>();
  for (const i of issues) porAno.set(i.year as number, (porAno.get(i.year as number) ?? 0) + i._count.articles);
  return [...porAno.entries()].filter(([, n]) => n > 0).sort((a, b) => a[0] - b[0]).map(([ano, total]) => ({ ano, total }));
});

/** Todas as paginas institucionais, para o rodape. */
export const paginasTodas = cache(async () => {
  const j = await db.journal.findUnique({ where: { slug: JOURNAL_SLUG }, select: { id: true } });
  if (!j) return [];
  return db.staticPage.findMany({
    where: { journalId: j.id },
    orderBy: { position: "asc" },
    select: { slug: true, title: true },
  });
});

/** Artigos mais lidos, pelas visualizações registradas aqui somadas às
 *  herdadas do OJS. Enquanto não houver leitura registrada, o bloco cai
 *  para os mais citados — e a página diz qual critério está em uso. */
/** Ultimos artigos publicados, independente da edicao a que pertencem.
 *  A edicao atual mostra o indice fechado; esta lista mostra o que chegou
 *  por ultimo, que em fluxo continuo nem sempre e a mesma coisa. */
export const recentes = cache(async (limite = 6) => {
  return db.article.findMany({
    where: { publishedAt: { not: null } },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: limite,
    select: itemSelect,
  });
});

export const maisLidos = cache(async (limite = 5) => {
  const comLeitura = await db.article.count({ where: { OR: [{ viewCount: { gt: 0 } }, { legacyViews: { gt: 0 } }] } });

  if (comLeitura === 0) {
    const itens = await db.article.findMany({
      where: { citationCount: { gt: 0 } },
      orderBy: { citationCount: "desc" },
      take: limite,
      select: { slug: true, title: true, citationCount: true, viewCount: true, legacyViews: true,
                issue: { select: { label: true } } },
    });
    return { criterio: "citacoes" as const, itens };
  }

  const itens = await db.article.findMany({
    orderBy: [{ viewCount: "desc" }, { legacyViews: "desc" }],
    take: limite,
    select: { slug: true, title: true, citationCount: true, viewCount: true, legacyViews: true,
              issue: { select: { label: true } } },
  });
  return { criterio: "leituras" as const, itens };
});

/** Métricas de um artigo, já somando o que veio do OJS. */
export const metricasArtigo = cache(async (id: string) => {
  const a = await db.article.findUnique({
    where: { id },
    select: { viewCount: true, downloadCount: true, legacyViews: true, legacyDownloads: true,
              citationCount: true, citationSource: true, citationAt: true, doi: true, title: true,
              scholarCount: true, scholarCheckedAt: true, scholarUrl: true, scholarDemo: true },
  });
  if (!a) return null;

  // Serie diaria dos ultimos 30 dias, para o grafico do bloco de metricas.
  // AccessLog guarda o dia ja em texto AAAA-MM-DD, entao agrupar e barato.
  const inicio = new Date(Date.now() - 29 * 86_400_000);
  const diaInicio = inicio.toISOString().slice(0, 10);
  const registros = await db.accessLog.groupBy({
    by: ["day", "kind"],
    where: { articleId: id, day: { gte: diaInicio } },
    _count: { _all: true },
  });

  const porDia = new Map<string, { leituras: number; baixados: number }>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(inicio.getTime() + i * 86_400_000).toISOString().slice(0, 10);
    porDia.set(d, { leituras: 0, baixados: 0 });
  }
  for (const r of registros) {
    const alvo = porDia.get(r.day);
    if (!alvo) continue;
    if (r.kind === "download") alvo.baixados += r._count._all;
    else alvo.leituras += r._count._all;
  }
  const serie = [...porDia.entries()].map(([dia, v]) => ({ dia, ...v }));

  // Onde este artigo esta na distribuicao de citacoes da revista. Diz mais
  // que o numero cru: 12 citacoes pode ser muito ou pouco conforme o acervo.
  const [totalComDoi, abaixo] = await Promise.all([
    db.article.count({ where: { doi: { not: null } } }),
    db.article.count({ where: { doi: { not: null }, citationCount: { lt: a.citationCount } } }),
  ]);
  const percentil = totalComDoi > 0 ? Math.round((abaixo / totalComDoi) * 100) : null;

  return {
    serie,
    percentil,
    totalComDoi,
    visualizacoes: a.viewCount + a.legacyViews,
    downloads: a.downloadCount + a.legacyDownloads,
    // Crossref, colhido por script: fica como dado secundario, declarado.
    crossref: a.citationCount,
    crossrefFonte: a.citationSource,
    crossrefEm: a.citationAt,
    temDoi: Boolean(a.doi),
    doi: a.doi,
    titulo: a.title,
    // Google Academico, conferido a mao pela editoria.
    scholar: a.scholarCount,
    scholarEm: a.scholarCheckedAt,
    scholarUrl: a.scholarUrl,
    scholarDemo: a.scholarDemo,
  };
});
