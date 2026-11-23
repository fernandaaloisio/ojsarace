"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { exigirEditor, novoToken } from "@/lib/auth";
import { registrarEvento, enfileirarNotificacao, MENSAGENS } from "@/lib/editorial";
import { DECISOES, DESTINO_DECISAO } from "@/lib/fluxo";
import { SITE_URL, recorte } from "@/lib/text";

export type EstadoForm = { erro?: string; ok?: string } | null;

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/** Triagem editorial: aprova para avaliação por pares ou recusa de plano. */
export async function triar(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const editor = await exigirEditor();
  const code = texto(form, "code");
  const acao = texto(form, "acao"); // aprovar | recusar
  const nota = texto(form, "nota");

  const s = await db.submission.findUnique({ where: { code }, include: { authors: true } });
  if (!s) return { erro: "Submissão não encontrada." };
  if (!["submetido", "em_triagem"].includes(s.status)) {
    return { erro: "Esta submissão já passou da triagem." };
  }

  if (acao === "recusar") {
    if (nota.length < 20) return { erro: "Escreva a justificativa da recusa para os autores." };
    await db.submission.update({ where: { id: s.id }, data: { status: "recusado", decisionAt: new Date(), triagemAt: new Date() } });
    await db.editorialDecision.create({
      data: { submissionId: s.id, round: s.round, editorId: editor.id, decision: "recusar", message: nota },
    });
    await registrarEvento({
      submissionId: s.id, type: "triagem-recusa", actorId: editor.id,
      message: `Recusado na triagem editorial.\n\n${nota}`,
    });
    const corresp = s.authors.find((a) => a.isCorresponding) ?? s.authors[0];
    if (corresp) {
      const msg = MENSAGENS.decisao(corresp.name, s.code, s.title, "Recusado na triagem editorial", nota);
      await enfileirarNotificacao({ toEmail: corresp.email, toName: corresp.name, kind: "decisao", submissionId: s.id, ...msg });
    }
    revalidatePath(`/painel/submissao/${code}`);
    return { ok: "Submissão recusada na triagem e autor notificado." };
  }

  await db.submission.update({
    where: { id: s.id },
    data: { status: "em_avaliacao", triagemAt: new Date() },
  });
  await registrarEvento({
    submissionId: s.id, type: "triagem-aprovada", actorId: editor.id,
    message: `Aprovado na triagem editorial e liberado para avaliação por pares.${nota ? `\n\n${nota}` : ""}`,
  });
  const corresp = s.authors.find((a) => a.isCorresponding) ?? s.authors[0];
  if (corresp) {
    const msg = MENSAGENS.triagemAprovada(corresp.name, s.code);
    await enfileirarNotificacao({ toEmail: corresp.email, toName: corresp.name, kind: "triagem", submissionId: s.id, ...msg });
  }

  revalidatePath(`/painel/submissao/${code}`);
  return { ok: "Aprovado na triagem. Agora convide os pareceristas." };
}

/** Convida um parecerista. O acesso é por token; conta é opcional. */
export async function convidarParecerista(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const editor = await exigirEditor();
  const code = texto(form, "code");
  const nome = texto(form, "nome");
  const email = texto(form, "email").toLowerCase();
  const dias = Math.min(120, Math.max(5, Number(texto(form, "prazo")) || 30));

  if (nome.length < 3) return { erro: "Informe o nome do parecerista." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { erro: "E-mail inválido." };

  const s = await db.submission.findUnique({ where: { code }, include: { authors: true } });
  if (!s) return { erro: "Submissão não encontrada." };

  // conflito de interesse evidente: parecerista que é autor do próprio manuscrito
  if (s.authors.some((a) => a.email === email)) {
    return { erro: "Este e-mail é de um dos autores do manuscrito." };
  }
  const jaConvidado = await db.reviewAssignment.findFirst({
    where: { submissionId: s.id, round: s.round, reviewerEmail: email, status: { notIn: ["cancelado", "recusado"] } },
  });
  if (jaConvidado) return { erro: "Este parecerista já foi convidado nesta rodada." };

  const { token, hash } = novoToken();
  const dueAt = new Date(Date.now() + dias * 86400000);

  // vincula a uma conta existente, se houver; senão cria uma sem senha,
  // para que o histórico de pareceres fique no mesmo lugar
  let reviewer = await db.user.findUnique({ where: { email } });
  if (!reviewer) {
    reviewer = await db.user.create({
      data: { email, name: nome, roles: { create: [{ role: "parecerista" }] } },
    });
  }

  await db.reviewAssignment.create({
    data: {
      submissionId: s.id, round: s.round, reviewerId: reviewer.id,
      reviewerName: nome, reviewerEmail: email, tokenHash: hash, dueAt,
    },
  });

  if (s.status !== "em_avaliacao" && s.status !== "em_reavaliacao") {
    await db.submission.update({ where: { id: s.id }, data: { status: "em_avaliacao" } });
  }
  await db.submission.update({ where: { id: s.id }, data: { dueAt } });

  const link = `${SITE_URL}/parecer/${token}`;
  const prazoTxt = dueAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });
  const msg = MENSAGENS.conviteParecer(nome, s.title, recorte(s.abstract, 700), prazoTxt, link);
  await enfileirarNotificacao({ toEmail: email, toName: nome, kind: "convite-parecer", submissionId: s.id, ...msg });

  await registrarEvento({
    submissionId: s.id, type: "convite", actorId: editor.id, publico: false,
    message: `Parecerista convidado: ${nome} (${email}). Prazo: ${prazoTxt}.`,
  });

  revalidatePath(`/painel/submissao/${code}`);
  return { ok: `Convite gerado para ${nome}. O link está na fila de mensagens.` };
}

