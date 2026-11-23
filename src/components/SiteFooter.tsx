import Link from "next/link";

type Pagina = { slug: string; title: string };

export default function SiteFooter({
  titulo, issn, doiPrefix, publisher, qualis, paginas,
}: {
  titulo: string; issn: string | null; doiPrefix: string | null;
  publisher: string | null; qualis: string | null; paginas: Pagina[];
}) {
  return (
    <footer className="rodape">
      <div className="shell">
        <div className="rodape__grade">
          <div>
            <div className="marca" style={{ marginBottom: "0.9rem" }}>
              <span className="marca__sol" aria-hidden />
              <span className="marca__nome">{titulo}</span>
            </div>
            <p style={{ color: "var(--ink-3)", maxWidth: "34ch", lineHeight: 1.6 }}>
              Revista científica interdisciplinar de acesso aberto, publicada em fluxo contínuo
              por {publisher ?? "New Science Publishers"}.
            </p>
            <dl className="mono" style={{ display: "grid", gap: "0.3rem", marginTop: "1.25rem", color: "var(--ink-3)" }}>
              {issn && <div><dt style={{ display: "inline" }}>ISSN </dt><dd style={{ display: "inline", margin: 0, color: "var(--ink-2)" }}>{issn}</dd></div>}
              {doiPrefix && <div><dt style={{ display: "inline" }}>Prefixo DOI </dt><dd style={{ display: "inline", margin: 0, color: "var(--ink-2)" }}>{doiPrefix}</dd></div>}
              {qualis && <div><dt style={{ display: "inline" }}>Qualis CAPES </dt><dd style={{ display: "inline", margin: 0, color: "var(--ink-2)" }}>{qualis} (2021-2024)</dd></div>}
            </dl>
          </div>

          <div>
            <h3>Acervo</h3>
            <ul>
              <li><Link href="/edicao-atual">Edição atual</Link></li>
              <li><Link href="/arquivo">Todas as edições</Link></li>
              <li><Link href="/busca">Busca avançada</Link></li>
              <li><Link href="/explorar">Mapa de temas</Link></li>
              <li><Link href="/autores">Autores</Link></li>
            </ul>
          </div>

          <div>
            <h3>A revista</h3>
            <ul>
              {paginas.map((p) => (
                <li key={p.slug}><Link href={`/${p.slug}`}>{p.title}</Link></li>
              ))}
              <li><Link href="/indexacao">Indexação e métricas</Link></li>
            </ul>
          </div>

          <div>
            <h3>Dados abertos</h3>
            <ul>
              <li><a href="/api/oai?verb=Identify">Servidor OAI-PMH</a></li>
              <li><a href="/feed.xml">RSS dos artigos</a></li>
              <li><a href="/sitemap.xml">Sitemap</a></li>
              <li><a href="https://search.crossref.org/?q=2358-2472" rel="noreferrer">Registros no Crossref</a></li>
            </ul>
          </div>
        </div>

        <div className="rodape__base">
          <span>
            Conteúdo sob licença{" "}
            <a href="https://creativecommons.org/licenses/by/4.0/deed.pt-br" rel="license noreferrer">CC BY 4.0</a>
          </span>
          <span>Aurora · plataforma editorial própria</span>
        </div>
      </div>
    </footer>
  );
}
