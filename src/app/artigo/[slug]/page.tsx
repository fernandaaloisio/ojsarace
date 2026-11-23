import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { artigoPorSlug, relacionados, metricasArtigo } from "@/lib/queries";
import ItemArtigo from "@/components/ItemArtigo";
import Citar from "@/components/Citar";
import MetricasArtigo from "@/components/MetricasArtigo";
import RegistrarLeitura from "@/components/RegistrarLeitura";
import { abnt, apa, vancouver, bibtex, ris, type CitaDados } from "@/lib/cite";
import { dataLonga, num, recorte, IDIOMAS, SITE_URL } from "@/lib/text";

// Renderizada sob demanda, e não no build: o conteúdo muda quando a editoria
// publica, e o build não pode depender do banco já estar populado.
export const dynamic = "force-dynamic";

async function carregar(slug: string) {
  const a = await artigoPorSlug(slug);
  if (!a) return null;
  const autores = a.authors.map((x) => x.author.name);
  const paginas = a.firstPage ? [a.firstPage, a.lastPage].filter(Boolean).join("-") : null;
  const url = `${SITE_URL}/artigo/${a.slug}`;
  const cita: CitaDados = {
    titulo: a.title,
    autores,
    revista: a.journal.title,
    issn: a.journal.issn,
    volume: a.issue?.volume ?? null,
    numero: a.issue?.number ?? null,
    ano: a.issue?.year ?? a.publishedAt?.getUTCFullYear() ?? null,
    doi: a.doi,
    paginas,
    elocation: a.elocationId,
    url,
    acesso: new Date(),
  };
  return { a, autores, paginas, url, cita };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const d = await carregar(slug);
  if (!d) return { title: "Artigo não encontrado" };
  const { a, autores, paginas, url } = d;

  // Tags Highwire: é por elas que o Google Scholar indexa o artigo.
  const highwire: Record<string, string | string[]> = {
    citation_title: a.title,
    citation_journal_title: a.journal.title,
    citation_publisher: a.journal.publisher ?? "",
    citation_language: a.language,
  };
  if (autores.length) highwire.citation_author = autores;
  if (a.journal.issn) highwire.citation_issn = a.journal.issn;
  if (a.issue?.volume != null) highwire.citation_volume = String(a.issue.volume);
  if (a.issue?.number != null) highwire.citation_issue = String(a.issue.number);
  if (a.publishedAt) {
    const p = a.publishedAt;
    highwire.citation_publication_date = `${p.getUTCFullYear()}/${p.getUTCMonth() + 1}/${p.getUTCDate()}`;
  }
  if (a.elocationId) highwire.citation_firstpage = a.elocationId;
  else if (a.firstPage) {
    highwire.citation_firstpage = a.firstPage;
    if (a.lastPage) highwire.citation_lastpage = a.lastPage;
  }
  if (a.doi) highwire.citation_doi = a.doi;
  if (a.pdfUrl) highwire.citation_pdf_url = a.pdfUrl;
  highwire.citation_abstract_html_url = url;
  if (a.keywords.length) highwire.citation_keywords = a.keywords.map((k) => k.keyword.term).join("; ");
  highwire["dc.identifier"] = a.doi ? `doi:${a.doi}` : url;
  highwire["dc.rights"] = a.license ?? "";

  return {
    title: a.title,
    description: recorte(a.abstract, 300),
    authors: autores.map((name) => ({ name })),
    keywords: a.keywords.map((k) => k.keyword.term),
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: a.title,
      description: recorte(a.abstract, 300),
      url,
      publishedTime: a.publishedAt?.toISOString(),
    },
    other: highwire,
  };
}

