import Link from "next/link";
import { notFound } from "next/navigation";
import { usuarioAtual, ehEditor } from "@/lib/auth";
import { db } from "@/lib/db";
import { fold, num, dataCurta, recorte } from "@/lib/text";
import { JOURNAL_SLUG } from "@/lib/queries";

export const dynamic = "force-dynamic";

const POR_PAGINA = 25;

type Busca = { q?: string; f?: string; p?: string };

export default async function Citacoes({ searchParams }: { searchParams: Promise<Busca> }) {
  const u = await usuarioAtual();
  if (!ehEditor(u)) notFound();

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const filtro = sp.f === "conferidos" ? "conferidos" : sp.f === "todos" ? "todos" : "pendentes";
  const pagina = Math.max(1, Number(sp.p ?? 1) || 1);

  const where: Record<string, unknown> = { journal: { slug: JOURNAL_SLUG } };
  const and: Record<string, unknown>[] = [];
  for (const termo of fold(q).split(/\s+/).filter((t) => t.length > 1).slice(0, 6)) {
    and.push({ searchBlob: { contains: termo } });
  }
  if (filtro === "pendentes") and.push({ scholarCount: null });
  if (filtro === "conferidos") and.push({ NOT: { scholarCount: null } });
  if (and.length) where.AND = and;

  const [total, pendentes, conferidos, itens] = await Promise.all([
    db.article.count({ where }),
    db.article.count({ where: { journal: { slug: JOURNAL_SLUG }, scholarCount: null } }),
    db.article.count({ where: { journal: { slug: JOURNAL_SLUG }, NOT: { scholarCount: null } } }),
    db.article.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: {
        slug: true, title: true, doi: true, publishedAt: true,
        scholarCount: true, scholarCheckedAt: true, scholarDemo: true,
        issue: { select: { label: true } },
        scholarBy: { select: { name: true } },
      },
    }),
  ]);

  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const liga = (extra: Partial<Busca>) => {
    const u = new URLSearchParams();
    const alvo = { q, f: filtro, p: String(pagina), ...extra };
    if (alvo.q) u.set("q", alvo.q);
    if (alvo.f && alvo.f !== "pendentes") u.set("f", alvo.f);
    if (alvo.p && alvo.p !== "1") u.set("p", alvo.p);
    const s = u.toString();
    return s ? `/painel/citacoes?${s}` : "/painel/citacoes";
  };

  return (
    <div>
      <header style={{ marginBottom: "1.75rem" }}>
        <p className="eyebrow" style={{ marginBottom: "0.9rem" }}>Editoria</p>
        <h1 style={{ fontSize: "var(--step-3)" }}>Citações no Google Acadêmico</h1>
        <p style={{ color: "var(--ink-3)", marginTop: "0.9rem", maxWidth: "62ch" }}>
          O Google Acadêmico não publica interface de consulta automática, então
          a contagem de <em>Citado por</em> é conferida à mão. Abra o artigo,
          clique em buscar, confirme que o resultado é o trabalho certo e registre
          o número. Até isso acontecer, a página pública mostra{" "}
          <strong>Contagem indisponível</strong>.
        </p>
      </header>

      <form method="get" action="/painel/citacoes" className="filtros" style={{ marginBottom: "1.25rem" }}>
        <input type="search" name="q" defaultValue={q} placeholder="Título, autor ou palavra-chave"
               aria-label="Buscar artigo" style={{ minWidth: "18rem" }} />
        <input type="hidden" name="f" value={filtro} />
        <button type="submit" className="btn btn--sm">Buscar</button>
      </form>

      <div className="filtros" style={{ marginBottom: "1.75rem" }}>
        <Link className="tag" href={liga({ f: "pendentes", p: "1" })}
              aria-current={filtro === "pendentes" ? "true" : undefined}>
          Sem conferência ({num(pendentes)})
        </Link>
        <Link className="tag" href={liga({ f: "conferidos", p: "1" })}
              aria-current={filtro === "conferidos" ? "true" : undefined}>
          Conferidos ({num(conferidos)})
        </Link>
        <Link className="tag" href={liga({ f: "todos", p: "1" })}
              aria-current={filtro === "todos" ? "true" : undefined}>
          Todos ({num(pendentes + conferidos)})
        </Link>
      </div>

      {itens.length === 0 ? (
        <p style={{ color: "var(--ink-3)" }}>Nenhum artigo encontrado com esses termos.</p>
      ) : (
        <table className="tabela">
          <thead>
            <tr>
              <th scope="col">Artigo</th>
              <th scope="col">Edição</th>
              <th scope="col" style={{ textAlign: "right" }}>Citado por</th>
              <th scope="col">Conferência</th>
              <th scope="col">Ação</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((a) => (
              <tr key={a.slug}>
                <td>
                  <Link href={`/artigo/${a.slug}`} style={{ fontWeight: 500 }}>
                    {recorte(a.title, 90)}
                  </Link>
                  {a.doi && <div className="mono" style={{ fontSize: "var(--step--2)", color: "var(--ink-4)" }}>{a.doi}</div>}
                  {!a.doi && <div className="mono" style={{ fontSize: "var(--step--2)", color: "var(--ink-4)" }}>sem DOI</div>}
                </td>
                <td className="mono" style={{ whiteSpace: "nowrap", color: "var(--ink-3)" }}>
                  {a.issue?.label ?? "—"}
                </td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  {a.scholarCount == null
                    ? <span style={{ color: "var(--ink-4)" }}>—</span>
                    : <strong>{num(a.scholarCount)}</strong>}
                  {a.scholarDemo && <div className="mono" style={{ fontSize: "0.62rem", color: "var(--ember)" }}>exemplo</div>}
                </td>
                <td className="mono" style={{ fontSize: "var(--step--2)", color: "var(--ink-3)" }}>
                  {a.scholarCheckedAt ? dataCurta(a.scholarCheckedAt) : "—"}
                  {a.scholarBy?.name && <div style={{ color: "var(--ink-4)" }}>{a.scholarBy.name}</div>}
                </td>
                <td style={{ textAlign: "right" }}>
                  <Link className="btn btn--sm" href={`/painel/citacoes/${a.slug}`}>
                    {a.scholarCount == null ? "Conferir" : "Editar"}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {paginas > 1 && (
        <nav className="paginacao" aria-label="Páginas">
          {pagina > 1 && <Link href={liga({ p: String(pagina - 1) })}>← anteriores</Link>}
          <span className="mono">página {pagina} de {num(paginas)}</span>
          {pagina < paginas && <Link href={liga({ p: String(pagina + 1) })}>próximas →</Link>}
        </nav>
      )}
    </div>
  );
}
