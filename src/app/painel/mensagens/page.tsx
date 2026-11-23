import Link from "next/link";
import { notFound } from "next/navigation";
import { usuarioAtual, ehEditor } from "@/lib/auth";
import { db } from "@/lib/db";
import Formulario from "@/components/Formulario";
import { marcarEnviada } from "@/app/acoes/editor";
import { dataLonga, num } from "@/lib/text";

export const dynamic = "force-dynamic";

export default async function Mensagens({
  searchParams,
}: { searchParams: Promise<{ f?: string }> }) {
  const u = await usuarioAtual();
  if (!ehEditor(u)) notFound();

  const { f } = await searchParams;
  const filtro = f ?? "pendente";

  const [itens, pendentes, enviadas] = await Promise.all([
    db.notification.findMany({
      where: filtro === "todas" ? {} : { status: filtro },
      orderBy: { createdAt: "desc" },
      take: 60,
      include: { submission: { select: { code: true } } },
    }),
    db.notification.count({ where: { status: "pendente" } }),
    db.notification.count({ where: { status: "enviada" } }),
  ]);

  return (
    <>
      <header style={{ marginBottom: "1.5rem" }}>
        <p className="eyebrow" style={{ marginBottom: "0.9rem" }}>Editoria</p>
        <h1 style={{ fontSize: "var(--step-3)" }}>Fila de mensagens</h1>
        <p style={{ color: "var(--ink-3)", maxWidth: "56ch", marginTop: "0.85rem" }}>
          Toda ação do fluxo gera a mensagem correspondente, com o texto pronto.
          Enquanto não houver servidor de e-mail configurado, copie daqui e envie
          pelo cliente de e-mail da revista, depois marque como enviada.
        </p>
      </header>

      <div className="filtros" style={{ borderBottom: "1px solid var(--rule)", paddingBottom: "1rem", marginBottom: "1.75rem" }}>
        {[
          { k: "pendente", r: "Pendentes", n: pendentes },
          { k: "enviada", r: "Enviadas", n: enviadas },
          { k: "todas", r: "Todas", n: pendentes + enviadas },
        ].map((o) => (
          <Link key={o.k} className="tag" href={`/painel/mensagens?f=${o.k}`}
                style={filtro === o.k ? { borderColor: "var(--ember)", color: "var(--ember)" } : undefined}>
            {o.r} <span style={{ color: "var(--ink-4)" }}>{num(o.n)}</span>
          </Link>
        ))}
      </div>

      {itens.length === 0 ? (
        <div className="vazio"><strong>Fila vazia</strong>Nenhuma mensagem nesta visão.</div>
      ) : (
        <div style={{ display: "grid", gap: "1.25rem" }}>
          {itens.map((n) => (
            <article key={n.id} className="caixa">
              <div className="caixa__titulo" style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                <span>
                  {n.kind}
                  {n.submission && <> · <Link href={`/painel/submissao/${n.submission.code}`} style={{ color: "var(--ember)" }}>{n.submission.code}</Link></>}
                </span>
                <span style={{ color: n.status === "pendente" ? "var(--dawn)" : "var(--moss)" }}>
                  {n.status === "pendente" ? "pendente" : `enviada em ${n.sentAt ? dataLonga(n.sentAt) : "—"}`}
                </span>
              </div>

              <dl className="mono" style={{ fontSize: "var(--step--2)", display: "grid", gap: "0.25rem", margin: "0 0 0.85rem" }}>
                <div><dt style={{ display: "inline", color: "var(--ink-4)" }}>Para: </dt>
                     <dd style={{ display: "inline", margin: 0, color: "var(--ink-2)" }}>{n.toName} &lt;{n.toEmail}&gt;</dd></div>
                <div><dt style={{ display: "inline", color: "var(--ink-4)" }}>Assunto: </dt>
                     <dd style={{ display: "inline", margin: 0, color: "var(--ink-2)" }}>{n.subject}</dd></div>
                <div><dt style={{ display: "inline", color: "var(--ink-4)" }}>Gerada em: </dt>
                     <dd style={{ display: "inline", margin: 0, color: "var(--ink-2)" }}>{dataLonga(n.createdAt)}</dd></div>
              </dl>

              <div className="mensagem__corpo">{n.body}</div>

              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.9rem", flexWrap: "wrap" }}>
                <a className="btn btn--quiet btn--sm"
                   href={`mailto:${encodeURIComponent(n.toEmail)}?subject=${encodeURIComponent(n.subject)}&body=${encodeURIComponent(n.body)}`}>
                  Abrir no cliente de e-mail
                </a>
                {n.status === "pendente" && (
                  <Formulario acao={marcarEnviada} rotulo="Marcar como enviada" variante="quieto" compacto>
                    <input type="hidden" name="id" value={n.id} />
                  </Formulario>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
