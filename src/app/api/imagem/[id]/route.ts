import { db } from "@/lib/db";
import { buscar } from "@/lib/armazenamento";

/**
 * Serve as imagens da identidade visual (banner, logo, imagem institucional).
 * Ao contrário dos manuscritos, estas são públicas: fazem parte da capa da
 * revista. Ficam no mesmo armazenamento, e por isso passam por uma rota.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const img = await db.siteImage.findUnique({ where: { id } });
  if (!img) return new Response("Imagem não encontrada.", { status: 404 });

  const conteudo = await buscar(img.storedName);
  if (!conteudo) return new Response("Imagem indisponível.", { status: 404 });

  return new Response(new Uint8Array(conteudo), {
    headers: {
      "Content-Type": img.mime,
      "Content-Length": String(conteudo.length),
      // a imagem só muda quando a equipe troca, e a troca gera outro id
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
