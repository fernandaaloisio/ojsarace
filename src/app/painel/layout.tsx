import Link from "next/link";
import { redirect } from "next/navigation";
import { usuarioAtual, ehEditor } from "@/lib/auth";
import { contagensEditorial, mensagensPendentes, minhasSubmissoes, meusPareceres } from "@/lib/painel";
import { sair } from "@/app/acoes/conta";

export const dynamic = "force-dynamic";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const u = await usuarioAtual();
  if (!u) redirect("/entrar?destino=/painel");

  const editor = ehEditor(u);
  const [minhas, pareceres, contagens, pendentes] = await Promise.all([
    minhasSubmissoes(u.id),
    meusPareceres(u),
    editor ? contagensEditorial() : Promise.resolve(null),
    editor ? mensagensPendentes() : Promise.resolve(0),
  ]);

  const pareceresAbertos = pareceres.filter((p) => ["convidado", "aceito"].includes(p.status)).length;

  return (
    <div className="shell painel">
      <nav className="painel__rail" aria-label="Painel">
        <Link href="/painel">Início</Link>
        <Link href="/painel/minhas">Minhas submissões <b>{minhas.length}</b></Link>
        {pareceres.length > 0 && (
          <Link href="/painel/pareceres">Meus pareceres <b>{pareceresAbertos || pareceres.length}</b></Link>
        )}
        <Link href="/submeter">Nova submissão</Link>

        {editor && contagens && (
          <>
            <span className="rotulo" style={{ marginTop: "1.25rem", paddingTop: "0.85rem", borderTop: "1px solid var(--rule)" }}>
              Editoria
            </span>
            <Link href="/painel/fila">Fila editorial <b>{contagens.abertas}</b></Link>
            <Link href="/painel/fila?f=todas">Todas <b>{contagens.total}</b></Link>
            <Link href="/painel/mensagens">Mensagens <b>{pendentes}</b></Link>
            <Link href="/painel/citacoes">Citações no Scholar</Link>
            <Link href="/painel/identidade">Identidade visual</Link>
          </>
        )}

        <span className="rotulo" style={{ marginTop: "1.25rem", paddingTop: "0.85rem", borderTop: "1px solid var(--rule)" }}>
          {u.name}
        </span>
        <Link href="/painel/perfil">Meu perfil</Link>
        <form action={sair}>
          <button type="submit"
                  style={{ background: "none", border: 0, padding: "0.4rem 0", font: "inherit",
                           fontSize: "var(--step--1)", color: "var(--ink-4)", cursor: "pointer" }}>
            Sair
          </button>
        </form>
      </nav>

      <div>{children}</div>
    </div>
  );
}
