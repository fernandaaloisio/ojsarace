import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { edicaoPorSlug, revista } from "@/lib/queries";
import ItemArtigo from "@/components/ItemArtigo";
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
    <>
      <header className="shell cabeca-pagina">
        <p className="eyebrow">
          <Link href="/arquivo" style={{ color: "var(--ink-3)" }}>Arquivo</Link>
          <span aria-hidden>·</span>
          {r.title}
        </p>
        <h1>{e.issue.label}</h1>
        <p className="mono" style={{ color: "var(--ink-3)", marginTop: "1rem" }}>
          {num(e.artigos.length)} artigos
          {e.issue.publishedAt && <> · fechada em {dataLonga(e.issue.publishedAt)}</>}
        </p>
      </header>

      <div className="shell"><hr className="horizonte" style={{ ["--sol" as string]: "12%" }} /></div>

      <section className="shell" style={{ paddingBlock: "clamp(2rem, 4vw, 3rem)" }}>
        {[...porSecao.entries()].map(([secao, artigos]) => (
          <div key={secao} style={{ marginBottom: "2.5rem" }}>
            <p className="eyebrow" style={{ marginBottom: "1.25rem" }}>{secao}</p>
            <div className="indice">
              {artigos.map((a, i) => <ItemArtigo key={a.id} artigo={a} ordem={i + 1} />)}
            </div>
          </div>
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
      </section>
    </>
  );
}
