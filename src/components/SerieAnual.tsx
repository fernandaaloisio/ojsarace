/** Série anual de publicações. Colunas em régua, sem eixo decorativo:
 *  a leitura é feita pelos rótulos em mono embaixo de cada ano. */
export default function SerieAnual({ dados }: { dados: { ano: number; total: number }[] }) {
  if (dados.length < 2) return null;
  const max = Math.max(...dados.map((d) => d.total));

  return (
    <figure style={{ margin: 0 }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${dados.length}, minmax(0, 1fr))`,
        gap: "clamp(2px, 0.8vw, 10px)",
        alignItems: "end",
        height: "clamp(120px, 18vw, 190px)",
        borderBottom: "1px solid var(--ink)",
      }}>
        {dados.map((d) => (
          <div key={d.ano} title={`${d.ano}: ${d.total.toLocaleString("pt-BR")} artigos`}
               style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
            <span className="mono" style={{
              fontSize: "var(--step--2)", color: "var(--ink-3)", textAlign: "center",
              marginBottom: "0.35rem", lineHeight: 1,
            }}>
              {d.total}
            </span>
            <div style={{
              height: `${Math.max(2, (d.total / max) * 100)}%`,
              background: d.total === max ? "var(--ember)" : "var(--paper-3)",
              borderTop: `2px solid ${d.total === max ? "var(--ember-deep)" : "var(--ink-4)"}`,
            }} />
          </div>
        ))}
      </div>
      <figcaption className="mono" style={{
        display: "grid",
        gridTemplateColumns: `repeat(${dados.length}, minmax(0, 1fr))`,
        gap: "clamp(2px, 0.8vw, 10px)",
        fontSize: "var(--step--2)",
        color: "var(--ink-3)",
        paddingTop: "0.5rem",
        textAlign: "center",
      }}>
        {dados.map((d) => <span key={d.ano}>{String(d.ano).slice(2)}</span>)}
      </figcaption>
    </figure>
  );
}
