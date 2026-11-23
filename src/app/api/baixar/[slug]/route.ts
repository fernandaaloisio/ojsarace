import { NextRequest } from "next/server";
import { db } from "@/lib/db";

/**
 * Download do PDF do artigo. Passa por aqui para que o download seja contado
 * antes de o leitor ser encaminhado ao arquivo. O PDF em si continua servido
 * pelo servidor onde está hospedado.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const a = await db.article.findUnique({ where: { slug }, select: { id: true, pdfUrl: true } });
  if (!a?.pdfUrl) return new Response("PDF não disponível para este artigo.", { status: 404 });

  const ua = (req.headers.get("user-agent") ?? "").toLowerCase();
  const robo = /bot|crawler|spider|crawling|headless|preview|facebookexternalhit|slurp/.test(ua);

  if (!robo) {
    try {
      const dia = new Date().toISOString().slice(0, 10);
      await db.$transaction([
        db.accessLog.create({ data: { articleId: a.id, kind: "download", day: dia } }),
        db.article.update({ where: { id: a.id }, data: { downloadCount: { increment: 1 } } }),
      ]);
    } catch {
      // a contagem nunca impede o download
    }
  }

  return Response.redirect(a.pdfUrl, 302);
}
