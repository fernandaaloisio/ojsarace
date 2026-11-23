"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { exigirUsuario } from "@/lib/auth";
import { proximoCodigo, registrarEvento, salvarArquivo, enfileirarNotificacao, MENSAGENS } from "@/lib/editorial";

export type EstadoForm = { erro?: string; ok?: string } | null;

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/** Os autores vêm como campos repetidos autor-nome, autor-email, etc. */
function lerAutores(form: FormData) {
  const nomes = form.getAll("autor-nome").map(String);
  const emails = form.getAll("autor-email").map(String);
  const orcids = form.getAll("autor-orcid").map(String);
  const afils = form.getAll("autor-afiliacao").map(String);
  const paises = form.getAll("autor-pais").map(String);
  const titulacoes = form.getAll("autor-titulacao").map(String);
  const correspondente = Number(form.get("autor-correspondente") ?? 0);

  return nomes
    .map((nome, i) => ({
      name: nome.trim(),
      email: (emails[i] ?? "").trim().toLowerCase(),
      orcid: (orcids[i] ?? "").trim().replace(/^https?:\/\/orcid\.org\//, "") || null,
      affiliation: (afils[i] ?? "").trim() || null,
      country: (paises[i] ?? "").trim() || null,
      titulacao: (titulacoes[i] ?? "").trim() || null,
      position: i,
      isCorresponding: i === correspondente,
    }))
    .filter((a) => a.name.length > 2);
}

export async function submeter(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const u = await exigirUsuario();

  const title = texto(form, "titulo");
  const abstract = texto(form, "resumo");
  const keywords = texto(form, "palavras");
  const manuscrito = form.get("manuscrito") as File | null;

  // ---- validações que espelham as diretrizes para autores ----
  if (title.length < 10) return { erro: "Informe o título completo do manuscrito." };
  const palavrasResumo = abstract.split(/\s+/).filter(Boolean).length;
  if (palavrasResumo < 100) return { erro: `O resumo tem ${palavrasResumo} palavras; as diretrizes pedem de 150 a 250.` };
  if (palavrasResumo > 350) return { erro: `O resumo tem ${palavrasResumo} palavras; as diretrizes pedem de 150 a 250.` };

  const listaPalavras = keywords.split(";").map((s) => s.trim()).filter(Boolean);
  if (listaPalavras.length !== 3) {
    return { erro: `As diretrizes pedem exatamente 3 palavras-chave separadas por ponto e vírgula; você informou ${listaPalavras.length}.` };
  }

  const autores = lerAutores(form);
  if (!autores.length) return { erro: "Informe ao menos um autor." };
  const semEmail = autores.find((a) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a.email));
  if (semEmail) return { erro: `E-mail inválido para o autor ${semEmail.name}.` };
  if (!autores.some((a) => a.isCorresponding)) autores[0].isCorresponding = true;

  const correspondente = autores.find((a) => a.isCorresponding)!;
  if (!correspondente.orcid) return { erro: "O ORCID do autor correspondente é obrigatório." };

  if (!manuscrito || manuscrito.size === 0) return { erro: "Anexe o arquivo do manuscrito." };
  if (form.get("declaracao") !== "on") {
    return { erro: "É preciso declarar que o trabalho é inédito e não está em avaliação em outra revista." };
  }

  // ---- criação ----
  const code = await proximoCodigo();
  const submissao = await db.submission.create({
    data: {
      journalId: (await db.journal.findFirstOrThrow({ select: { id: true } })).id,
      code,
      title,
      subtitle: texto(form, "subtitulo") || null,
      abstract,
      keywords: listaPalavras.join("; "),
      language: texto(form, "idioma") || "pt",
      sectionCode: texto(form, "secao") || "ART",
      tipo: texto(form, "tipo") || "Artigo científico",
      mensagem: texto(form, "mensagem") || null,
      cep: texto(form, "cep") || null,
      financiamento: texto(form, "financiamento") || null,
      conflito: texto(form, "conflito") || null,
      declaraIA: texto(form, "ia") || null,
      submittedById: u.id,
      status: "submetido",
      authors: { create: autores },
    },
  });

  const anexados = await salvarArquivo({
    file: manuscrito, submissionId: submissao.id, kind: "manuscrito", round: 1, userId: u.id,
  });
  if (!anexados.ok) {
    // sem o manuscrito a submissão não existe: desfaz para não deixar registro órfão
    await db.submission.delete({ where: { id: submissao.id } });
    return { erro: anexados.erro };
  }

  for (const [campo, kind] of [["anonimizado", "anonimizado"], ["carta", "carta"], ["suplementar", "suplementar"]] as const) {
    const f = form.get(campo) as File | null;
    if (f && f.size > 0) {
      await salvarArquivo({ file: f, submissionId: submissao.id, kind, round: 1, userId: u.id });
    }
  }

  await registrarEvento({
    submissionId: submissao.id,
    type: "submissao",
    message: `Manuscrito submetido por ${u.name}.`,
    actorId: u.id,
  });

  const msg = MENSAGENS.submissaoRecebida(correspondente.name, code, title);
  await enfileirarNotificacao({
    toEmail: correspondente.email, toName: correspondente.name,
    kind: "submissao-recebida", submissionId: submissao.id, ...msg,
  });

  redirect(`/painel/submissao/${code}?novo=1`);
}

