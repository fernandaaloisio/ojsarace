import type { Metadata } from "next";
import Link from "next/link";
import { palavrasTop, panorama } from "@/lib/queries";
import Constelacao from "@/components/Constelacao";
import { num } from "@/lib/text";

// Renderizada sob demanda, e não no build: o conteúdo muda quando a editoria
// publica, e o build não pode depender do banco já estar populado.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mapa de temas",
  description: "Os descritores mais frequentes do acervo, dimensionados pelo número de artigos em que aparecem.",
};

export default async function Explorar() {
  const [palavras, p] = await Promise.all([palavrasTop(90), panorama()]);

  return (
    <>
      <header className="shell cabeca-pagina">
        <p className="eyebrow">Explorar o acervo</p>
        <h1>Mapa de temas</h1>
        <p className="cabeca-pagina__linha">
          {num(p.palavras)} descritores diferentes aparecem nos {num(p.artigos)} artigos do acervo.
          O corpo de cada termo abaixo é proporcional ao número de trabalhos em que ele ocorre.
        </p>
      </header>

      <section className="shell" style={{ paddingBottom: "2rem" }}>
        <Constelacao termos={palavras.slice(0, 46)} altura={580} />
      </section>

      <section className="shell" style={{ paddingBottom: "clamp(2rem, 5vw, 4rem)" }}>
        <p className="eyebrow" style={{ marginBottom: "1.25rem" }}>Os 90 descritores mais frequentes</p>
        <div className="indice">
          {palavras.map((k, i) => (
            <Link key={k.slug} href={`/explorar/${k.slug}`} className="item" style={{ gridTemplateColumns: "5.5rem minmax(0, 1fr) auto" }}>
              <span className="item__ordem">{String(i + 1).padStart(3, "0")}</span>
              <span className="item__titulo" style={{ fontSize: "var(--step-1)" }}>{k.term}</span>
              <span className="mono" style={{ color: "var(--ink-3)", paddingTop: "0.35rem", whiteSpace: "nowrap" }}>
                {num(k.count)} artigos
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
