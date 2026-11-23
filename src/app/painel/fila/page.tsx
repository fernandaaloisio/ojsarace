import Link from "next/link";
import { notFound } from "next/navigation";
import { usuarioAtual, ehEditor } from "@/lib/auth";
import { filaEditorial, contagensEditorial } from "@/lib/painel";
import FilaSubmissoes from "@/components/FilaSubmissoes";
import { STATUS, type Status } from "@/lib/fluxo";
import { num } from "@/lib/text";

export default async function Fila({
  searchParams,
}: { searchParams: Promise<{ f?: string }> }) {
  const u = await usuarioAtual();
  if (!ehEditor(u)) notFound();

  const { f } = await searchParams;
  const filtro = f ?? "abertas";
  const [itens, contagens] = await Promise.all([filaEditorial(filtro), contagensEditorial()]);

  const opcoes: { chave: string; rotulo: string; n: number }[] = [
    { chave: "abertas", rotulo: "Abertas", n: contagens.abertas },
    { chave: "todas", rotulo: "Todas", n: contagens.total },
    ...Object.keys(STATUS)
      .filter((k) => (contagens.porStatus[k] ?? 0) > 0)
      .map((k) => ({ chave: k, rotulo: STATUS[k as Status].rotulo, n: contagens.porStatus[k] })),
  ];

  return (
    <>
      <header style={{ marginBottom: "1.5rem" }}>
        <p className="eyebrow" style={{ marginBottom: "0.9rem" }}>Editoria</p>
        <h1 style={{ fontSize: "var(--step-3)" }}>Fila editorial</h1>
        <p className="mono" style={{ color: "var(--ink-4)", marginTop: "0.6rem", fontSize: "var(--step--2)" }}>
          {num(itens.length)} {itens.length === 1 ? "submissão" : "submissões"} nesta visão
        </p>
      </header>

      <div className="filtros" style={{ borderBottom: "1px solid var(--rule)", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
        {opcoes.map((o) => (
          <Link key={o.chave} className="tag" href={`/painel/fila?f=${o.chave}`}
                style={filtro === o.chave ? { borderColor: "var(--ember)", color: "var(--ember)" } : undefined}>
            {o.rotulo} <span style={{ color: "var(--ink-4)" }}>{o.n}</span>
          </Link>
        ))}
      </div>

      <FilaSubmissoes itens={itens} vazio="Nenhuma submissão nesta situação." />
    </>
  );
}
