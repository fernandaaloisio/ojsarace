import { num } from "@/lib/text";

/**
 * Gráficos do bloco de métricas. São SVG escrito à mão, sem biblioteca:
 * três desenhos pequenos não justificam cem kilobytes no navegador do leitor,
 * e assim eles herdam as cores do tema em vez de carregarem uma paleta alheia.
 */

/* ---------------------------------------------------------------- série ---- */

export type Dia = { dia: string; leituras: number; baixados: number };

/**
 * Leituras e downloads por dia. Barras empilhadas em vez de linha: com poucos
 * registros uma linha sugere continuidade que o dado não tem, enquanto a barra
 * mostra honestamente que houve acesso naquele dia e em nenhum outro.
 */
export function SerieDiaria({ serie }: { serie: Dia[] }) {
  const total = serie.reduce((s, d) => s + d.leituras + d.baixados, 0);
  const pico = Math.max(1, ...serie.map((d) => d.leituras + d.baixados));
  const L = 100, A = 28, g = L / serie.length;

  const dataCurta = (iso: string) => {
    const [, m, d] = iso.split("-");
    return `${d}/${m}`;
  };

  if (total === 0) {
    return (
      <div className="grafico">
        <p className="grafico__rotulo">Acessos nos últimos 30 dias</p>
        <p className="grafico__vazio">
          Nenhum acesso registrado neste período. A contagem começou quando o
          artigo entrou neste portal.
        </p>
      </div>
    );
  }

  return (
    <div className="grafico">
      <p className="grafico__rotulo">
        Acessos nos últimos 30 dias <b>{num(total)}</b>
      </p>
      <svg viewBox={`0 0 ${L} ${A + 4}`} className="grafico__svg" role="img"
           aria-label={`Gráfico de barras com ${num(total)} acessos distribuídos nos últimos 30 dias`}
           preserveAspectRatio="none">
        {serie.map((d, i) => {
          const soma = d.leituras + d.baixados;
          if (soma === 0) return null;
          const h = (soma / pico) * A;
          const hb = (d.baixados / pico) * A;
          return (
            <g key={d.dia}>
              <title>{`${dataCurta(d.dia)}: ${d.leituras} leituras, ${d.baixados} downloads`}</title>
              <rect x={i * g + g * 0.14} y={A - h} width={g * 0.72} height={h - hb}
                    fill="var(--marca)" />
              {hb > 0 && (
                <rect x={i * g + g * 0.14} y={A - hb} width={g * 0.72} height={hb}
                      fill="var(--ember)" />
              )}
            </g>
          );
        })}
        <line x1="0" y1={A} x2={L} y2={A} stroke="var(--rule)" strokeWidth="0.6" />
      </svg>
      <p className="grafico__legenda">
        <span><i style={{ background: "var(--marca)" }} aria-hidden /> leituras</span>
        <span><i style={{ background: "var(--ember)" }} aria-hidden /> downloads</span>
        <span className="grafico__datas">{dataCurta(serie[0].dia)} – {dataCurta(serie[serie.length - 1].dia)}</span>
      </p>
    </div>
  );
}

/* ----------------------------------------------------------- comparação ---- */

/**
 * As duas bases de citação, lado a lado e na mesma escala. Nunca somadas:
 * a mesma citação costuma estar nas duas, e somar inflaria o número.
 */
