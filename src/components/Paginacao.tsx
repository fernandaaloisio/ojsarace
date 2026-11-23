import Link from "next/link";

export default function Paginacao({
  pagina, paginas, base, total,
}: { pagina: number; paginas: number; base: string; total: number }) {
  if (paginas <= 1) return null;
  const url = (p: number) => `${base}${base.includes("?") ? "&" : "?"}pagina=${p}`;

  return (
    <nav className="paginacao" aria-label="Paginação dos resultados">
      {pagina > 1
        ? <Link className="btn btn--quiet btn--sm" href={url(pagina - 1)} rel="prev">← Anterior</Link>
        : <span />}
      <span>
        Página {pagina} de {paginas.toLocaleString("pt-BR")}
        <span style={{ color: "var(--ink-4)" }}> · {total.toLocaleString("pt-BR")} registros</span>
      </span>
      {pagina < paginas
        ? <Link className="btn btn--quiet btn--sm" href={url(pagina + 1)} rel="next">Próxima →</Link>
        : <span />}
    </nav>
  );
}
