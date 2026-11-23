import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { palavraPorSlug, listarArtigos } from "@/lib/queries";
import ItemArtigo from "@/components/ItemArtigo";
import Paginacao from "@/components/Paginacao";
import { num } from "@/lib/text";

// Renderizada sob demanda, e não no build: o conteúdo muda quando a editoria
// publica, e o build não pode depender do banco já estar populado.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const k = await palavraPorSlug(slug);
  if (!k) return { title: "Tema não encontrado" };
  return {
    title: `${k.term} — ${num(k.count)} artigos`,
    description: `Artigos publicados sobre ${k.term} na revista, em acesso aberto.`,
  };
}

export default async function Tema({
  params, searchParams,
}: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const k = await palavraPorSlug(slug);
  if (!k) notFound();

  const res = await listarArtigos({
    palavra: slug,
    ordem: (sp.ordem as "recentes" | "citados") ?? "recentes",
    pagina: sp.pagina ? Number(sp.pagina) : 1,
    porPagina: 20,
  });

  return (
    <>
      <header className="shell cabeca-pagina">
        <p className="eyebrow">
          <Link href="/explorar" style={{ color: "var(--ink-3)" }}>Mapa de temas</Link>
          <span aria-hidden>·</span>
          Descritor
        </p>
        <h1>{k.term}</h1>
        <p className="mono" style={{ color: "var(--ink-3)", marginTop: "1rem" }}>
          {num(res.total)} {res.total === 1 ? "artigo" : "artigos"} no acervo
        </p>
        <div className="filtros" style={{ paddingTop: "1.25rem" }}>
          <Link className="tag" href={`/explorar/${slug}`}
                style={sp.ordem !== "citados" ? { borderColor: "var(--ember)", color: "var(--ember)" } : undefined}>
            Mais recentes
          </Link>
          <Link className="tag" href={`/explorar/${slug}?ordem=citados`}
                style={sp.ordem === "citados" ? { borderColor: "var(--ember)", color: "var(--ember)" } : undefined}>
            Mais citados
          </Link>
        </div>
      </header>

      <section className="shell" style={{ paddingBottom: "clamp(2rem, 5vw, 4rem)" }}>
        <div className="indice">
          {res.itens.map((a, i) => (
            <ItemArtigo key={a.id} artigo={a} ordem={(res.pagina - 1) * res.porPagina + i + 1} mostrarEdicao />
          ))}
        </div>
        <Paginacao pagina={res.pagina} paginas={res.paginas}
                   base={`/explorar/${slug}${sp.ordem ? `?ordem=${sp.ordem}` : ""}`} total={res.total} />
      </section>
    </>
  );
}
