import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { edicaoPorSlug, revista } from "@/lib/queries";
import ItemArtigo from "@/components/ItemArtigo";
import CapaEdicao from "@/components/CapaEdicao";
import { db } from "@/lib/db";
import { dataLonga, num } from "@/lib/text";

// Renderizada sob demanda, e não no build: o conteúdo muda quando a editoria
// publica, e o build não pode depender do banco já estar populado.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const e = await edicaoPorSlug(slug);
  if (!e) return { title: "Edição não encontrada" };
  return {
    title: `${e.issue.label}`,
    description: `Sumário da edição ${e.issue.label}: ${num(e.artigos.length)} artigos publicados em acesso aberto.`,
  };
}

export default async function Edicao({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [e, r] = await Promise.all([edicaoPorSlug(slug), revista()]);
  if (!e) notFound();

  const [anterior, proxima] = await Promise.all([
    db.issue.findFirst({
      where: { articles: { some: {} }, rank: { lt: e.issue.rank } },
      orderBy: { rank: "desc" },
      select: { slug: true, label: true },
    }),
    db.issue.findFirst({
      where: { articles: { some: {} }, rank: { gt: e.issue.rank } },
      orderBy: { rank: "asc" },
      select: { slug: true, label: true },
    }),
  ]);

  // agrupa por seção preservando a ordem de leitura do sumário
  const porSecao = new Map<string, typeof e.artigos>();
  for (const a of e.artigos) {
    const nome = a.section?.name ?? "Artigos";
    if (!porSecao.has(nome)) porSecao.set(nome, []);
    porSecao.get(nome)!.push(a);
  }

  return (
    <div className="shell edicao">
      {/* ================= sumário ================= */}
      <div>
        <nav className="migalha" aria-label="Você está em">
          <Link href="/">{r.title}</Link>
          <span aria-hidden>/</span>
          <Link href="/arquivo">Acervo</Link>
          <span aria-hidden>/</span>
          <span>{e.issue.label}</span>
        </nav>

        <h1 style={{ fontSize: "var(--step-3)" }}>{e.issue.label}</h1>
        <p className="mono" style={{ color: "var(--ink-3)", margin: "0.9rem 0 2rem" }}>
          {num(e.artigos.length)} artigos
          {e.issue.publishedAt && <> · fechada em {dataLonga(e.issue.publishedAt)}</>}
        </p>

        {[...porSecao.entries()].map(([secao, artigos]) => (
          <section key={secao} style={{ marginBottom: "2.75rem" }}>
            <h2 className="secao-art">{secao}</h2>
            <div className="indice">
              {artigos.map((a, i) => <ItemArtigo key={a.id} artigo={a} ordem={i + 1} />)}
            </div>
          </section>
        ))}

        <nav className="paginacao" aria-label="Navegação entre edições">
          {anterior
            ? <Link className="btn btn--quiet btn--sm" href={`/edicao/${anterior.slug}`} rel="prev">← {anterior.label}</Link>
            : <span />}
          <Link className="mono" href="/arquivo" style={{ color: "var(--ember)" }}>Todas as edições</Link>
          {proxima
            ? <Link className="btn btn--quiet btn--sm" href={`/edicao/${proxima.slug}`} rel="next">{proxima.label} →</Link>
            : <span />}
        </nav>
      </div>

      {/* ================= lateral ================= */}
      <aside className="aside-artigo" aria-label="Sobre esta edição">
        <CapaEdicao revista={r.title} label={e.issue.label} ano={e.issue.year}
                    slug={e.issue.slug} imagem={e.issue.coverUrl} />

        <Link className="btn btn--solid btn--pdf" href="/submeter">Enviar submissão</Link>

        {e.issue.publishedAt && (
          <div className="caixa">
            <div className="caixa__titulo">Publicado</div>
            <p className="caixa__dado">{dataLonga(e.issue.publishedAt)}</p>
          </div>
        )}

        <div className="caixa">
          <div className="caixa__titulo">Nesta edição</div>
          <dl className="ficha">
            <div><dt>Artigos</dt><dd>{num(e.artigos.length)}</dd></div>
            <div><dt>Seções</dt><dd>{num(porSecao.size)}</dd></div>
            {e.issue.volume != null && <div><dt>Volume</dt><dd>{e.issue.volume}</dd></div>}
            {e.issue.number && <div><dt>Número</dt><dd>{e.issue.number}</dd></div>}
            {e.issue.year && <div><dt>Ano</dt><dd>{e.issue.year}</dd></div>}
          </dl>
        </div>

        {porSecao.size > 1 && (
          <div className="caixa">
            <div className="caixa__titulo">Seções</div>
            <ul className="lista-limpa">
              {[...porSecao.entries()].map(([secao, artigos]) => (
                <li key={secao}>
                  {secao} <span style={{ color: "var(--ink-4)" }}>({num(artigos.length)})</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="caixa">
          <div className="caixa__titulo">Edições vizinhas</div>
          <ul className="lista-limpa">
            {anterior && <li><Link href={`/edicao/${anterior.slug}`}>← {anterior.label}</Link></li>}
            {proxima && <li><Link href={`/edicao/${proxima.slug}`}>{proxima.label} →</Link></li>}
            <li><Link href="/arquivo">Todas as edições</Link></li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
