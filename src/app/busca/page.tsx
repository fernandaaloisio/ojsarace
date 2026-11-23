import type { Metadata } from "next";
import Link from "next/link";
import { listarArtigos, facetas, panorama, palavrasTop } from "@/lib/queries";
import ItemArtigo from "@/components/ItemArtigo";
import CampoBusca from "@/components/CampoBusca";
import Paginacao from "@/components/Paginacao";
import { num, IDIOMAS } from "@/lib/text";

export const metadata: Metadata = {
  title: "Busca no acervo",
  description: "Busca por título, resumo, autoria e palavra-chave em todo o acervo da revista.",
  robots: { index: false, follow: true },
};

type Params = Promise<Record<string, string | undefined>>;

const ORDENS = [
  { chave: "recentes", rotulo: "Mais recentes" },
  { chave: "citados", rotulo: "Mais citados" },
  { chave: "antigos", rotulo: "Mais antigos" },
];

export default async function Busca({ searchParams }: { searchParams: Params }) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const filtro = {
    q,
    ano: sp.ano ? Number(sp.ano) : undefined,
    idioma: sp.idioma || undefined,
    secao: sp.secao || undefined,
    ordem: (sp.ordem as "recentes" | "citados" | "antigos") || "recentes",
    pagina: sp.pagina ? Number(sp.pagina) : 1,
    porPagina: 20,
  };
  const temFiltro = Boolean(q || sp.ano || sp.idioma || sp.secao);

  const [res, f, p, palavras] = await Promise.all([
    temFiltro ? listarArtigos(filtro) : Promise.resolve(null),
    facetas(),
    panorama(),
    palavrasTop(16),
  ]);

  // mantém os filtros ativos ao alternar qualquer um deles
  const comParam = (chave: string, valor?: string) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v && k !== "pagina" && k !== chave) u.set(k, v);
    if (valor) u.set(chave, valor);
    const s = u.toString();
    return `/busca${s ? `?${s}` : ""}`;
  };
  const base = (() => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v && k !== "pagina") u.set(k, v);
    return `/busca?${u.toString()}`;
  })();

  return (
    <>
      <header className="shell cabeca-pagina" style={{ paddingBottom: "1.5rem" }}>
        <p className="eyebrow">Busca</p>
        <h1 style={{ fontSize: "var(--step-3)" }}>
          {res ? <>{num(res.total)} {res.total === 1 ? "resultado" : "resultados"}</> : <>Buscar em {num(p.artigos)} artigos</>}
        </h1>
        <div style={{ maxWidth: "44rem", marginTop: "1.5rem" }}>
          <CampoBusca valor={q} autoFocus={!q} />
        </div>
        {!temFiltro && (
          <div className="filtros" style={{ paddingTop: "1.25rem" }}>
            {palavras.map((k) => (
              <Link key={k.slug} className="tag" href={`/explorar/${k.slug}`}>{k.term}</Link>
            ))}
          </div>
        )}
      </header>

      <section className="shell" style={{ paddingBottom: "clamp(2rem, 5vw, 4rem)" }}>
        {/* ---------- facetas ---------- */}
        <div style={{ borderTop: "1px solid var(--rule)", borderBottom: "1px solid var(--rule)", display: "grid", gap: "0.5rem", padding: "0.9rem 0", marginBottom: "1.5rem" }}>
          <Faceta rotulo="Ordenar">
            {ORDENS.map((o) => (
              <Link key={o.chave} className="tag" href={comParam("ordem", o.chave)}
                    aria-current={filtro.ordem === o.chave ? "true" : undefined}
                    style={filtro.ordem === o.chave ? { borderColor: "var(--ember)", color: "var(--ember)" } : undefined}>
                {o.rotulo}
              </Link>
            ))}
          </Faceta>

          <Faceta rotulo="Seção">
            <Link className="tag" href={comParam("secao")} style={!sp.secao ? { borderColor: "var(--ember)", color: "var(--ember)" } : undefined}>Todas</Link>
            {f.secoes.map((s) => (
              <Link key={s.codigo} className="tag" href={comParam("secao", s.codigo)}
                    style={sp.secao === s.codigo ? { borderColor: "var(--ember)", color: "var(--ember)" } : undefined}>
                {s.nome} <span style={{ color: "var(--ink-4)" }}>{num(s.total)}</span>
              </Link>
            ))}
          </Faceta>

          <Faceta rotulo="Idioma">
            <Link className="tag" href={comParam("idioma")} style={!sp.idioma ? { borderColor: "var(--ember)", color: "var(--ember)" } : undefined}>Todos</Link>
            {f.idiomas.map((i) => (
              <Link key={i.codigo} className="tag" href={comParam("idioma", i.codigo)}
                    style={sp.idioma === i.codigo ? { borderColor: "var(--ember)", color: "var(--ember)" } : undefined}>
                {IDIOMAS[i.codigo] ?? i.codigo} <span style={{ color: "var(--ink-4)" }}>{num(i.total)}</span>
              </Link>
            ))}
          </Faceta>

          <Faceta rotulo="Ano">
            <Link className="tag" href={comParam("ano")} style={!sp.ano ? { borderColor: "var(--ember)", color: "var(--ember)" } : undefined}>Todos</Link>
            {f.anos.map((ano) => (
              <Link key={ano} className="tag" href={comParam("ano", String(ano))}
                    style={sp.ano === String(ano) ? { borderColor: "var(--ember)", color: "var(--ember)" } : undefined}>
                {ano}
              </Link>
            ))}
          </Faceta>
        </div>

        {/* ---------- resultados ---------- */}
        {!res ? (
          <div className="vazio">
            <strong>Digite um termo para começar</strong>
            A busca cobre título, resumo, autoria e palavras-chave, sem diferenciar acentos nem maiúsculas.
          </div>
        ) : res.itens.length === 0 ? (
          <div className="vazio">
            <strong>Nenhum artigo encontrado</strong>
            Tente menos palavras, ou remova um dos filtros ativos.
          </div>
        ) : (
          <>
            <div className="indice">
              {res.itens.map((a, i) => (
                <ItemArtigo key={a.id} artigo={a} ordem={(res.pagina - 1) * res.porPagina + i + 1} mostrarEdicao />
              ))}
            </div>
            <Paginacao pagina={res.pagina} paginas={res.paginas} base={base} total={res.total} />
          </>
        )}
      </section>
    </>
  );
}

function Faceta({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "baseline", flexWrap: "wrap" }}>
      <span className="mono" style={{ fontSize: "var(--step--2)", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--ink-4)", minWidth: "5.5rem" }}>
        {rotulo}
      </span>
      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}
