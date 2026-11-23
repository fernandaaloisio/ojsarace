import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "./db";
import type { Papel } from "./fluxo";

const scrypt = promisify(scryptCb) as (s: string, salt: Buffer, len: number) => Promise<Buffer>;

const COOKIE = "aurora_sessao";
const DURACAO_DIAS = 30;

// ---------- senha ----------

export async function hashSenha(senha: string): Promise<string> {
  const salt = randomBytes(16);
  const derivada = await scrypt(senha.normalize("NFKC"), salt, 64);
  return ["scrypt", salt.toString("hex"), derivada.toString("hex")].join("$");
}

export async function conferirSenha(senha: string, guardada: string | null): Promise<boolean> {
  if (!guardada) return false;
  const [algo, saltHex, hashHex] = guardada.split("$");
  if (algo !== "scrypt" || !saltHex || !hashHex) return false;
  const derivada = await scrypt(senha.normalize("NFKC"), Buffer.from(saltHex, "hex"), 64);
  const esperado = Buffer.from(hashHex, "hex");
  // comparação em tempo constante, para não vazar informação pelo tempo de resposta
  return derivada.length === esperado.length && timingSafeEqual(derivada, esperado);
}

// ---------- tokens ----------

export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

/** Par (token em claro, hash guardado). O claro só vai para o cookie ou o convite. */
export function novoToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

// ---------- sessão ----------

export async function abrirSessao(userId: string, userAgent?: string | null) {
  const { token, hash } = novoToken();
  const expiresAt = new Date(Date.now() + DURACAO_DIAS * 86400000);
  await db.session.create({ data: { tokenHash: hash, userId, expiresAt, userAgent: userAgent ?? null } });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  await db.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
}

export async function fecharSessao() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(COOKIE);
}

export type Usuario = {
  id: string;
  email: string;
  name: string;
  orcid: string | null;
  affiliation: string | null;
  papeis: Papel[];
};

/** Usuário da requisição corrente, ou null. Memoizado por requisição. */
export const usuarioAtual = cache(async (): Promise<Usuario | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  const sessao = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { roles: true } } },
  });
  if (!sessao || sessao.expiresAt < new Date() || !sessao.user.active) return null;

  return {
    id: sessao.user.id,
    email: sessao.user.email,
    name: sessao.user.name,
    orcid: sessao.user.orcid,
    affiliation: sessao.user.affiliation,
    papeis: sessao.user.roles.map((r) => r.role as Papel),
  };
});

export const temPapel = (u: Usuario | null, ...papeis: Papel[]) =>
  !!u && papeis.some((p) => u.papeis.includes(p));

export const ehEditor = (u: Usuario | null) => temPapel(u, "editor", "admin");

export async function exigirUsuario(): Promise<Usuario> {
  const u = await usuarioAtual();
  if (!u) throw new Error("NAO_AUTENTICADO");
  return u;
}

export async function exigirEditor(): Promise<Usuario> {
  const u = await exigirUsuario();
  if (!ehEditor(u)) throw new Error("SEM_PERMISSAO");
  return u;
}

/** Remove sessões vencidas. Chamado no login, sem precisar de agendador. */
export async function limparSessoes() {
  await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}
