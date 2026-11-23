/**
 * Cria ou promove uma conta de editor.
 *
 *   node scripts/criar-editor.mjs "Nome Completo" email@dominio.com senha
 *
 * Se a conta já existir, apenas acrescenta o papel de editor (e troca a senha,
 * se uma for informada). O hash é o mesmo scrypt usado pelo login.
 */
import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";
import { PrismaClient } from "@prisma/client";

const scrypt = promisify(scryptCb);
const db = new PrismaClient();

async function hashSenha(senha) {
  const salt = randomBytes(16);
  const derivada = await scrypt(senha.normalize("NFKC"), salt, 64);
  return ["scrypt", salt.toString("hex"), derivada.toString("hex")].join("$");
}

const [nome, email, senha] = process.argv.slice(2);

if (!nome || !email) {
  console.error('uso: node scripts/criar-editor.mjs "Nome Completo" email@dominio.com [senha]');
  process.exit(1);
}
if (senha && senha.length < 8) {
  console.error("a senha precisa ter ao menos 8 caracteres");
  process.exit(1);
}

const papeis = ["autor", "editor", "admin"];
const chave = email.trim().toLowerCase();

const existente = await db.user.findUnique({ where: { email: chave } });

const user = existente
  ? await db.user.update({
      where: { id: existente.id },
      data: { name: nome, ...(senha ? { passwordHash: await hashSenha(senha) } : {}), active: true },
    })
  : await db.user.create({
      data: { email: chave, name: nome, passwordHash: senha ? await hashSenha(senha) : null },
    });

for (const role of papeis) {
  await db.userRole.upsert({
    where: { userId_role: { userId: user.id, role } },
    create: { userId: user.id, role },
    update: {},
  });
}

console.log(`${existente ? "atualizada" : "criada"}: ${user.name} <${user.email}>`);
console.log(`papeis: ${papeis.join(", ")}`);
if (!senha && !user.passwordHash) {
  console.log("sem senha definida: use a tela de criar conta com este mesmo e-mail para definir uma.");
}

await db.$disconnect();