export default async function Artigo({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await carregar(slug);
  if (!d) notFound();
  const { a, autores, paginas, url, cita } = d;

  const [vizinhos, metricas] = await Promise.all([
    relacionados(a.id, a.keywords.map((k) => k.keywordId), 5),
    metricasArtigo(a.id),
  ]);
  const chaveBib =
    ((autores[0] ?? "arace").split(" ").pop() ?? "arace").toLowerCase().replace(/[^a-z]/g, "") +
    (cita.ano ?? "") + (a.doi?.split("-").pop() ?? "");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    headline: a.title,
    name: a.title,
    abstract: a.abstract ?? undefined,
    inLanguage: a.language,
    datePublished: a.publishedAt?.toISOString().slice(0, 10),
    author: a.authors.map((x) => ({
      "@type": "Person",
      name: x.author.name,
      ...(x.author.orcid ? { identifier: `https://orcid.org/${x.author.orcid}` } : {}),
      ...(x.affiliation ? { affiliation: { "@type": "Organization", name: x.affiliation } } : {}),
    })),
    keywords: a.keywords.map((k) => k.keyword.term),
    ...(a.doi ? { identifier: `https://doi.org/${a.doi}`, sameAs: `https://doi.org/${a.doi}` } : {}),
    isPartOf: {
      "@type": "PublicationIssue",
      issueNumber: a.issue?.number ?? undefined,
      datePublished: a.issue?.publishedAt?.toISOString().slice(0, 10),
      isPartOf: {
        "@type": "Periodical",
        name: a.journal.title,
        issn: a.journal.issn ?? undefined,
        publisher: { "@type": "Organization", name: a.journal.publisher ?? undefined },
      },
    },
    license: a.license ?? undefined,
    url,
    citation: a.citationCount || undefined,
  };

  const formatos = [
    { rotulo: "ABNT", chave: "abnt", texto: abnt(cita).replace(/\*\*/g, "") },
    { rotulo: "APA", chave: "apa", texto: apa(cita) },
    { rotulo: "Vancouver", chave: "vanc", texto: vancouver(cita) },
    { rotulo: "BibTeX", chave: "bib", texto: bibtex(cita, chaveBib) },
    { rotulo: "RIS", chave: "ris", texto: ris(cita) },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <RegistrarLeitura id={a.id} />

      <div className="shell artigo">
        {/* ---------- marginália: ficha técnica ---------- */}
        <aside className="marginalia" aria-label="Ficha técnica do artigo">
          {a.elocationId && (
            <div className="marginalia__bloco">
              <dt>Identificador</dt>
              <dd className="marginalia__num">{a.elocationId}</dd>
            </div>
          )}
          {a.doi && (
            <div className="marginalia__bloco">
              <dt>DOI</dt>
              <dd><a href={`https://doi.org/${a.doi}`} rel="noreferrer">{a.doi}</a></dd>
            </div>
          )}
          {a.issue && (
            <div className="marginalia__bloco">
              <dt>Edição</dt>
              <dd><Link href={`/edicao/${a.issue.slug}`}>{a.issue.label}</Link></dd>
            </div>
          )}
          {a.publishedAt && (
            <div className="marginalia__bloco">
              <dt>Publicado</dt>
              <dd>{dataLonga(a.publishedAt)}</dd>
            </div>
          )}
          {paginas && (
            <div className="marginalia__bloco"><dt>Páginas</dt><dd>{paginas}</dd></div>
          )}
          <div className="marginalia__bloco">
            <dt>Seção</dt>
            <dd>{a.section?.name ?? "Artigos"}</dd>
          </div>
          <div className="marginalia__bloco">
            <dt>Idioma</dt>
            <dd>{IDIOMAS[a.language] ?? a.language}</dd>
          </div>
          <div className="marginalia__bloco">
            <dt>Citações</dt>
            <dd className="marginalia__num">{num(a.citationCount)}</dd>
          </div>
          <div className="marginalia__bloco">
            <dt>Licença</dt>
            <dd><a href={a.license ?? "https://creativecommons.org/licenses/by/4.0/"} rel="license noreferrer">CC BY 4.0</a></dd>
          </div>
        </aside>

        {/* ---------- corpo ---------- */}
        <article>
          <p className="eyebrow" style={{ marginBottom: "1.25rem" }}>
            {a.journal.title}
            <span aria-hidden>·</span>
            {a.section?.name ?? "Artigos"}
          </p>

          <h1 className="artigo__titulo">{a.title}</h1>
          {a.subtitle && (
            <p style={{ fontFamily: "var(--display)", fontSize: "var(--step-2)", color: "var(--ink-3)", marginTop: "0.9rem", lineHeight: 1.2 }}>
              {a.subtitle}
            </p>
          )}

          <div className="artigo__autores">
            {a.authors.map((x) => (
              <span key={x.authorId}>
                <Link href={`/autor/${x.author.slug}`}>{x.author.name}</Link>
                {x.author.orcid && (
                  <a href={`https://orcid.org/${x.author.orcid}`} rel="noreferrer"
                     title={`ORCID ${x.author.orcid}`} aria-label={`ORCID de ${x.author.name}`}
                     style={{ marginLeft: "0.3rem", color: "var(--moss)", borderBottom: 0 }}>
                    <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden style={{ display: "inline" }}>
                      <circle cx="8" cy="8" r="7.3" fill="currentColor" />
                      <text x="8" y="11.4" textAnchor="middle" fontSize="9" fontFamily="serif" fill="var(--paper)">iD</text>
                    </svg>
                  </a>
                )}
              </span>
            ))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem", margin: "2rem 0 2.25rem" }}>
            {a.pdfUrl && (
              <a className="btn btn--solid" href={`/api/baixar/${a.slug}`} rel="noreferrer">
                Baixar PDF
              </a>
            )}
            {a.doi && (
              <a className="btn btn--quiet" href={`https://doi.org/${a.doi}`} rel="noreferrer">
                Resolver DOI
              </a>
            )}
          </div>

          <hr className="horizonte" style={{ ["--sol" as string]: "8%" }} />

          {a.abstract && (
            <section style={{ paddingTop: "2rem" }}>
              <p className="eyebrow" style={{ marginBottom: "1.1rem" }}>Resumo</p>
              <div className="corpo">
                <p className="primeira">{a.abstract}</p>
              </div>
            </section>
          )}

          {a.keywords.length > 0 && (
            <section style={{ paddingTop: "1rem" }}>
              <p className="eyebrow" style={{ marginBottom: "1rem" }}>Palavras-chave</p>
              <div className="filtros" style={{ padding: 0 }}>
                {a.keywords.map((k) => (
                  <Link key={k.keywordId} className="tag" href={`/explorar/${k.keyword.slug}`}>
                    {k.keyword.term}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {a.references.length > 0 && (
            <section style={{ paddingTop: "2.5rem" }}>
              <p className="eyebrow" style={{ marginBottom: "1.1rem" }}>
                Referências ({num(a.references.length)})
              </p>
              <ol className="mono" style={{ paddingLeft: "1.6rem", display: "grid", gap: "0.7rem", color: "var(--ink-3)", lineHeight: 1.55 }}>
                {a.references.map((ref) => (
                  <li key={ref.id}>
                    {ref.unstructured ?? [ref.journalTitle, ref.year].filter(Boolean).join(", ")}
                    {ref.doi && (
                      <> <a href={`https://doi.org/${ref.doi}`} rel="noreferrer" style={{ color: "var(--ember)" }}>
                        doi:{ref.doi}
                      </a></>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {vizinhos.length > 0 && (
            <section style={{ paddingTop: "3rem" }}>
              <p className="eyebrow" style={{ marginBottom: "1.25rem" }}>Artigos com temas em comum</p>
              <div className="indice">
                {vizinhos.map((v) => <ItemArtigo key={v.id} artigo={v} mostrarEdicao />)}
              </div>
            </section>
          )}
        </article>

        {/* ---------- coluna de ações ---------- */}
        <div className="aside-artigo">
          {metricas && <MetricasArtigo m={metricas} />}

          <Citar formatos={formatos} />

          <div className="caixa">
            <div className="caixa__titulo">Metadados abertos</div>
            <ul className="mono" style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.55rem", fontSize: "var(--step--2)" }}>
              {a.oaiIdentifier && (
                <li>
                  <a href={`/api/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(`oai:arace:${a.slug}`)}`}
                     style={{ color: "var(--ember)" }}>
                    Registro OAI-PMH
                  </a>
                </li>
              )}
              {a.doi && (
                <li>
                  <a href={`https://api.crossref.org/works/${a.doi}`} rel="noreferrer" style={{ color: "var(--ember)" }}>
                    JSON do Crossref
                  </a>
                </li>
              )}
              {a.legacyUrl && (
                <li>
                  <a href={a.legacyUrl} rel="noreferrer" style={{ color: "var(--ink-3)" }}>
                    Registro no portal anterior
                  </a>
                </li>
              )}
            </ul>
          </div>

        </div>
      </div>
    </>
  );
}
