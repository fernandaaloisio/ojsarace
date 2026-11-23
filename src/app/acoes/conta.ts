"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { hashSenha, conferirSenha, abrirSessao, fecharSessao, limparSessoes, exigirUsuario } from "@/lib/auth";

export type EstadoForm = { erro?: string; ok?: string } | null;

const normalizarEmail = (s: unknown) => String(s ?? "").trim().toLowerCase();
const texto = (s: unknown) => String(s ?? "").trim();

/** Aceita "0000-0002-1825-0097" ou a URL completa. */
function normalizarOrcid(s: unknown): string | null {
  const v = texto(s).replace(/^https?:\/\/orcid\.org\//, "");
  if (!v) return null;
  return /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i.test(v) ? v.toUpperCase() : null;
}

export async function entrar(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const email = normalizarEmail(form.get("email"));
  const senha = String(form.get("senha") ?? "");
  const destino = texto(form.get("destino")) || "/painel";

  if (!email || !senha) return { erro: "Informe e-mail e senha." };

  const user = await db.user.findUnique({ where: { email } });
  // a mesma mensagem nos dois casos, para não revelar quais e-mails existem
  if (!user || !user.active || !(await conferirSenha(senha, user.passwordHash))) {
    return { erro: "E-mail ou senha incorretos." };
  }

  await limparSessoes();
  await abrirSessao(user.id, (await headers()).get("user-agent"));
  redirect(destino);
}

export async function criarConta(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const nome = texto(form.get("nome"));
  const email = normalizarEmail(form.get("email"));
  const senha = String(form.get("senha") ?? "");
  const senha2 = String(form.get("senha2") ?? "");
  const orcidBruto = texto(form.get("orcid"));

  if (nome.length < 3) return { erro: "Informe seu nome completo." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { erro: "E-mail inválido." };
  if (senha.length < 8) return { erro: "A senha precisa ter ao menos 8 caracteres." };
  if (senha !== senha2) return { erro: "As duas senhas não coincidem." };

  const orcid = orcidBruto ? normalizarOrcid(orcidBruto) : null;
  if (orcidBruto && !orcid) return { erro: "ORCID inválido. Use o formato 0000-0002-1825-0097." };

  const existente = await db.user.findUnique({ where: { email } });
  if (existente) {
    if (existente.passwordHash) return { erro: "Já existe uma conta com este e-mail. Use a tela de entrada." };
    // conta criada por convite de parecer: define a senha e mantém o histórico
    await db.user.update({
      where: { id: existente.id },
      data: { passwordHash: await hashSenha(senha), name: nome, orcid: orcid ?? existente.orcid },
    });
    await db.userRole.createMany({ data: [{ userId: existente.id, role: "autor" }] }).catch(() => {});
    await abrirSessao(existente.id, (await headers()).get("user-agent"));
    redirect("/painel");
  }

  const user = await db.user.create({
    data: {
      email,
      name: nome,
      passwordHash: await hashSenha(senha),
      orcid,
      affiliation: texto(form.get("afiliacao")) || null,
      country: texto(form.get("pais")) || null,
      roles: { create: [{ role: "autor" }] },
    },
  });

  await abrirSessao(user.id, (await headers()).get("user-agent"));
  redirect("/painel");
}

export async function sair() {
  await fecharSessao();
  redirect("/");
}

export async function atualizarPerfil(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const u = await exigirUsuario();
  const nome = texto(form.get("nome"));
  if (nome.length < 3) return { erro: "Informe seu nome completo." };

  const orcidBruto = texto(form.get("orcid"));
  const orcid = orcidBruto ? normalizarOrcid(orcidBruto) : null;
  if (orcidBruto && !orcid) return { erro: "ORCID inválido. Use o formato 0000-0002-1825-0097." };

  const expertise = texto(form.get("expertise"))
    .split(/[;,\n]/).map((s) => s.trim()).filter(Boolean);

  await db.user.update({
    where: { id: u.id },
    data: {
      name: nome,
      orcid,
      affiliation: texto(form.get("afiliacao")) || null,
      country: texto(form.get("pais")) || null,
      lattes: texto(form.get("lattes")) || null,
      bio: texto(form.get("bio")) || null,
      expertise: expertise.length ? JSON.stringify(expertise) : null,
    },
  });

  const novaSenha = String(form.get("novaSenha") ?? "");
  if (novaSenha) {
    if (novaSenha.length < 8) return { erro: "A nova senha precisa ter ao menos 8 caracteres." };
    if (novaSenha !== String(form.get("novaSenha2") ?? "")) return { erro: "As duas senhas não coincidem." };
    await db.user.update({ where: { id: u.id }, data: { passwordHash: await hashSenha(novaSenha) } });
  }

  // quem quer receber convites de parecer marca a opção e ganha o papel
  const querAvaliar = form.get("parecerista") === "on";
  if (querAvaliar) {
    await db.userRole.upsert({
      where: { userId_role: { userId: u.id, role: "parecerista" } },
      create: { userId: u.id, role: "parecerista" },
      update: {},
    });
  } else {
    await db.userRole.deleteMany({ where: { userId: u.id, role: "parecerista" } });
  }

  return { ok: "Perfil atualizado." };
}
