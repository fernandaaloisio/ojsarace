import type { Metadata } from "next";
import Link from "next/link";
import { arquivo, panorama } from "@/lib/queries";
import { num } from "@/lib/text";

// Renderizada sob demanda, e não no build: o conteúdo muda quando a editoria
// publica, e o build não pode depender do banco já estar populado.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Arquivo de edições",
  description: "Todas as edições publicadas, do primeiro volume à edição corrente, com o número de artigos de cada fascículo.",
};

export default async function Arquivo() {
  const [a, p] = await Promise.all([arquivo(), panorama()]);

  return (
    <>
      <header className="shell cabeca-pagina">
        <p className="eyebrow">Acervo completo</p>
        <h1>Arquivo de edições</h1>
        <p className="cabeca-pagina__linha">
          {num(p.edicoes)} edições e {num(p.artigos)} artigos publicados desde {p.anoInicial ?? "2014"}.
          A largura de cada barra mostra o volume de artigos do fascículo.
        </p>
      </header>

      <section className="shell" style={{ paddingBottom: "clamp(2rem, 5vw, 4rem)" }}>
        <div className="lombada">
          {a.anos.map((grupo) => (
            <div key={grupo.ano} className="lombada__ano">
              <div className="lombada__rotulo">{grupo.ano || "s.d."}</div>
              <div className="lombada__edicoes">
                {grupo.edicoes.map((e) => (
                  <Link key={e.id} className="volume" href={`/edicao/${e.slug}`}>
                    <span className="volume__nome">
                      {e.volume != null ? `v. ${e.volume}` : ""} {e.number != null ? `n. ${e.number}` : ""}
                    </span>
                    <span className="volume__trilho">
                      <span className="volume__preenche"
                            style={{ width: `${Math.max(1.5, (e._count.articles / a.maior) * 100)}%` }} />
                    </span>
                    <span className="volume__qtd">{e._count.articles}</span>
                  </Link>
                ))}
                <p className="mono" style={{ fontSize: "var(--step--2)", color: "var(--ink-4)", marginTop: "0.25rem" }}>
                  {num(grupo.total)} artigos no ano
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
