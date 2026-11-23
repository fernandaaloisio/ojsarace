import { num, dataLonga } from "@/lib/text";
import { estadoScholar, buscaScholar } from "@/lib/scholar";

export type Metricas = {
  visualizacoes: number;
  downloads: number;
  crossref: number;
  crossrefFonte: string | null;
  crossrefEm: Date | null;
  temDoi: boolean;
  doi: string | null;
  titulo: string;
  scholar: number | null;
  scholarEm: Date | null;
  scholarUrl: string | null;
  scholarDemo: boolean;
};

/**
 * Bloco de métricas do artigo, ao lado do botão de download.
 *
 * Visualizações e downloads são contados pelo próprio portal, somados ao que
 * veio do OJS. O terceiro indicador é a contagem do Google Acadêmico, que a
 * editoria confere à mão: o Scholar não tem API, então não há como um script
 * afirmar o número. Os três estados possíveis estão no comentário de
 * `src/lib/scholar.ts`.
 *
 * O número do Crossref aparece abaixo, em linha separada e com a fonte dita,
 * nunca somado ao do Scholar: a mesma citação costuma constar nas duas bases.
 */
export default function MetricasArtigo({ m }: { m: Metricas }) {
  const estado = estadoScholar(m.scholar);
  const busca = buscaScholar(m.titulo, m.doi);

  return (
    <section className="metricas" aria-label="Métricas do artigo">
      <h2 className="metricas__titulo">Métricas do artigo</h2>

      <div className="metricas__grade">
        <div className="metricas__item">
          <span className="metricas__n">{num(m.visualizacoes)}</span>
          <span className="metricas__r">Visualizações da página</span>
        </div>

        <div className="metricas__item">
          <span className="metricas__n">{num(m.downloads)}</span>
          <span className="metricas__r">Downloads do PDF</span>
        </div>

        <div className="metricas__item">
          {estado === "sem_conferencia" ? (
            <span className="metricas__sem">Contagem indisponível</span>
          ) : (
            <>
              <span className="metricas__n">{num(m.scholar ?? 0)}</span>
              <span className="metricas__r">Citações no Google Acadêmico</span>
            </>
          )}
        </div>
      </div>

      {/* ---------- estado da contagem do Scholar ---------- */}
      {estado === "sem_conferencia" ? (
        <div className="metricas__acao">
          <p className="metricas__fonte" style={{ marginBottom: "0.7rem" }}>
            A contagem do Google Acadêmico ainda não foi conferida pela editoria.
            O Scholar não publica interface de consulta automática, então o número
            só aparece aqui depois que alguém confirma qual resultado corresponde
            a este artigo.
          </p>
          <a className="btn btn--quiet btn--sm" href={busca} rel="noreferrer nofollow" target="_blank">
            Buscar artigo no Google Acadêmico
          </a>
        </div>
      ) : (
        <p className="metricas__fonte">
          {m.scholarDemo && (
            <>
              <strong className="metricas__exemplo">valor de demonstração</strong>{" "}
            </>
          )}
          Citações conforme o campo <em>Citado por</em> do{" "}
          <a href={busca} rel="noreferrer nofollow" target="_blank">Google Acadêmico</a>
          {m.scholarEm && <>, conferido em {dataLonga(m.scholarEm)}</>}.
          {estado === "zero" && " A conferência confirmou que o registro ainda não tem citações."}
          {m.scholarUrl && (
            <>
              {" "}
              <a href={m.scholarUrl} rel="noreferrer nofollow" target="_blank">
                Ver trabalhos que citaram este artigo
              </a>
              .
            </>
          )}
        </p>
      )}

      {/* ---------- Crossref, como segunda leitura ---------- */}
      {m.temDoi && m.crossrefFonte && (
        <p className="metricas__fonte metricas__fonte--extra">
          O {m.crossrefFonte} registra {num(m.crossref)}{" "}
          {m.crossref === 1 ? "citação" : "citações"} para o DOI deste artigo
          {m.crossrefEm && <>, em consulta de {dataLonga(m.crossrefEm)}</>}. As duas
          bases são contadas em separado, porque a mesma citação pode estar nas duas.
        </p>
      )}

      <p className="metricas__fonte metricas__fonte--extra">
        Visualizações e downloads são contados pelo próprio portal.
      </p>
    </section>
  );
}
