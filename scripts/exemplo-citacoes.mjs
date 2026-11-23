/**
 * Prepara os três estados da contagem de citações do Google Acadêmico em
 * artigos reais do acervo, para o protótipo poder ser navegado.
 *
 * Os valores são de demonstração e ficam marcados como tal: a página pública
 * mostra o aviso "valor de demonstração" junto do número, e o painel lista o
 * artigo com a etiqueta "exemplo". Para apagar tudo:
 *
 *     node scripts/exemplo-citacoes.mjs --limpar
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const LIMPAR = process.argv.includes("--limpar");
const SITE = process.env.SITE_URL || "http://localhost:4321";

const comum = {
  slug: true, title: true, doi: true, citationCount: true,
  issue: { select: { label: true } },
};

async function main() {
  if (LIMPAR) {
    const { count } = await db.article.updateMany({
      where: { scholarDemo: true },
      data: { scholarCount: null, scholarCheckedAt: null, scholarUrl: null,
              scholarById: null, scholarDemo: false },
    });
    console.log(`${count} ${count === 1 ? "artigo" : "artigos"} de demonstração limpos.`);
    return;
  }

  const editor = await db.user.findFirst({
    where: { roles: { some: { role: { in: ["editor", "editor_chefe", "admin"] } } } },
    select: { id: true, name: true },
  });

  // 1) contagem conferida, com lista de trabalhos citantes.
  //    Escolhe um artigo que o Crossref já mostra como citado, para o número
  //    de demonstração não ficar absurdo diante do que as bases registram.
  const conferido = await db.article.findFirst({
    where: { doi: { not: null }, citationCount: { gt: 0 }, scholarCount: null },
    orderBy: { citationCount: "desc" },
    select: comum,
  });

  // 2) conferido em zero: existe no Scholar, sem citações ainda.
  const zero = await db.article.findFirst({
    where: { doi: { not: null }, citationCount: 0, scholarCount: null,
             slug: { not: conferido?.slug ?? "" } },
    orderBy: { publishedAt: "desc" },
    select: comum,
  });

  // 3) sem conferência: fica como está, que já é o estado inicial.
  //    Preferimos um artigo sem DOI, que é o caso mais difícil de conferir.
  const semConferencia =
    (await db.article.findFirst({
      where: { doi: null, scholarCount: null },
      orderBy: { publishedAt: "desc" },
      select: comum,
    })) ??
    (await db.article.findFirst({
      where: { scholarCount: null, slug: { notIn: [conferido?.slug ?? "", zero?.slug ?? ""] } },
      orderBy: { publishedAt: "desc" },
      select: comum,
    }));

  if (!conferido || !zero || !semConferencia) {
    console.error("Acervo insuficiente para montar os três estados. Rode antes: npm run pipeline");
    process.exitCode = 1;
    return;
  }

  const hoje = new Date();
  const ontem = new Date(Date.now() - 86_400_000);

  await db.article.update({
    where: { slug: conferido.slug },
    data: {
      // número plausível: um pouco acima do que o Crossref registra, que é o
      // padrão real, porque o Scholar conta teses, anais e preprints
      scholarCount: conferido.citationCount + 4,
      scholarCheckedAt: hoje,
      scholarUrl: `https://scholar.google.com/scholar?cites=0000000000000000000&hl=pt-BR`,
      scholarById: editor?.id ?? null,
      scholarDemo: true,
    },
  });

  await db.article.update({
    where: { slug: zero.slug },
    data: {
      scholarCount: 0,
      scholarCheckedAt: ontem,
      scholarUrl: null,
      scholarById: editor?.id ?? null,
      scholarDemo: true,
    },
  });

  const linha = (rotulo, a, obs) => {
    console.log(`\n${rotulo}`);
    console.log(`  ${a.title.slice(0, 78)}`);
    console.log(`  ${a.issue?.label ?? "sem edição"} · ${a.doi ?? "sem DOI"}`);
    console.log(`  ${obs}`);
    console.log(`  público: ${SITE}/artigo/${a.slug}`);
    console.log(`  painel:  ${SITE}/painel/citacoes/${a.slug}`);
  };

  console.log("Três estados da contagem do Google Acadêmico, prontos para navegar:");
  linha("1. CONTAGEM CONFERIDA", conferido,
        `mostra ${conferido.citationCount + 4} citações, data de hoje e o link "Ver trabalhos que citaram"`);
  linha("2. ZERO CITAÇÕES", zero,
        "mostra 0, com a observação de que a conferência confirmou o registro sem citações");
  linha("3. SEM CONFERÊNCIA", semConferencia,
        'mostra "Contagem indisponível" e o botão de buscar no Google Acadêmico');

  console.log(`\nOs dois primeiros ficam marcados como demonstração.`);
  console.log(`Para apagar: node scripts/exemplo-citacoes.mjs --limpar`);
  if (!editor) console.log(`Nenhum editor cadastrado, então a conferência fica sem autor.`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => db.$disconnect());
