import type { Metadata } from "next";
import Link from "next/link";
import { arquivo, panorama, indices } from "@/lib/queries";
import CapaEdicao from "@/components/CapaEdicao";
import { revista } from "@/lib/queries";
import { num } from "@/lib/text";

// Renderizada sob demanda, e não no build: o conteúdo muda quando a editoria
// publica, e o build não pode depender do banco já estar populado.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Arquivo de edições",
  description: "Todas as edições publicadas, do primeiro volume à edição corrente, com o número de artigos de cada fascículo.",
};

export default async function Arquivo() {
  const [a, p, r, idx] = await Promise.all([arquivo(), panorama(), revista(), indices()]);

  return (
    <>
      <header className="shell cabeca-pagina">
        <p className="eyebrow">Acervo completo</p>
        <h1>Arquivo de edições</h1>
        <p className="cabeca-pagina__linha">
          {num(p.edicoes)} edições e {num(p.artigos)} artigos publicados desde {p.anoInicial ?? "2014"},
          com {num(idx.citacoes)} citações registradas no Crossref.
        </p>
      </header>

      <section className="shell" style={{ paddingBottom: "clamp(2.5rem, 5vw, 4.5rem)" }}>
        {a.anos.map((grupo) => (
          <div key={grupo.ano} className="ano">
            <div className="ano__cabeca">
              <h2 className="ano__num">{grupo.ano || "s.d."}</h2>
              <span className="ano__resumo">
                {num(grupo.edicoes.length)} {grupo.edicoes.length === 1 ? "edição" : "edições"}
                <span aria-hidden>·</span>
                {num(grupo.total)} artigos
              </span>
            </div>

            <div className="mural">
              {grupo.edicoes.map((e) => (
                <article key={e.id} className="mural__item">
                  <CapaEdicao revista={r.title} label={e.label} ano={e.year}
                              slug={e.slug} imagem={e.coverUrl} />
                  <Link className="mural__nome" href={`/edicao/${e.slug}`}>
                    {e.volume != null ? `v. ${e.volume}` : ""}
                    {e.number != null ? ` n. ${e.number}` : ""}
                  </Link>
                  <span className="mural__qtd">{num(e._count.articles)} artigos</span>
                </article>
              ))}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
