import Link from "next/link";
import type { ItemArtigo as Item } from "@/lib/queries";
import { dataCurta, listarAutores, IDIOMAS, num } from "@/lib/text";

/** Linha do índice: ordem em mono, título em display, metadados em régua.
 *  É o componente mais reutilizado do portal — home, edição, busca e autor. */
export default function ItemArtigo({
  artigo, ordem, mostrarEdicao = false,
}: { artigo: Item; ordem?: string | number; mostrarEdicao?: boolean }) {
  const autores = artigo.authors.map((a) => a.author.name);
  const paginas = artigo.elocationId
    ? artigo.elocationId
    : artigo.firstPage
      ? [artigo.firstPage, artigo.lastPage].filter(Boolean).join("-")
      : null;

  return (
    <article className="item">
      <div className="item__ordem">
        {ordem != null ? String(ordem).padStart(3, "0") : paginas ?? ""}
      </div>

      <div>
        <h3 className="item__titulo">
          <Link href={`/artigo/${artigo.slug}`}>{artigo.title}</Link>
        </h3>

        {autores.length > 0 && (
          <p className="item__autores">{listarAutores(autores, 6)}</p>
        )}

        <div className="item__meta">
          {artigo.doi && (
            <span className="selo selo--doi">
              <a href={`https://doi.org/${artigo.doi}`} rel="noreferrer">{artigo.doi}</a>
            </span>
          )}
          {mostrarEdicao && artigo.issue && (
            <span className="selo">
              <Link href={`/edicao/${artigo.issue.slug}`}>{artigo.issue.label}</Link>
            </span>
          )}
          {artigo.publishedAt && <span className="selo">{dataCurta(artigo.publishedAt)}</span>}
          {artigo.citationCount > 0 && (
            <span className="selo selo--forte">
              {num(artigo.citationCount)} {artigo.citationCount === 1 ? "citação" : "citações"}
            </span>
          )}
        </div>
      </div>

      <div className="item__lado">
        {artigo.language && artigo.language !== "pt" && (
          <span className="tag tag--idioma" title={IDIOMAS[artigo.language] ?? artigo.language}>
            {artigo.language}
          </span>
        )}
        {artigo.pdfUrl && (
          <a className="btn btn--quiet btn--sm" href={`/api/baixar/${artigo.slug}`} rel="noreferrer"
             aria-label={`Baixar PDF: ${artigo.title}`}>
            PDF
          </a>
        )}
      </div>
    </article>
  );
}
