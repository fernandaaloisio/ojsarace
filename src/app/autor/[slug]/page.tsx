import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { autorPorSlug } from "@/lib/queries";
import ItemArtigo from "@/components/ItemArtigo";
import { num } from "@/lib/text";

// Renderizada sob demanda, e não no build: o conteúdo muda quando a editoria
// publica, e o build não pode depender do banco já estar populado.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const d = await autorPorSlug(slug);
  if (!d) return { title: "Autor não encontrado" };
  return {
    title: d.autor.name,
    description: `${num(d.artigos.length)} artigos publicados por ${d.autor.name} na revista.`,
  };
}

export default async function Autor({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await autorPorSlug(slug);
  if (!d) notFound();
  const { autor, artigos, citacoes, afiliacoes, coautores } = d;

  const anos = artigos.map((a) => a.publishedAt?.getUTCFullYear()).filter(Boolean) as number[];
  const periodo = anos.length ? `${Math.min(...anos)}–${Math.max(...anos)}` : null;

  return (
    <>
      <header className="shell cabeca-pagina">
        <p className="eyebrow">
          <Link href="/autores" style={{ color: "var(--ink-3)" }}>Autores</Link>
          <span aria-hidden>·</span>
          Perfil de autoria
        </p>
        <h1>{autor.name}</h1>

        {afiliacoes.length > 0 && (
          <p className="cabeca-pagina__linha" style={{ fontSize: "var(--step-0)" }}>
            {afiliacoes.join(" · ")}
          </p>
        )}

        <div className="filtros" style={{ paddingTop: "1.25rem" }}>
          {autor.orcid && (
            <a className="tag" href={`https://orcid.org/${autor.orcid}`} rel="noreferrer"
               style={{ borderColor: "var(--moss)", color: "var(--moss)" }}>
              ORCID {autor.orcid}
            </a>
          )}
          {autor.lattes && <a className="tag" href={autor.lattes} rel="noreferrer">Currículo Lattes</a>}
          <Link className="tag" href={`/busca?q=${encodeURIComponent(autor.name)}`}>Buscar o nome no acervo</Link>
        </div>
      </header>

      <section className="shell" style={{ paddingBottom: "clamp(2rem, 5vw, 4rem)" }}>
        <div className="numeros" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", maxWidth: "40rem", marginBottom: "2.5rem" }}>
          <div className="numeros__item" style={{ borderRight: "1px solid var(--rule)", paddingRight: "1.25rem" }}>
            <span className="numeros__valor">{num(artigos.length)}</span>
            <span className="numeros__rotulo">Artigos</span>
          </div>
          <div className="numeros__item" style={{ borderRight: "1px solid var(--rule)", padding: "1rem 1.25rem 1.1rem" }}>
            <span className="numeros__valor">{num(citacoes)}</span>
            <span className="numeros__rotulo">Citações</span>
          </div>
          <div className="numeros__item" style={{ paddingLeft: "1.25rem" }}>
            <span className="numeros__valor" style={{ fontSize: "var(--step-3)" }}>{periodo ?? "—"}</span>
            <span className="numeros__rotulo">Período</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 15rem)", gap: "clamp(1.5rem, 4vw, 3.5rem)", alignItems: "start" }}>
          <div>
            <p className="eyebrow" style={{ marginBottom: "1.25rem" }}>Publicações</p>
            <div className="indice">
              {artigos.map((a, i) => <ItemArtigo key={a.id} artigo={a} ordem={i + 1} mostrarEdicao />)}
            </div>
          </div>

          {coautores.length > 0 && (
            <aside>
              <p className="eyebrow" style={{ marginBottom: "1.1rem" }}>Coautoria</p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.6rem" }}>
                {coautores.map((c) => (
                  <li key={c.slug} style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", borderBottom: "1px solid var(--rule-soft)", paddingBottom: "0.5rem" }}>
                    <Link href={`/autor/${c.slug}`} style={{ fontSize: "var(--step--1)" }}>{c.name}</Link>
                    <span className="mono" style={{ fontSize: "var(--step--2)", color: "var(--ink-4)" }}>{c.n}</span>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </div>
      </section>
    </>
  );
}
