import { NextRequest } from "next/server";
import { db } from "@/lib/db";

/** Registra uma visualização de artigo. Chamado pelo navegador do leitor. */
export async function POST(req: NextRequest) {
  let corpo: { id?: string; tipo?: string };
  try {
    corpo = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }

  const id = String(corpo.id ?? "");
  const tipo = corpo.tipo === "download" ? "download" : "view";
  if (!id || id.length > 40) return new Response(null, { status: 400 });

  // rastreadores declarados não entram na contagem
  const ua = (req.headers.get("user-agent") ?? "").toLowerCase();
  if (/bot|crawler|spider|crawling|headless|preview|facebookexternalhit|slurp/.test(ua)) {
    return new Response(null, { status: 204 });
  }

  try {
    const dia = new Date().toISOString().slice(0, 10);
    await db.$transaction([
      db.accessLog.create({ data: { articleId: id, kind: tipo, day: dia } }),
      db.article.update({
        where: { id },
        data: tipo === "download" ? { downloadCount: { increment: 1 } } : { viewCount: { increment: 1 } },
      }),
    ]);
  } catch {
    // artigo inexistente ou corrida: a métrica nunca derruba a página
  }

  return new Response(null, { status: 204 });
}
