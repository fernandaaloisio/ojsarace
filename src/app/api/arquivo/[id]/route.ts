import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { usuarioAtual, ehEditor, hashToken } from "@/lib/auth";
import { lerArquivo } from "@/lib/editorial";

/**
 * Download de arquivo de submissão. Manuscrito em avaliação não é público:
 * passa por aqui e só sai para quem tem direito.
 *
 * - editoria: tudo
 * - autor submetente: tudo da própria submissão
 * - parecerista com convite ativo (?t=token): apenas a versão anonimizada
 *   e o material suplementar, para preservar o duplo-cego
 */

const LIBERADO_PARECERISTA = new Set(["anonimizado", "suplementar"]);

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const arquivo = await db.submissionFile.findUnique({
    where: { id },
    include: { submission: { select: { id: true, submittedById: true } } },
  });
  if (!arquivo) return new Response("Arquivo não encontrado.", { status: 404 });

  let autorizado = false;

  const u = await usuarioAtual();
  if (u && (ehEditor(u) || arquivo.submission.submittedById === u.id)) {
    autorizado = true;
  }

  if (!autorizado) {
    const token = req.nextUrl.searchParams.get("t");
    if (token && LIBERADO_PARECERISTA.has(arquivo.kind)) {
      const convite = await db.reviewAssignment.findUnique({
        where: { tokenHash: hashToken(token) },
        select: { submissionId: true, status: true },
      });
      autorizado =
        !!convite &&
        convite.submissionId === arquivo.submission.id &&
        ["convidado", "aceito", "concluido"].includes(convite.status);
    }
  }

  if (!autorizado) return new Response("Sem permissão para acessar este arquivo.", { status: 403 });

  const conteudo = await lerArquivo(arquivo.storedName);
  if (!conteudo) return new Response("Arquivo indisponível no armazenamento.", { status: 404 });

  // o nome original volta apenas em cabeçalho codificado; nada dele toca o disco
  const nomeSeguro = arquivo.originalName.replace(/[^\w .()-]/g, "_");

  return new Response(new Uint8Array(conteudo), {
    headers: {
      "Content-Type": arquivo.mime || "application/octet-stream",
      "Content-Length": String(conteudo.length),
      "Content-Disposition": `attachment; filename="${nomeSeguro}"; filename*=UTF-8''${encodeURIComponent(arquivo.originalName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
