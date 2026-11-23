import { num, dataLonga } from "@/lib/text";
import { estadoScholar, buscaScholar } from "@/lib/scholar";
import { SerieDiaria, DuasBases, Posicao, Icone, type Dia } from "@/components/graficos";

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
  serie: Dia[];
  percentil: number | null;
  totalComDoi: number;
};

/**
 * Bloco de métricas do artigo, ao lado do botão de download.
 *
 * Três números em cima, cada um com seu sinal, e abaixo os desenhos que dão
 * sentido a eles: quando os acessos aconteceram, como as duas bases de citação
 * se comparam e onde o artigo está na distribuição da revista. Número sozinho
 * não diz se é muito ou pouco.
 *
 * Visualizações e downloads são contados pelo próprio portal. A contagem do
 * Google Acadêmico é conferida à mão pela editoria, pelos motivos explicados
 * em `src/lib/scholar.ts`.
 */
export default function MetricasArtigo({ m }: { m: Metricas }) {
  const estado = estadoScholar(m.scholar);
  const busca = buscaScholar(m.titulo, m.doi);

  return (
    <section className="metricas" aria-label="Métricas do artigo">
      <h2 className="metricas__titulo">Métricas do artigo</h2>

      <div className="metricas__grade">
        <div className="metricas__item">
          <Icone tipo="leitura" />
          <span className="metricas__n">{num(m.visualizacoes)}</span>
          <span className="metricas__r">Visualizações da página</span>
        </div>

        <div className="metricas__item">
          <Icone tipo="download" />
          <span className="metricas__n">{num(m.downloads)}</span>
          <span className="metricas__r">Downloads do PDF</span>
        </div>

        <div className="metricas__item">
          <Icone tipo="citacao" />
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

      {/* ---------- desenhos ---------- */}
      <div className="metricas__graficos">
        <SerieDiaria serie={m.serie} />

        {estado !== "sem_conferencia" && (
          <DuasBases scholar={m.scholar} crossref={m.crossref} fonteCrossref={m.crossrefFonte} />
        )}

        {m.temDoi && m.crossrefFonte && m.percentil != null && (
          <Posicao percentil={m.percentil} total={m.totalComDoi} citacoes={m.crossref} />
        )}
      </div>

      {/* ---------- procedência dos números ---------- */}
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

      {m.temDoi && m.crossrefFonte && (
        <p className="metricas__fonte metricas__fonte--extra">
          O {m.crossrefFonte} é consultado por programa
          {m.crossrefEm && <>, a última vez em {dataLonga(m.crossrefEm)}</>}. As duas
          bases aparecem em separado porque a mesma citação pode estar nas duas.
        </p>
      )}

      <p className="metricas__fonte metricas__fonte--extra">
        Visualizações e downloads são contados pelo próprio portal, sem robôs.
      </p>
    </section>
  );
}
