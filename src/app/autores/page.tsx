import type { Metadata } from "next";
import Link from "next/link";
import { autoresTop, panorama } from "@/lib/queries";
import { num } from "@/lib/text";

// Renderizada sob demanda, e não no build: o conteúdo muda quando a editoria
// publica, e o build não pode depender do banco já estar populado.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Autores",
  description: "Os autores com mais trabalhos publicados no acervo da revista.",
};

export default async function Autores() {
  const [autores, p] = await Promise.all([autoresTop(60), panorama()]);

  return (
    <>
      <header className="shell cabeca-pagina">
        <p className="eyebrow">Quem publica</p>
        <h1>Autores</h1>
        <p className="cabeca-pagina__linha">
          {num(p.autores)} pesquisadores assinam os {num(p.artigos)} artigos do acervo.
          Abaixo, os 60 com mais trabalhos publicados.
        </p>
      </header>

      <section className="shell" style={{ paddingBottom: "clamp(2rem, 5vw, 4rem)" }}>
        <div className="indice">
          {autores.map((a, i) => (
            <Link key={a.slug} href={`/autor/${a.slug}`} className="item">
              <span className="item__ordem">{String(i + 1).padStart(3, "0")}</span>
              <span>
                <span className="item__titulo" style={{ fontSize: "var(--step-1)" }}>{a.name}</span>
                {a.affiliation && <span className="item__autores">{a.affiliation}</span>}
              </span>
              <span className="item__lado">
                <span className="mono" style={{ color: "var(--ink-3)", whiteSpace: "nowrap" }}>
                  {num(a.articleCount)} artigos
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
