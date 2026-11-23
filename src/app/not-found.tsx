import Link from "next/link";
import CampoBusca from "@/components/CampoBusca";

export default function NaoEncontrado() {
  return (
    <section className="shell" style={{ paddingBlock: "clamp(4rem, 12vw, 9rem)", maxWidth: "48rem" }}>
      <p className="eyebrow" style={{ marginBottom: "1.5rem" }}>Erro 404</p>
      <h1 style={{ fontSize: "var(--step-4)", letterSpacing: "-0.028em" }}>
        Esta página não existe no acervo.
      </h1>
      <p style={{ color: "var(--ink-3)", fontSize: "var(--step-1)", marginTop: "1.25rem", maxWidth: "44ch" }}>
        O endereço pode ter mudado na migração do portal anterior. Busque pelo título ou pelo DOI do artigo.
      </p>
      <div style={{ marginTop: "2rem" }}><CampoBusca /></div>
      <div style={{ display: "flex", gap: "0.6rem", marginTop: "1.5rem", flexWrap: "wrap" }}>
        <Link className="btn btn--quiet" href="/">Início</Link>
        <Link className="btn btn--quiet" href="/arquivo">Arquivo de edições</Link>
        <Link className="btn btn--quiet" href="/explorar">Mapa de temas</Link>
      </div>
    </section>
  );
}
