import { randomUUID } from "node:crypto";
import path from "node:path";
import { db } from "./db";
import { guardar, buscar } from "./armazenamento";
import { SITE_URL } from "./text";

export const MIMES_ACEITOS: Record<string, string> = {
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/msword": ".doc",
  "application/vnd.oasis.opendocument.text": ".odt",
  "application/pdf": ".pdf",
  "application/zip": ".zip",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "text/csv": ".csv",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
};

export const TAMANHO_MAX = 25 * 1024 * 1024; // 25 MB

export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Código legível da submissão: ARE-2026-0001, sequencial por ano. */
export async function proximoCodigo(): Promise<string> {
  const ano = new Date().getUTCFullYear();
  const chave = `submissao-${ano}`;
  // upsert + incremento atômico: dois envios simultâneos não recebem o mesmo número
  const c = await db.counter.upsert({
    where: { key: chave },
    create: { key: chave, value: 1 },
    update: { value: { increment: 1 } },
  });
  return `ARE-${ano}-${String(c.value).padStart(4, "0")}`;
}

export async function registrarEvento(opts: {
  submissionId: string;
  type: string;
  message: string;
  actorId?: string | null;
  publico?: boolean;
}) {
  await db.submissionEvent.create({
    data: {
      submissionId: opts.submissionId,
      type: opts.type,
      message: opts.message,
      actorId: opts.actorId ?? null,
      publico: opts.publico ?? true,
    },
  });
}

/** Grava o arquivo em disco com nome opaco e registra os metadados. */
export async function salvarArquivo(opts: {
  file: File;
  submissionId: string;
  kind: string;
  round: number;
  userId?: string | null;
}): Promise<{ ok: true } | { ok: false; erro: string }> {
  const { file } = opts;
  if (!file || file.size === 0) return { ok: false, erro: "Arquivo vazio." };
  if (file.size > TAMANHO_MAX) {
    return { ok: false, erro: `O arquivo tem ${formatarTamanho(file.size)}; o limite é ${formatarTamanho(TAMANHO_MAX)}.` };
  }

  const ext = MIMES_ACEITOS[file.type] ?? path.extname(file.name).toLowerCase();
  if (!Object.values(MIMES_ACEITOS).includes(ext)) {
    return { ok: false, erro: `Formato não aceito (${file.type || ext || "desconhecido"}). Envie .docx, .odt, .pdf, planilha, imagem ou .zip.` };
  }

  // o nome guardado é gerado aqui: o nome original nunca vira caminho de arquivo
  const storedName = `${randomUUID()}${ext}`;
  await guardar(storedName, Buffer.from(await file.arrayBuffer()), file.type || "application/octet-stream");

  await db.submissionFile.create({
    data: {
      submissionId: opts.submissionId,
      kind: opts.kind,
      originalName: file.name.slice(0, 200),
      storedName,
      mime: file.type || "application/octet-stream",
      size: file.size,
      round: opts.round,
      uploadedById: opts.userId ?? null,
    },
  });
  return { ok: true };
}

export async function lerArquivo(storedName: string): Promise<Buffer | null> {
  return buscar(storedName);
}

// ---------- notificações ----------

export async function enfileirarNotificacao(opts: {
  toEmail: string;
  toName: string;
  subject: string;
  body: string;
  kind: string;
  submissionId?: string | null;
}) {
  await db.notification.create({
    data: {
      toEmail: opts.toEmail,
      toName: opts.toName,
      subject: opts.subject,
      body: opts.body.trim(),
      kind: opts.kind,
      submissionId: opts.submissionId ?? null,
    },
  });
}

const assinatura = `
—
Equipe editorial da ARACÊ
New Science Publishers
${SITE_URL}`;

export const MENSAGENS = {
  submissaoRecebida: (nome: string, codigo: string, titulo: string) => ({
    subject: `Submissão ${codigo} recebida — ARACÊ`,
    body: `Prezado(a) ${nome},

Confirmamos o recebimento da sua submissão à revista ARACÊ.

Código: ${codigo}
Título: ${titulo}

O manuscrito passará primeiro por triagem editorial, em que conferimos escopo, formato e originalidade. Em seguida, se aprovado nessa etapa, segue para avaliação por pares em sistema duplo-cego, com no mínimo dois pareceristas.

Você pode acompanhar o andamento a qualquer momento em ${SITE_URL}/painel.
${assinatura}`,
  }),

  conviteParecer: (nome: string, titulo: string, resumo: string, prazo: string, link: string) => ({
    subject: `Convite para parecer — ARACÊ`,
    body: `Prezado(a) ${nome},

Convidamos você a emitir parecer sobre o manuscrito abaixo, submetido à revista ARACÊ.

Título: ${titulo}

Resumo: ${resumo}

Prazo para envio do parecer: ${prazo}

Para aceitar ou recusar o convite, e para enviar o parecer, acesse o endereço abaixo. Não é necessário criar conta.

${link}

A avaliação é duplo-cega: a identidade dos autores não é revelada a você, nem a sua a eles. Caso haja qualquer conflito de interesse, pedimos que recuse o convite indicando o motivo.
${assinatura}`,
  }),

  lembreteParecer: (nome: string, prazo: string, link: string) => ({
    subject: `Lembrete: parecer com prazo em ${prazo} — ARACÊ`,
    body: `Prezado(a) ${nome},

Este é um lembrete sobre o parecer que você aceitou emitir para a ARACÊ. O prazo é ${prazo}.

${link}

Se precisar de mais tempo, responda a esta mensagem.
${assinatura}`,
  }),

  decisao: (nome: string, codigo: string, titulo: string, decisao: string, mensagem: string) => ({
    subject: `Decisão editorial sobre ${codigo} — ARACÊ`,
    body: `Prezado(a) ${nome},

Comunicamos a decisão editorial sobre o manuscrito "${titulo}" (${codigo}).

Decisão: ${decisao}

${mensagem}

O acompanhamento completo, com os pareceres recebidos, está em ${SITE_URL}/painel.
${assinatura}`,
  }),

  triagemAprovada: (nome: string, codigo: string) => ({
    subject: `${codigo} aprovado na triagem — ARACÊ`,
    body: `Prezado(a) ${nome},

O manuscrito ${codigo} foi aprovado na triagem editorial e segue agora para avaliação por pares.
${assinatura}`,
  }),
} as const;
