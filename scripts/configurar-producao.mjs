/**
 * Prepara o banco de produção do zero, em um comando.
 *
 *   DATABASE_URL="postgresql://..." node scripts/configurar-producao.mjs
 *
 * Faz, em ordem: cria as tabelas, coleta o acervo (reaproveitando o que já
 * houver em data/), importa, publica o conteúdo institucional, enriquece
 * pelo OpenAlex e grava o estado real das bases indexadoras.
 *
 * É seguro repetir: a importação recria o acervo e os demais passos são
 * idempotentes. O que NÃO é seguro é apontar para um banco com submissões
 * em andamento, porque a importação limpa as tabelas do acervo.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ROOT, DATA, log } from "./lib.mjs";

const URL_BANCO = process.env.DATABASE_URL || process.env.NETLIFY_DB_URL;

if (!URL_BANCO) {
  console.error(`
Informe a string de conexão do banco de produção:

  DATABASE_URL="postgresql://..." node scripts/configurar-producao.mjs

No painel da Netlify ela fica em Project configuration > Data and storage >
Database, ou por linha de comando com: netlify database status --show-credentials
`);
  process.exit(1);
}

if (!/^postgres(ql)?:\/\//.test(URL_BANCO)) {
  console.error("a string de conexão não parece ser de Postgres; verifique o valor");
  process.exit(1);
}

// o schema precisa estar em modo Postgres, senão o db push cria SQLite
const schema = fs.readFileSync(path.join(ROOT, "prisma", "schema.prisma"), "utf8");
if (!schema.includes('provider = "postgresql"')) {
  console.error('o schema está em modo SQLite. Rode antes: npm run local:postgres');
  process.exit(1);
}

const env = { ...process.env, DATABASE_URL: URL_BANCO };

function passo(titulo, cmd, args) {
  log(`\n── ${titulo}`);
  const saida = execFileSync(cmd, args, {
    cwd: ROOT, env, encoding: "utf8", stdio: "pipe", maxBuffer: 128 * 1024 * 1024,
  });
  const linhas = saida.split("\n").filter((l) => l.trim());
  log(linhas.slice(-8).map((l) => "   " + l).join("\n"));
}

const temColeta =
  fs.existsSync(path.join(DATA, "oai.ndjson")) &&
  fs.existsSync(path.join(DATA, "crossref.ndjson"));

try {
  passo("criando as tabelas", "npx", ["prisma", "generate"]);
  passo("aplicando o schema no banco", "npx", ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"]);

  if (temColeta) {
    log("\n── coleta: reaproveitando os arquivos já baixados em data/");
  } else {
    passo("coletando o acervo do OJS (OAI-PMH)", "node", ["scripts/harvest-oai.mjs"]);
    passo("coletando os registros do Crossref", "node", ["scripts/harvest-crossref.mjs"]);
  }

  passo("importando o acervo", "node", ["scripts/import.mjs"]);
  passo("páginas institucionais e bases indexadoras", "node", ["scripts/seed-conteudo.mjs"]);
  passo("enriquecendo autoria pelo OpenAlex", "node", ["scripts/enriquecer-openalex.mjs"]);
  passo("conferindo o estado real das bases", "node", ["scripts/sync-indexadores.mjs"]);

  log(`
Banco de produção pronto.

Falta a conta da editoria. Sem senha no comando, a conta fica aguardando e a
senha é definida por você na tela "Criar conta" do site, com o mesmo e-mail:

  DATABASE_URL="..." node scripts/criar-editor.mjs "Editoria ARACÊ" contato@sevenevents.com.br
`);
} catch (e) {
  console.error(`\nfalhou em: ${e.message}`);
  if (e.stdout) console.error(String(e.stdout).split("\n").slice(-12).join("\n"));
  if (e.stderr) console.error(String(e.stderr).split("\n").slice(-12).join("\n"));
  process.exit(1);
}
