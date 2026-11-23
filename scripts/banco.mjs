/**
 * Alterna o banco do projeto entre o SQLite local e o Postgres de produção.
 *
 *   node scripts/banco.mjs sqlite     -> volta a rodar local, com o dev.db já populado
 *   node scripts/banco.mjs postgres   -> volta ao modo de produção
 *
 * O Prisma não aceita variável de ambiente no campo `provider`, por isso a
 * troca é feita reescrevendo o bloco datasource e regerando o cliente.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ROOT, log } from "./lib.mjs";

const alvo = (process.argv[2] || "").toLowerCase();
if (!["sqlite", "postgres", "postgresql"].includes(alvo)) {
  console.error("uso: node scripts/banco.mjs sqlite|postgres");
  process.exit(1);
}
const provider = alvo === "sqlite" ? "sqlite" : "postgresql";

const schemaPath = path.join(ROOT, "prisma", "schema.prisma");
const schema = fs.readFileSync(schemaPath, "utf8");
const trocado = schema.replace(
  /datasource db \{\s*provider = "[^"]+"/,
  `datasource db {\n  provider = "${provider}"`
);
if (trocado === schema && !schema.includes(`provider = "${provider}"`)) {
  console.error("não encontrei o bloco datasource no schema");
  process.exit(1);
}
fs.writeFileSync(schemaPath, trocado);

const envPath = path.join(ROOT, ".env");
if (fs.existsSync(envPath)) {
  const url = provider === "sqlite"
    ? '"file:./dev.db"'
    : '"postgresql://aurora:aurora@localhost:5432/aurora"';
  const env = fs.readFileSync(envPath, "utf8");
  fs.writeFileSync(
    envPath,
    env.replace(/^DATABASE_URL\s*=.*$/m, `DATABASE_URL=${url}`)
  );
}

log(`schema agora usa ${provider}`);
execFileSync("npx", ["prisma", "generate"], { cwd: ROOT, stdio: "pipe" });
log("cliente Prisma regerado");

if (provider === "sqlite") {
  const db = path.join(ROOT, "prisma", "dev.db");
  log(
    fs.existsSync(db)
      ? `banco local encontrado (${(fs.statSync(db).size / 1048576).toFixed(0)} MB): npm run dev já funciona`
      : "sem banco local ainda: rode npx prisma db push && npm run pipeline"
  );
} else {
  log("aponte DATABASE_URL para o Postgres de produção antes de rodar os scripts");
}
