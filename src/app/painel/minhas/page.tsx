import Link from "next/link";
import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/auth";
import { minhasSubmissoes } from "@/lib/painel";
import FilaSubmissoes from "@/components/FilaSubmissoes";
import { num } from "@/lib/text";

export default async function Minhas() {
  const u = await usuarioAtual();
  if (!u) redirect("/entrar?destino=/painel/minhas");
  const itens = await minhasSubmissoes(u.id);

  return (
    <>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "1rem", marginBottom: "1.75rem", flexWrap: "wrap" }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: "0.9rem" }}>Autoria</p>
          <h1 style={{ fontSize: "var(--step-3)" }}>Minhas submissões</h1>
          <p className="mono" style={{ color: "var(--ink-4)", marginTop: "0.6rem", fontSize: "var(--step--2)" }}>
            {num(itens.length)} no total
          </p>
        </div>
        <Link className="btn btn--solid btn--sm" href="/submeter">Nova submissão</Link>
      </header>

      <FilaSubmissoes itens={itens} vazio="Você ainda não submeteu nenhum manuscrito." />
    </>
  );
}