/** Envio da versão reformulada, depois de ajustes solicitados. */
export async function enviarVersaoNova(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const u = await exigirUsuario();
  const code = texto(form, "code");

  const s = await db.submission.findUnique({ where: { code }, include: { authors: true } });
  if (!s) return { erro: "Submissão não encontrada." };
  if (s.submittedById !== u.id) return { erro: "Esta submissão não é sua." };
  if (s.status !== "ajustes_solicitados") return { erro: "Esta submissão não está aguardando nova versão." };

  const arquivo = form.get("versao") as File | null;
  if (!arquivo || arquivo.size === 0) return { erro: "Anexe o arquivo da versão reformulada." };

  const resposta = texto(form, "resposta");
  if (resposta.length < 30) return { erro: "Descreva como cada apontamento dos pareceres foi atendido." };

  const round = s.round + 1;
  const salvo = await salvarArquivo({
    file: arquivo, submissionId: s.id, kind: "manuscrito", round, userId: u.id,
  });
  if (!salvo.ok) return { erro: salvo.erro };

  await db.submission.update({
    where: { id: s.id },
    data: { status: "em_reavaliacao", round, dueAt: null },
  });

  await registrarEvento({
    submissionId: s.id,
    type: "nova-versao",
    message: `Versão ${round} enviada pelos autores.\n\nResposta aos pareceres:\n${resposta}`,
    actorId: u.id,
  });

  revalidatePath(`/painel/submissao/${code}`);
  return { ok: `Versão ${round} enviada. A editoria foi notificada.` };
}

export async function retirarSubmissao(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const u = await exigirUsuario();
  const code = texto(form, "code");
  const motivo = texto(form, "motivo");

  const s = await db.submission.findUnique({ where: { code } });
  if (!s || s.submittedById !== u.id) return { erro: "Submissão não encontrada." };
  if (["publicado", "recusado", "retirado"].includes(s.status)) {
    return { erro: "Esta submissão já está encerrada." };
  }

  await db.submission.update({ where: { id: s.id }, data: { status: "retirado", decisionAt: new Date() } });
  await db.reviewAssignment.updateMany({
    where: { submissionId: s.id, status: { in: ["convidado", "aceito"] } },
    data: { status: "cancelado" },
  });
  await registrarEvento({
    submissionId: s.id,
    type: "retirada",
    message: `Submissão retirada pelos autores.${motivo ? `\nMotivo: ${motivo}` : ""}`,
    actorId: u.id,
  });

  revalidatePath(`/painel/submissao/${code}`);
  return { ok: "Submissão retirada." };
}
