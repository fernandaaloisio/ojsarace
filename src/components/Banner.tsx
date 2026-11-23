import Link from "next/link";

/**
 * Banner institucional do topo. A imagem e a logo vêm do cadastro da revista
 * e são trocadas pela equipe em /painel/identidade, sem tocar no código.
 * Enquanto nada tiver sido enviado, entra a proposta visual padrão.
 */
export default function Banner({
  titulo, issn, qualis, publisher, bannerUrl, bannerAlt, bannerFoco, logoUrl,
}: {
  titulo: string;
  issn: string | null;
  qualis: string | null;
  publisher: string | null;
  bannerUrl: string | null;
  bannerAlt: string | null;
  bannerFoco: string | null;
  logoUrl: string | null;
}) {
  const imagem = bannerUrl || "/banner-arace.svg";
  const padrao = !bannerUrl;

  return (
    <div className="banner">
      <img
        className="banner__fundo"
        src={imagem}
        alt={bannerAlt || (padrao ? "" : `Banner da revista ${titulo}`)}
        aria-hidden={padrao || !bannerAlt ? true : undefined}
        style={{ objectPosition: bannerFoco || "center center" }}
      />

      <div className="banner__veu" aria-hidden />

      <div className="shell banner__conteudo">
        <Link href="/" className="banner__marca">
          {logoUrl ? (
            <img className="banner__logo" src={logoUrl} alt={titulo} />
          ) : (
            <>
              <span className="banner__sol" aria-hidden />
              <span className="banner__nome">{titulo}</span>
            </>
          )}
        </Link>

        <p className="banner__linha">
          Revista científica interdisciplinar de acesso aberto
        </p>

        <dl className="banner__dados">
          {issn && (
            <div><dt>ISSN</dt><dd>{issn}</dd></div>
          )}
          {qualis && (
            <div><dt>Qualis CAPES</dt><dd>{qualis}</dd></div>
          )}
          {publisher && (
            <div><dt>Editora</dt><dd>{publisher}</dd></div>
          )}
        </dl>
      </div>
    </div>
  );
}
