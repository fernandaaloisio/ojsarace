"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/auth";
import { registrarEvento } from "@/lib/editorial";
import { CRITERIOS, RECOMENDACOES } from "@/lib/fluxo";

export type EstadoForm = { erro?: string; ok?: string } | null;

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/** Busca o convite pelo token em claro vindo da URL. */
export async function convitePorToken(token: string) {
  if (!token || token.length < 20) return null;
  return db.reviewAssignment.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      submission: {
        select: {
          id: true, code: true, title: true, subtitle: true, abstract: true,
          keywords: true, language: true, tipo: true, sectionCode: true, round: true, status: true,
          // os autores NÃO são expostos, e o manuscrito identificado também
          // não: o parecerista só recebe a versão anonimizada e os anexos
          files: {
            where: { kind: { in: ["anonimizado", "suplementar"] } },
            orderBy: { uploadedAt: "desc" },
            select: { id: true, kind: true, originalName: true, size: true, round: true },
          },
        },
      },
    },
  });
}

export async function responderConvite(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const token = texto(form, "token");
  const acao = texto(form, "acao");

  const a = await convitePorToken(token);
  if (!a) return { erro: "Convite não encontrado ou já expirado." };
  if (a.status !== "convidado") return { erro: "Este convite já foi respondido." };

  if (acao === "recusar") {
    const motivo = texto(form, "motivo");
    await db.reviewAssignment.update({
      where: { id: a.id },
      data: { status: "recusado", respondedAt: new Date(), declineReason: motivo || null },
    });
    await registrarEvento({
      submissionId: a.submissionId, type: "convite-recusado", publico: false,
      message: `${a.reviewerName} recusou o convite.${motivo ? `\nMotivo: ${motivo}` : ""}`,
    });
    revalidatePath(`/parecer/${token}`);
    return { ok: "Convite recusado. Obrigado pela resposta." };
  }

  await db.reviewAssignment.update({
    where: { id: a.id },
    data: { status: "aceito", respondedAt: new Date() },
  });
  await registrarEvento({
    submissionId: a.submissionId, type: "convite-aceito", publico: false,
    message: `${a.reviewerName} aceitou avaliar o manuscrito.`,
  });

  revalidatePath(`/parecer/${token}`);
  return { ok: "Convite aceito. O formulário de parecer está liberado abaixo." };
}

export async function enviarParecer(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const token = texto(form, "token");

  const a = await convitePorToken(token);
  if (!a) return { erro: "Convite não encontrado ou já expirado." };
  if (a.status === "concluido") return { erro: "Você já enviou este parecer." };
  if (a.status !== "aceito") return { erro: "Aceite o convite antes de enviar o parecer." };

  const recommendation = texto(form, "recomendacao");
  if (!(recommendation in RECOMENDACOES)) return { erro: "Escolha uma recomendação." };

  const commentsToAuthor = texto(form, "autores");
  if (commentsToAuthor.length < 100) {
    return { erro: "O parecer para os autores precisa ser fundamentado: escreva ao menos um parágrafo consistente." };
  }

  const scores: Record<string, number> = {};
  for (const c of CRITERIOS) {
    const n = Number(texto(form, `nota-${c.chave}`));
    if (n >= 1 && n <= 5) scores[c.chave] = n;
  }

  await db.reviewAssignment.update({
    where: { id: a.id },
    data: {
      status: "concluido",
      completedAt: new Date(),
      recommendation,
      commentsToAuthor,
      commentsToEditor: texto(form, "editor") || null,
      scores: Object.keys(scores).length ? JSON.stringify(scores) : null,
    },
  });

  await registrarEvento({
    submissionId: a.submissionId, type: "parecer", publico: false,
    message: `Parecer recebido de ${a.reviewerName}. Recomendação: ${RECOMENDACOES[recommendation as keyof typeof RECOMENDACOES]}.`,
  });

  // quando todos os convites ativos da rodada foram entregues, a submissão
  // passa a aguardar a decisão editorial
  const pendentes = await db.reviewAssignment.count({
    where: { submissionId: a.submissionId, round: a.round, status: { in: ["convidado", "aceito"] } },
  });
  const concluidos = await db.reviewAssignment.count({
    where: { submissionId: a.submissionId, round: a.round, status: "concluido" },
  });
  if (pendentes === 0 && concluidos >= 2) {
    await db.submission.update({
      where: { id: a.submissionId },
      data: { status: "aguardando_decisao" },
    });
    await registrarEvento({
      submissionId: a.submissionId, type: "pareceres-completos",
      message: "Pareceres concluídos. Aguardando decisão editorial.",
    });
  }

  revalidatePath(`/parecer/${token}`);
  revalidatePath("/painel");
  return { ok: "Parecer enviado. Obrigado pela colaboração." };
}
