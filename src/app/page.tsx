import Link from "next/link";

// Renderizada sob demanda, e não no build: o conteúdo muda quando a editoria
// publica, e o build não pode depender do banco já estar populado.
export const dynamic = "force-dynamic";

import {
  edicaoAtual, panorama, revista, palavrasTop, serieAnual, indexadores, maisLidos,
} from "@/lib/queries";
import ItemArtigo from "@/components/ItemArtigo";
import CampoBusca from "@/components/CampoBusca";
import Constelacao from "@/components/Constelacao";
import SerieAnual from "@/components/SerieAnual";
import { num, dataLonga, miniMarkdown, recorte } from "@/lib/text";

export default async function Home() {
  const [r, p, atual, palavras, serie, idx, lidos] = await Promise.all([
    revista(), panorama(), edicaoAtual(), palavrasTop(34), serieAnual(), indexadores(), maisLidos(5),
  ]);

  const destaque = atual?.artigos.slice(0, 10) ?? [];
  const ativos = idx.filter((i) => i.status === "ativo");

  return (
    <div className="shell home">
      {/* ================= corpo ================= */}
      <main>
        {/* ---------- sobre a revista ---------- */}
        <section style={{ marginBottom: "clamp(2.5rem, 5vw, 3.5rem)" }}>
          <p className="eyebrow" style={{ marginBottom: "1.1rem" }}>Sobre a revista</p>

          <div className="sobre-home">
            {r.sobreImagem && (
              <img className="sobre-home__img" src={r.sobreImagem} alt="" />
            )}
            <div className="prosa" style={{ maxWidth: "none" }}
                 dangerouslySetInnerHTML={{ __html: miniMarkdown(r.sobreTexto ?? r.description ?? "") }} />
          </div>

          <div className="filtros" style={{ paddingTop: "1.25rem" }}>
            {r.areasLista.slice(0, 11).map((a) => <span key={a} className="tag">{a}</span>)}
          </div>

          <p style={{ marginTop: "1.5rem" }}>
            <Link className="btn btn--quiet btn--sm" href="/sobre">Leia o escopo completo →</Link>
          </p>
        </section>

        <hr className="horizonte" style={{ ["--sol" as string]: "18%" }} />

        {/* ---------- edição atual ---------- */}
        {atual && (
          <section style={{ paddingTop: "clamp(2rem, 4vw, 3rem)" }}>
            <header style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "baseline",
                             justifyContent: "space-between", marginBottom: "1.5rem" }}>
              <div>
                <p className="eyebrow" style={{ marginBottom: "0.7rem" }}>Edição atual</p>
                <h2 style={{ fontSize: "var(--step-3)" }}>{atual.issue.label}</h2>
                {atual.issue.publishedAt && (
                  <p className="mono" style={{ color: "var(--ink-3)", marginTop: "0.5rem" }}>
                    Fechada em {dataLonga(atual.issue.publishedAt)} · {num(atual.artigos.length)} artigos
                  </p>
                )}
              </div>
              <Link className="btn btn--quiet btn--sm" href={`/edicao/${atual.issue.slug}`}>
                Edição inteira →
              </Link>
            </header>

            <div className="indice">
              {destaque.map((a, i) => <ItemArtigo key={a.id} artigo={a} ordem={i + 1} />)}
            </div>

            {atual.artigos.length > destaque.length && (
              <p style={{ paddingTop: "1.25rem" }}>
                <Link className="btn btn--quiet btn--sm" href={`/edicao/${atual.issue.slug}`}>
                  Mais {num(atual.artigos.length - destaque.length)} artigos nesta edição
                </Link>
              </p>
            )}
          </section>
        )}

        {/* ---------- mapa de temas ---------- */}
        <section style={{ paddingTop: "clamp(2.5rem, 5vw, 3.5rem)" }}>
          <header style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "baseline",
                           justifyContent: "space-between", marginBottom: "1.25rem" }}>
            <p className="eyebrow" style={{ margin: 0 }}>O que a revista publica</p>
            <Link className="mono" href="/explorar" style={{ color: "var(--ember)", fontSize: "var(--step--2)" }}>
              mapa completo →
            </Link>
          </header>
          <Constelacao termos={palavras} altura={440} />
        </section>

        {/* ---------- série anual ---------- */}
        <section style={{ paddingTop: "clamp(2rem, 4vw, 3rem)" }}>
          <p className="eyebrow" style={{ marginBottom: "1.25rem" }}>Publicações por ano</p>
          <SerieAnual dados={serie} />
        </section>
      </main>

      {/* ================= lateral ================= */}
      <aside className="lateral">
        {/* enviar submissão */}
        <div className="bloco bloco--acao">
          <p className="bloco__titulo">Para autores</p>
          <p style={{ marginBottom: "1rem" }}>
            Fluxo contínuo: manuscritos são recebidos e avaliados o ano todo,
            sem data de chamada.
          </p>
          <Link className="btn btn--solid" href="/submeter" style={{ width: "100%", justifyContent: "center" }}>
            Enviar submissão
          </Link>
          <p style={{ marginTop: "0.8rem", marginBottom: 0 }}>
            <Link className="mono" href="/diretrizes" style={{ color: "var(--dawn)", fontSize: "var(--step--2)" }}>
              Diretrizes para autores →
            </Link>
          </p>
        </div>

        {/* ficha da revista */}
        <div className="bloco">
          <p className="bloco__titulo">A revista</p>
          <dl className="ficha">
            {r.issn && <div><dt>ISSN</dt><dd>{r.issn}</dd></div>}
            {r.doiPrefix && <div><dt>Prefixo DOI</dt><dd>{r.doiPrefix}</dd></div>}
            {r.qualis && <div><dt>Qualis</dt><dd>{r.qualis} · 2021-2024</dd></div>}
            {r.periodicity && <div><dt>Periodicidade</dt><dd style={{ maxWidth: "11rem" }}>{r.periodicity}</dd></div>}
            <div><dt>Acesso</dt><dd>Aberto, CC BY 4.0</dd></div>
            <div><dt>Artigos</dt><dd>{num(p.artigos)}</dd></div>
          </dl>
        </div>

        {/* indexadores */}
        {ativos.length > 0 && (
          <div className="bloco">
            <p className="bloco__titulo">Indexadores</p>
            <div className="indexadores">
              {ativos.map((i) => (
                <span key={i.id} className="indexador" data-status={i.status}>{i.name}</span>
              ))}
            </div>
            <p style={{ marginTop: "0.9rem", marginBottom: 0 }}>
              <Link className="mono" href="/indexacao" style={{ color: "var(--ember)", fontSize: "var(--step--2)" }}>
                Todas as bases →
              </Link>
            </p>
          </div>
        )}

        {/* mais lidos */}
        <div className="bloco">
          <p className="bloco__titulo">
            {lidos.criterio === "leituras" ? "Artigos mais lidos" : "Artigos mais citados"}
          </p>
          <ol className="lidos">
            {lidos.itens.map((a, i) => (
              <li key={a.slug}>
                <span className="lidos__n">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <Link className="lidos__t" href={`/artigo/${a.slug}`}>{recorte(a.title, 95)}</Link>
                  <span className="lidos__m">
                    {lidos.criterio === "leituras"
                      ? `${num(a.viewCount + a.legacyViews)} leituras`
                      : `${num(a.citationCount)} ${a.citationCount === 1 ? "citação" : "citações"}`}
                    {a.issue && <> · {a.issue.label}</>}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          {lidos.criterio === "citacoes" && (
            <p className="mono" style={{ fontSize: "0.64rem", color: "var(--ink-4)", marginTop: "0.9rem",
                                         marginBottom: 0, lineHeight: 1.5 }}>
              Ainda não há leituras registradas no portal novo. Enquanto isso, a lista
              mostra os mais citados no Crossref.
            </p>
          )}
        </div>

        {/* busca */}
        <div className="bloco">
          <p className="bloco__titulo">Buscar no acervo</p>
          <CampoBusca placeholder="Título, autor ou palavra-chave" />
          <p className="mono" style={{ fontSize: "0.64rem", color: "var(--ink-4)", marginTop: "0.8rem",
                                       marginBottom: 0, lineHeight: 1.5 }}>
            {num(p.artigos)} artigos e {num(p.palavras)} descritores.
          </p>
        </div>
      </aside>
    </div>
  );
}
