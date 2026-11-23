import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { paginaPorSlug, revista } from "@/lib/queries";
import { miniMarkdown, dataLonga } from "@/lib/text";

// Renderizada sob demanda, e não no build: o conteúdo muda quando a editoria
// publica, e o build não pode depender do banco já estar populado.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ pagina: string }> }): Promise<Metadata> {
  const { pagina } = await params;
  const p = await paginaPorSlug(pagina);
  if (!p) return { title: "Página não encontrada" };
  return { title: p.title, description: p.summary ?? undefined };
}

export default async function PaginaInstitucional({ params }: { params: Promise<{ pagina: string }> }) {
  const { pagina } = await params;
  const [p, r] = await Promise.all([paginaPorSlug(pagina), revista()]);
  if (!p) notFound();

  return (
    <>
      <header className="shell cabeca-pagina">
        <p className="eyebrow">{r.title}</p>
        <h1>{p.title}</h1>
        {p.summary && <p className="cabeca-pagina__linha">{p.summary}</p>}
      </header>

      <div className="shell"><hr className="horizonte" style={{ ["--sol" as string]: "15%" }} /></div>

      <section className="shell" style={{ paddingBlock: "clamp(2rem, 4vw, 3rem) clamp(2rem, 5vw, 4rem)" }}>
        <div className="prosa" dangerouslySetInnerHTML={{ __html: miniMarkdown(p.body) }} />

        {pagina === "templates" && r.templatesUrl && (
          <p style={{ marginTop: "2rem" }}>
            <a className="btn btn--solid" href={r.templatesUrl} rel="noreferrer">
              Baixar o modelo de artigo
            </a>
          </p>
        )}
        <p className="mono" style={{ color: "var(--ink-4)", fontSize: "var(--step--2)", marginTop: "3rem", paddingTop: "1rem", borderTop: "1px solid var(--rule)" }}>
          Última atualização desta página: {dataLonga(p.updatedAt)}
        </p>
      </section>
    </>
  );
}
