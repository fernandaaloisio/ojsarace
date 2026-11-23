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
  // Sem envio da equipe, entra o cabeçalho oficial da revista, baixado do OJS:
  // a fotografia do amanhecer com a logo da ARACÊ já composta nela. Por isso
  // o portal não desenha nome nem logo por cima quando é esse o caso.
  const oficial = !bannerUrl && !logoUrl;
  const imagem = bannerUrl || "/cabecalho-arace.jpg";

  if (oficial) {
    return (
      <div className="banner banner--oficial">
        <div className="shell">
          <Link href="/" aria-label={`${titulo}, início`}>
            <img className="banner__cabecalho" src={imagem} alt={titulo} />
          </Link>
        </div>

        <div className="shell banner__faixa">
          <dl className="banner__dados">
            {issn && <div><dt>ISSN</dt><dd>{issn}</dd></div>}
            {qualis && <div><dt>Qualis CAPES</dt><dd>{qualis}</dd></div>}
            {publisher && <div><dt>Editora</dt><dd>{publisher}</dd></div>}
          </dl>
        </div>
      </div>
    );
  }

  return (
    <div className="banner">
      <img
        className="banner__fundo"
        src={imagem}
        alt={bannerAlt || `Banner da revista ${titulo}`}
        aria-hidden={bannerAlt ? undefined : true}
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
          {issn && <div><dt>ISSN</dt><dd>{issn}</dd></div>}
          {qualis && <div><dt>Qualis CAPES</dt><dd>{qualis}</dd></div>}
          {publisher && <div><dt>Editora</dt><dd>{publisher}</dd></div>}
        </dl>
      </div>
    </div>
  );
}
