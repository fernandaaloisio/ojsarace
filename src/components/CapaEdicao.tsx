import Link from "next/link";

/**
 * Capa da edição, montada a partir dos dados.
 *
 * As revistas põem a capa do fascículo na página do artigo e no sumário.
 * Nenhuma das edições da ARACÊ tem imagem cadastrada, então em vez de deixar
 * o espaço vazio a capa é composta aqui, com a marca, o nome da revista e a
 * identificação do fascículo. Quando a editoria subir capas de verdade, basta
 * passar `imagem` e ela entra no lugar.
 */
export default function CapaEdicao({
  revista, label, ano, slug, imagem, compacta = false,
}: {
  revista: string;
  label: string;
  ano?: number | null;
  slug: string;
  imagem?: string | null;
  compacta?: boolean;
}) {
  const conteudo = imagem ? (
    <img className="capa__img" src={imagem} alt={`Capa da edição ${label}`} />
  ) : (
    <>
      <span className="capa__marca" aria-hidden />
      <span className="capa__nome">{revista}</span>
      <span className="capa__linha" aria-hidden />
      <span className="capa__ed">{label}</span>
      {ano && <span className="capa__ano">{ano}</span>}
    </>
  );

  return (
    <Link
      className={`capa${compacta ? " capa--compacta" : ""}${imagem ? " capa--foto" : ""}`}
      href={`/edicao/${slug}`}
      aria-label={`Edição ${label}`}
    >
      {conteudo}
    </Link>
  );
}
