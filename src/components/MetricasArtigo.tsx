import { num, dataLonga } from "@/lib/text";

export type Metricas = {
  visualizacoes: number;
  downloads: number;
  citacoes: number;
  temDoi: boolean;
  fonte: string | null;
  atualizadoEm: Date | null;
};

const FONTES: Record<string, { nome: string; url: string }> = {
  Crossref: { nome: "Crossref", url: "https://www.crossref.org/" },
  OpenAlex: { nome: "OpenAlex", url: "https://openalex.org/" },
};

/**
 * Bloco de métricas do artigo, ao lado do botão de download.
 *
 * Visualizações e downloads são contados pelo próprio portal, somados ao que
 * veio do OJS. As citações vêm de uma única fonte, informada ao leitor junto
 * com a data da consulta: somar bases diferentes contaria a mesma citação
 * duas vezes.
 */
export default function MetricasArtigo({ m }: { m: Metricas }) {
  const fonte = m.fonte ? FONTES[m.fonte] : null;

  // sem DOI, ou DOI não localizado na fonte, não há como afirmar um número
  const semCitacoes = !m.temDoi || !m.fonte;

  return (
    <section className="metricas" aria-label="Métricas do artigo">
      <h2 className="metricas__titulo">Métricas do artigo</h2>

      <div className="metricas__grade">
        <div className="metricas__item">
          <span className="metricas__n">{num(m.visualizacoes)}</span>
          <span className="metricas__r">Visualizações</span>
        </div>
        <div className="metricas__item">
          <span className="metricas__n">{num(m.downloads)}</span>
          <span className="metricas__r">Downloads do PDF</span>
        </div>
        <div className="metricas__item">
          {semCitacoes ? (
            <span className="metricas__sem">Dados de citações indisponíveis</span>
          ) : (
            <>
              <span className="metricas__n">{num(m.citacoes)}</span>
              <span className="metricas__r">Citações recebidas</span>
            </>
          )}
        </div>
      </div>

      <p className="metricas__fonte">
        {semCitacoes ? (
          m.temDoi
            ? "O DOI deste artigo ainda não foi localizado na base de citações consultada."
            : "Este artigo não tem DOI registrado, por isso não é possível consultar citações."
        ) : (
          <>
            Citações segundo o{" "}
            {fonte
              ? <a href={fonte.url} rel="noreferrer">{fonte.nome}</a>
              : m.fonte}
            {m.atualizadoEm && <>, consultadas em {dataLonga(m.atualizadoEm)}</>}.
            {" "}Visualizações e downloads são contados pelo próprio portal.
          </>
        )}
      </p>
    </section>
  );
}
