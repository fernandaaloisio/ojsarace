import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { artigoPorSlug, relacionados, metricasArtigo } from "@/lib/queries";
import ItemArtigo from "@/components/ItemArtigo";
import Citar from "@/components/Citar";
import MetricasArtigo from "@/components/MetricasArtigo";
import { SerieMensal } from "@/components/graficos";
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
  // Afiliacoes numeradas, como as revistas fazem: cada afiliacao distinta ganha
  // um numero e o autor recebe o marcador correspondente. Evita repetir o nome
  // da instituicao em artigos com muitos autores do mesmo lugar.
  const afiliacoes: string[] = [];
  const marcador = new Map<string, number>();
  for (const x of a.authors) {
    const af = x.affiliation?.trim();
    if (!af) continue;
    if (!marcador.has(af)) {
      afiliacoes.push(af);
      marcador.set(af, afiliacoes.length);
    }
  }

  // Navegacao entre as secoes do artigo: so entram as que existem neste registro.
  const secoes = [
    a.abstract ? { id: "resumo", rotulo: "Resumo" } : null,
    a.keywords.length > 0 ? { id: "palavras-chave", rotulo: "Palavras-chave" } : null,
    a.references.length > 0 ? { id: "referencias", rotulo: `Referências (${num(a.references.length)})` } : null,
    vizinhos.length > 0 ? { id: "relacionados", rotulo: "Artigos relacionados" } : null,
  ].filter((x): x is { id: string; rotulo: string } => x !== null);

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
        {/* ================= corpo ================= */}
        <article>
          <nav className="migalha" aria-label="Você está em">
            <Link href="/">{a.journal.title}</Link>
            <span aria-hidden>/</span>
            <Link href="/arquivo">Acervo</Link>
            {a.issue && (
              <>
                <span aria-hidden>/</span>
                <Link href={`/edicao/${a.issue.slug}`}>{a.issue.label}</Link>
              </>
            )}
            <span aria-hidden>/</span>
            <span>{a.section?.name ?? "Artigos"}</span>
          </nav>

          <h1 className="artigo__titulo">{a.title}</h1>
          {a.subtitle && <p className="artigo__sub">{a.subtitle}</p>}

          {/* autores, um por linha, com afiliação e ORCID */}
          <ul className="fichaut">
            {a.authors.map((x) => (
              <li key={x.authorId}>
                <Link className="fichaut__nome" href={`/autor/${x.author.slug}`}>
                  {x.author.name}
                </Link>
                {x.affiliation && <span className="fichaut__af">{x.affiliation}</span>}
                {x.author.orcid && (
                  <a className="fichaut__orcid" href={`https://orcid.org/${x.author.orcid}`} rel="noreferrer">
                    <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden>
                      <circle cx="8" cy="8" r="7.3" fill="currentColor" />
                      <text x="8" y="11.4" textAnchor="middle" fontSize="9" fontFamily="serif" fill="var(--paper)">iD</text>
                    </svg>
                    {x.author.orcid}
                  </a>
                )}
              </li>
            ))}
          </ul>

          <p className="artigo__meta">
            {paginas && <>p. {paginas}<span aria-hidden>·</span></>}
            {a.elocationId && !paginas && <>{a.elocationId}<span aria-hidden>·</span></>}
            {a.publishedAt && <>Publicado em {dataLonga(a.publishedAt)}</>}
            {a.doi && (
              <>
                <span aria-hidden>·</span>
                <a href={`https://doi.org/${a.doi}`} rel="noreferrer">doi:{a.doi}</a>
              </>
            )}
          </p>

          {a.keywords.length > 0 && (
            <p className="artigo__chaves" id="palavras-chave" style={{ scrollMarginTop: "6rem" }}>
              <b>Palavras-chave:</b>{" "}
              {a.keywords.map((k, i) => (
                <span key={k.keywordId}>
                  {i > 0 && "; "}
                  <Link href={`/explorar/${k.keyword.slug}`}>{k.keyword.term}</Link>
                </span>
              ))}
            </p>
          )}

          {secoes.length > 1 && (
            <nav className="artigo__nav" aria-label="Seções deste artigo">
              {secoes.map((sec) => <a key={sec.id} href={`#${sec.id}`}>{sec.rotulo}</a>)}
            </nav>
          )}

          {a.abstract && (
            <section id="resumo" style={{ paddingTop: "1.75rem", scrollMarginTop: "6rem" }}>
              <p className="eyebrow" style={{ marginBottom: "1.1rem" }}>Resumo</p>
              <div className="corpo">
                <p className="primeira">{a.abstract}</p>
              </div>
            </section>
          )}

          {metricas && (
            <div style={{ paddingTop: "2.5rem" }}>
              <SerieMensal serie={metricas.serieMes} />
            </div>
          )}

          {a.references.length > 0 && (
            <section id="referencias" style={{ paddingTop: "2.5rem", scrollMarginTop: "6rem" }}>
              <p className="eyebrow" style={{ marginBottom: "1.1rem" }}>
                Referências ({num(a.references.length)})
              </p>
              <ol className="refs">
                {a.references.map((ref) => (
                  <li key={ref.id}>
                    {ref.unstructured ?? [ref.journalTitle, ref.year].filter(Boolean).join(", ")}
                    {ref.doi && (
                      <> <a href={`https://doi.org/${ref.doi}`} rel="noreferrer">doi:{ref.doi}</a></>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {vizinhos.length > 0 && (
            <section id="relacionados" style={{ paddingTop: "3rem", scrollMarginTop: "6rem" }}>
              <p className="eyebrow" style={{ marginBottom: "1.25rem" }}>Artigos com temas em comum</p>
              <div className="indice">
                {vizinhos.map((v) => <ItemArtigo key={v.id} artigo={v} mostrarEdicao />)}
              </div>
            </section>
          )}
        </article>

        {/* ================= lateral ================= */}
        <div className="aside-artigo">
          {/* capa gerada a partir dos dados da edição */}
          {a.issue && (
            <Link className="capa" href={`/edicao/${a.issue.slug}`} aria-label={`Edição ${a.issue.label}`}>
              <span className="capa__marca" aria-hidden />
              <span className="capa__nome">{a.journal.title}</span>
              <span className="capa__linha" aria-hidden />
              <span className="capa__ed">{a.issue.label}</span>
              {a.issue.year && <span className="capa__ano">{a.issue.year}</span>}
            </Link>
          )}

          {a.pdfUrl && (
            <a className="btn btn--solid btn--pdf" href={`/api/baixar/${a.slug}`} rel="noreferrer">
              Baixar PDF
            </a>
          )}

          {a.publishedAt && (
            <div className="caixa">
              <div className="caixa__titulo">Publicado</div>
              <p className="caixa__dado">{dataLonga(a.publishedAt)}</p>
            </div>
          )}

          {metricas && <MetricasArtigo m={metricas} />}

          <div id="como-citar" style={{ scrollMarginTop: "6rem" }}>
            <Citar formatos={formatos} />
          </div>

          {/* ---------- registro do DOI ---------- */}
          <div className="caixa">
            <div className="caixa__titulo">Registro DOI</div>
            {a.doi ? (
              <>
                <p className="doi-reg">
                  <a className="doi-reg__num" href={`https://doi.org/${a.doi}`} rel="noreferrer">
                    https://doi.org/{a.doi}
                  </a>
                </p>
                <dl className="ficha">
                  <div>
                    <dt>Agência</dt>
                    <dd><a href="https://www.crossref.org/" rel="noreferrer">Crossref</a></dd>
                  </div>
                  {a.journal.doiPrefix && (
                    <div><dt>Prefixo</dt><dd>{a.journal.doiPrefix}</dd></div>
                  )}
                  <div><dt>Sufixo</dt><dd>{a.doi.split("/").slice(1).join("/")}</dd></div>
                  {a.publishedAt && (
                    <div><dt>Depositado</dt><dd>{dataLonga(a.publishedAt)}</dd></div>
                  )}
                </dl>
                <p className="doi-reg__nota">
                  O DOI é o endereço permanente do artigo. Mesmo que o portal mude
                  de domínio, este link continua levando ao texto. Use-o ao citar.
                </p>
              </>
            ) : (
              <>
                <p className="doi-reg__nota" style={{ marginTop: "1rem" }}>
                  Este artigo ainda não tem DOI registrado. Sem ele o trabalho não
                  entra nas bases que dependem desse identificador, e não há como
                  consultar citações por programa.
                </p>
                {a.journal.doiPrefix && (
                  <dl className="ficha">
                    <div><dt>Prefixo da revista</dt><dd>{a.journal.doiPrefix}</dd></div>
                  </dl>
                )}
              </>
            )}
          </div>

          {a.issue && (
            <div className="caixa">
              <div className="caixa__titulo">Edição</div>
              <p className="caixa__dado">
                <Link href={`/edicao/${a.issue.slug}`}>{a.issue.label}</Link>
              </p>
            </div>
          )}

          <div className="caixa">
            <div className="caixa__titulo">Seção</div>
            <p className="caixa__dado">{a.section?.name ?? "Artigos"}</p>
          </div>

          <div className="caixa">
            <div className="caixa__titulo">Licença</div>
            <p className="caixa__dado">
              <a href={a.license ?? "https://creativecommons.org/licenses/by/4.0/"} rel="license noreferrer">
                Creative Commons CC BY 4.0
              </a>
            </p>
            <p className="doi-reg__nota">
              Qualquer pessoa pode copiar, distribuir e adaptar este trabalho,
              inclusive para fins comerciais, desde que cite a autoria.
            </p>
          </div>

          <div className="caixa">
            <div className="caixa__titulo">Metadados abertos</div>
            <ul className="lista-limpa">
              {a.oaiIdentifier && (
                <li>
                  <a href={`/api/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(`oai:arace:${a.slug}`)}`}>
                    Registro OAI-PMH
                  </a>
                </li>
              )}
              {a.doi && (
                <li>
                  <a href={`https://api.crossref.org/works/${a.doi}`} rel="noreferrer">JSON do Crossref</a>
                </li>
              )}
              <li><a href={`/api/oai?verb=Identify`}>Servidor OAI desta revista</a></li>
              {a.legacyUrl && (
                <li><a href={a.legacyUrl} rel="noreferrer">Registro no portal anterior</a></li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
