import { db } from "./db";
import { ABERTOS, STATUS, type Status } from "./fluxo";
import type { Usuario } from "./auth";

export const resumoSubmissao = {
  id: true, code: true, title: true, status: true, round: true,
  submittedAt: true, dueAt: true, decisionAt: true, sectionCode: true, language: true,
  authors: { orderBy: { position: "asc" as const }, select: { name: true, isCorresponding: true } },
  _count: { select: { assignments: true } },
} as const;

/** Submissões de que o usuário é o autor submetente. */
export async function minhasSubmissoes(userId: string) {
  return db.submission.findMany({
    where: { submittedById: userId },
    orderBy: { submittedAt: "desc" },
    select: resumoSubmissao,
  });
}

/** Convites de parecer do usuário, pelo e-mail ou pela conta vinculada. */
export async function meusPareceres(u: Usuario) {
  return db.reviewAssignment.findMany({
    where: {
      OR: [{ reviewerId: u.id }, { reviewerEmail: u.email }],
      status: { notIn: ["cancelado"] },
    },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
    select: {
      id: true, status: true, dueAt: true, round: true, invitedAt: true,
      completedAt: true, recommendation: true,
      submission: { select: { code: true, title: true, sectionCode: true } },
    },
  });
}

/** Fila editorial com filtro por situação. */
export async function filaEditorial(filtro?: string) {
  const where =
    filtro === "todas" ? {}
    : filtro && filtro !== "abertas" ? { status: filtro }
    : { status: { in: ABERTOS as string[] } };

  return db.submission.findMany({
    where,
    orderBy: [{ submittedAt: "asc" }],
    select: resumoSubmissao,
    take: 200,
  });
}

/** Contagem por situação, para o rail e os filtros. */
export async function contagensEditorial() {
  const linhas = await db.submission.groupBy({ by: ["status"], _count: { _all: true } });
  const mapa = Object.fromEntries(linhas.map((l) => [l.status, l._count._all])) as Record<string, number>;
  const abertas = ABERTOS.reduce((s, st) => s + (mapa[st] ?? 0), 0);
  const total = linhas.reduce((s, l) => s + l._count._all, 0);
  return { porStatus: mapa, abertas, total };
}

/** Pareceres aceitos cujo prazo já venceu. */
export async function pareceresAtrasados() {
  return db.reviewAssignment.findMany({
    where: { status: { in: ["convidado", "aceito"] }, dueAt: { lt: new Date() } },
    orderBy: { dueAt: "asc" },
    select: {
      id: true, reviewerName: true, reviewerEmail: true, dueAt: true, status: true,
      submission: { select: { code: true, title: true } },
    },
  });
}

export async function mensagensPendentes() {
  return db.notification.count({ where: { status: "pendente" } });
}

/** Detalhe completo da submissão. `comoEditor` libera o que o autor não vê. */
export async function submissaoPorCodigo(code: string) {
  return db.submission.findUnique({
    where: { code },
    include: {
      authors: { orderBy: { position: "asc" } },
      files: { orderBy: [{ round: "desc" }, { uploadedAt: "desc" }] },
      assignments: { orderBy: [{ round: "desc" }, { invitedAt: "asc" }] },
      decisions: { orderBy: { createdAt: "desc" }, include: { editor: { select: { name: true } } } },
      events: { orderBy: { createdAt: "desc" }, include: { actor: { select: { name: true } } } },
      submittedBy: { select: { id: true, name: true, email: true } },
      notifications: { orderBy: { createdAt: "desc" } },
    },
  });
}

export type Submissao = NonNullable<Awaited<ReturnType<typeof submissaoPorCodigo>>>;

export function situacaoCor(status: string): string {
  return STATUS[status as Status]?.cor ?? "var(--ink-4)";
}

export function situacaoRotulo(status: string): string {
  return STATUS[status as Status]?.rotulo ?? status;
}
