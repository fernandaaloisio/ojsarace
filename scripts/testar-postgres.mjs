/**
 * Valida a portabilidade do schema e do importador para Postgres, sem
 * depender de banco hospedado: sobe um Postgres local descartável, aplica o
 * schema com o Prisma e roda a importação real sobre ele.
 *
 *   node scripts/testar-postgres.mjs
 */
import { execFileSync } from "node:child_process";
import { NetlifyDB } from "@netlify/database-dev";
import { log } from "./lib.mjs";

import net from "node:net";

const db = new NetlifyDB();
// o motor escuta apenas em IPv6 ([::1]); "localhost" pode resolver para
// 127.0.0.1 e a conexao falha sem explicacao
const conexao = (await db.start()).replace("@localhost:", "@[::1]:");
const porta = Number(conexao.split(":").pop().split("/")[0]);

// espera a porta aceitar conexao antes de entregar ao Prisma
await new Promise((resolve, reject) => {
  const limite = Date.now() + 30000;
  (function tentar() {
    const s = net.connect({ host: "::1", port: porta });
    s.once("connect", () => { s.end(); resolve(); });
    s.once("error", () => {
      s.destroy();
      if (Date.now() > limite) reject(new Error("o Postgres de teste nao subiu"));
      else setTimeout(tentar, 400);
    });
  })();
});
log(`postgres de teste no ar na porta ${porta}`);

function rodar(cmd, args, extraEnv = {}) {
  return execFileSync(cmd, args, {
    env: { ...process.env, DATABASE_URL: conexao, ...extraEnv },
    stdio: "pipe",
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

try {
  log("aplicando o schema...");
  rodar("npx", ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"]);
  log("  schema aplicado sem erro");

  log("importando o acervo...");
  const saida = rodar("node", ["scripts/import.mjs"]);
  log(saida.split("\n").filter((l) => l.trim()).slice(-9).map((l) => "  " + l).join("\n"));

  log("conteúdo institucional e bases...");
  rodar("node", ["scripts/seed-conteudo.mjs"]);

  log("conferindo as consultas do portal...");
  const { PrismaClient } = await import("@prisma/client");
  const p = new PrismaClient({ datasourceUrl: conexao });

  const artigos = await p.article.count();
  const edicoes = await p.issue.count();
  const autores = await p.author.count();

  // a busca usa `contains` sobre searchBlob: no SQLite era LIKE sem acento,
  // no Postgres precisa continuar casando do mesmo jeito
  const busca = await p.article.count({ where: { searchBlob: { contains: "saude mental" } } });

  // groupBy e orderBy por relação são os pontos onde os dialetos costumam divergir
  const porIdioma = await p.article.groupBy({ by: ["language"], _count: { _all: true } });
  const atual = await p.issue.findFirst({
    where: { articles: { some: {} } },
    orderBy: { rank: "desc" },
    include: { _count: { select: { articles: true } } },
  });
  const comKeyword = await p.article.count({
    where: { keywords: { some: { keyword: { slug: { not: "" } } } } },
  });
  const paginas = await p.staticPage.count();
  const bases = await p.indexerLink.count();

  console.log(`
  artigos ............... ${artigos.toLocaleString("pt-BR")}
  edições ............... ${edicoes}
  autores ............... ${autores.toLocaleString("pt-BR")}
  busca "saude mental" .. ${busca.toLocaleString("pt-BR")} resultados
  idiomas ............... ${porIdioma.map((i) => `${i.language}=${i._count._all}`).join(" ")}
  edição corrente ....... ${atual?.label} com ${atual?._count.articles} artigos
  artigos com descritor . ${comKeyword.toLocaleString("pt-BR")}
  páginas institucionais  ${paginas}
  bases indexadoras ..... ${bases}
`);

  await p.$disconnect();
  log("Postgres validado: schema, importação e consultas do portal funcionam.");
} finally {
  await db.stop();
  log("postgres de teste encerrado");
}