export async function cancelarConvite(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const editor = await exigirEditor();
  const id = texto(form, "id");

  const a = await db.reviewAssignment.findUnique({ where: { id }, include: { submission: true } });
  if (!a) return { erro: "Convite não encontrado." };
  if (a.status === "concluido") return { erro: "Este parecer já foi entregue." };

  await db.reviewAssignment.update({ where: { id }, data: { status: "cancelado" } });
  await registrarEvento({
    submissionId: a.submissionId, type: "convite-cancelado", actorId: editor.id, publico: false,
    message: `Convite a ${a.reviewerName} cancelado.`,
  });

  revalidatePath(`/painel/submissao/${a.submission.code}`);
  return { ok: "Convite cancelado." };
}

export async function lembrarParecerista(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirEditor();
  const id = texto(form, "id");

  const a = await db.reviewAssignment.findUnique({ where: { id }, include: { submission: true } });
  if (!a) return { erro: "Convite não encontrado." };
  if (a.status === "concluido") return { erro: "Este parecer já foi entregue." };

  // o token em claro não é guardado; o lembrete aponta para o painel do parecerista
  const prazoTxt = a.dueAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });
  const msg = MENSAGENS.lembreteParecer(a.reviewerName, prazoTxt, `${SITE_URL}/painel`);
  await enfileirarNotificacao({
    toEmail: a.reviewerEmail, toName: a.reviewerName,
    kind: "lembrete", submissionId: a.submissionId, ...msg,
  });

  revalidatePath(`/painel/submissao/${a.submission.code}`);
  return { ok: `Lembrete enfileirado para ${a.reviewerName}.` };
}

/** Decisão editorial da rodada. */
export async function decidir(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const editor = await exigirEditor();
  const code = texto(form, "code");
  const decisao = texto(form, "decisao") as keyof typeof DECISOES;
  const mensagem = texto(form, "mensagem");

  if (!(decisao in DECISOES)) return { erro: "Escolha uma decisão." };
  if (mensagem.length < 30) return { erro: "Escreva a comunicação da decisão para os autores." };

  const s = await db.submission.findUnique({
    where: { code },
    include: { authors: true, assignments: { where: { status: "concluido" } } },
  });
  if (!s) return { erro: "Submissão não encontrada." };
  if (["publicado", "recusado", "retirado"].includes(s.status)) {
    return { erro: "Esta submissão já está encerrada." };
  }

  const destino = DESTINO_DECISAO[decisao];
  await db.submission.update({
    where: { id: s.id },
    data: {
      status: destino,
      decisionAt: new Date(),
      dueAt: destino === "ajustes_solicitados" ? new Date(Date.now() + 30 * 86400000) : null,
    },
  });
  await db.editorialDecision.create({
    data: { submissionId: s.id, round: s.round, editorId: editor.id, decision: decisao, message: mensagem },
  });
  // convites ainda abertos perdem o sentido depois da decisão
  await db.reviewAssignment.updateMany({
    where: { submissionId: s.id, round: s.round, status: { in: ["convidado", "aceito"] } },
    data: { status: "cancelado" },
  });

  await registrarEvento({
    submissionId: s.id, type: "decisao", actorId: editor.id,
    message: `Decisão da rodada ${s.round}: ${DECISOES[decisao]}.\n\n${mensagem}`,
  });

  const corresp = s.authors.find((a) => a.isCorresponding) ?? s.authors[0];
  if (corresp) {
    const msg = MENSAGENS.decisao(corresp.name, s.code, s.title, DECISOES[decisao], mensagem);
    await enfileirarNotificacao({ toEmail: corresp.email, toName: corresp.name, kind: "decisao", submissionId: s.id, ...msg });
  }

  revalidatePath(`/painel/submissao/${code}`);
  revalidatePath("/painel");
  return { ok: `Decisão registrada: ${DECISOES[decisao]}. O autor foi notificado.` };
}

/** Marca a mensagem como enviada depois que a editoria a despachou à mão. */
export async function marcarEnviada(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirEditor();
  const id = texto(form, "id");
  await db.notification.update({
    where: { id },
    data: { status: "enviada", sentAt: new Date() },
  });
  revalidatePath("/painel/mensagens");
  return { ok: "Marcada como enviada." };
}

export async function mudarStatus(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const editor = await exigirEditor();
  const code = texto(form, "code");
  const novo = texto(form, "status");

  const s = await db.submission.findUnique({ where: { code } });
  if (!s) return { erro: "Submissão não encontrada." };

  await db.submission.update({ where: { id: s.id }, data: { status: novo } });
  await registrarEvento({
    submissionId: s.id, type: "status", actorId: editor.id,
    message: `Situação alterada para "${novo}" pela editoria.`,
  });

  revalidatePath(`/painel/submissao/${code}`);
  return { ok: "Situação atualizada." };
}