export function DuasBases({
  scholar, crossref, fonteCrossref,
}: { scholar: number | null; crossref: number; fonteCrossref: string | null }) {
  if (scholar == null && !fonteCrossref) return null;
  const maior = Math.max(1, scholar ?? 0, crossref);

  const linha = (rotulo: string, valor: number | null, cor: string) => (
    <div className="barras__linha">
      <span className="barras__rot">{rotulo}</span>
      <span className="barras__trilho">
        {valor != null && (
          <span className="barras__preenche"
                style={{ width: `${Math.max(2, (valor / maior) * 100)}%`, background: cor }} />
        )}
      </span>
      <span className="barras__val">{valor == null ? "—" : num(valor)}</span>
    </div>
  );

  return (
    <div className="grafico">
      <p className="grafico__rotulo">Citações por base</p>
      <div className="barras">
        {linha("Google Acadêmico", scholar, "var(--ember)")}
        {fonteCrossref && linha(fonteCrossref, crossref, "var(--marca)")}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- posição ---- */

/**
 * Onde o artigo está na distribuição de citações da revista. Um número cru
 * não diz se é muito ou pouco; a régua diz.
 */
export function Posicao({
  percentil, total, citacoes,
}: { percentil: number; total: number; citacoes: number }) {
  // Sem citacao nenhuma nao ha posicao a mostrar: dizer "entre os 100% mais
  // citados" seria uma frase sem sentido, e foi o que a regua fazia antes.
  if (citacoes === 0) {
    return (
      <div className="grafico">
        <p className="grafico__rotulo">Posição no acervo</p>
        <p className="grafico__vazio">
          O Crossref ainda não registra citações para este artigo, então não há
          posição a comparar com o resto do acervo.
        </p>
      </div>
    );
  }

  const topo = Math.max(1, 100 - percentil);
  const legenda = `Este artigo está entre os ${topo}% mais citados dos ${num(total)} artigos da revista com DOI`;

  return (
    <div className="grafico">
      <p className="grafico__rotulo">Posição no acervo</p>
      <div className="regua" role="img" aria-label={legenda}>
        <span className="regua__trilho">
          <span className="regua__ate" style={{ width: `${percentil}%` }} />
          <span className="regua__marca" style={{ left: `${percentil}%` }} />
        </span>
        <span className="regua__pontas" aria-hidden>
          <span>menos citados</span><span>mais citados</span>
        </span>
      </div>
      <p className="grafico__nota">
        Entre os <b>{topo}%</b> mais citados dos {num(total)} artigos da revista
        que têm DOI, segundo o Crossref.
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- ícones --- */

/** Olho, seta para baixo e aspas: um sinal para cada indicador. */
export function Icone({ tipo }: { tipo: "leitura" | "download" | "citacao" }) {
  const comum = {
    width: 15, height: 15, viewBox: "0 0 16 16", fill: "none",
    stroke: "currentColor", strokeWidth: 1.5,
    strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
    "aria-hidden": true, className: "metricas__icone",
  };
  if (tipo === "leitura") {
    return (
      <svg {...comum}>
        <path d="M1 8s2.6-4.3 7-4.3S15 8 15 8s-2.6 4.3-7 4.3S1 8 1 8Z" />
        <circle cx="8" cy="8" r="1.9" />
      </svg>
    );
  }
  if (tipo === "download") {
    return (
      <svg {...comum}>
        <path d="M8 2v7.4" />
        <path d="M4.8 6.6 8 9.8l3.2-3.2" />
        <path d="M2.4 12.4h11.2" />
      </svg>
    );
  }
  return (
    <svg {...comum}>
      <path d="M6.2 4.2C4.3 5 3.1 6.6 3.1 8.6c0 1.6 1 2.7 2.4 2.7 1.3 0 2.2-.9 2.2-2.1 0-1.2-.8-2-1.9-2-.2 0-.5 0-.7.1.3-1 1.1-1.9 2.2-2.4Z" />
      <path d="M12.1 4.2C10.2 5 9 6.6 9 8.6c0 1.6 1 2.7 2.4 2.7 1.3 0 2.2-.9 2.2-2.1 0-1.2-.8-2-1.9-2-.2 0-.5 0-.7.1.3-1 1.1-1.9 2.2-2.4Z" />
    </svg>
  );
}

/* ------------------------------------------------------------- por mês ---- */

export type Mes = { mes: string; rotulo: string; leituras: number; baixados: number };

/**
 * Acessos por mês nos últimos doze, no corpo do artigo. É o gráfico que as
 * revistas publicam na própria página: mostra se o trabalho continua sendo
 * procurado ou se teve só o pico da publicação.
 */
export function SerieMensal({ serie }: { serie: Mes[] }) {
  const total = serie.reduce((s, m) => s + m.leituras + m.baixados, 0);
  if (total === 0) return null;

  const pico = Math.max(1, ...serie.map((m) => m.leituras + m.baixados));
  const marcas = [0, Math.round(pico / 2), pico];

  return (
    <section id="acessos" className="mensal" style={{ scrollMarginTop: "6rem" }}>
      <p className="eyebrow" style={{ marginBottom: "1.1rem" }}>Acessos por mês</p>

      <div className="mensal__caixa">
        <div className="mensal__eixo" aria-hidden>
          {marcas.slice().reverse().map((v) => <span key={v}>{num(v)}</span>)}
        </div>

        <ol className="mensal__barras">
          {serie.map((m) => {
            const soma = m.leituras + m.baixados;
            return (
              <li key={m.mes}>
                <span className="mensal__col"
                      title={`${m.rotulo}: ${m.leituras} leituras, ${m.baixados} downloads`}>
                  <span className="mensal__baixados"
                        style={{ height: `${(m.baixados / pico) * 100}%` }} />
                  <span className="mensal__leituras"
                        style={{ height: `${(m.leituras / pico) * 100}%` }} />
                </span>
                <span className="mensal__rot">{m.rotulo}</span>
                <span className="mensal__val">{soma > 0 ? num(soma) : ""}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <p className="mensal__legenda">
        <span><i style={{ background: "var(--marca)" }} aria-hidden /> leituras da página</span>
        <span><i style={{ background: "var(--ember)" }} aria-hidden /> downloads do PDF</span>
      </p>
    </section>
  );
}
