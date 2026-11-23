import Link from "next/link";
import { redirect } from "next/navigation";
import { usuarioAtual, ehEditor } from "@/lib/auth";
import {
  minhasSubmissoes, meusPareceres, filaEditorial, contagensEditorial,
  pareceresAtrasados, mensagensPendentes,
} from "@/lib/painel";
import FilaSubmissoes from "@/components/FilaSubmissoes";
import { SituacaoParecer } from "@/components/Situacao";
import { dataCurta, num } from "@/lib/text";
import { prazoTexto, ABERTOS, STATUS, type Status } from "@/lib/fluxo";

export default async function Painel() {
  const u = await usuarioAtual();
  if (!u) redirect("/entrar?destino=/painel");
  const editor = ehEditor(u);

  const [minhas, pareceres, fila, contagens, atrasados, pendentes] = await Promise.all([
    minhasSubmissoes(u.id),
    meusPareceres(u),
    editor ? filaEditorial() : Promise.resolve([]),
    editor ? contagensEditorial() : Promise.resolve(null),
    editor ? pareceresAtrasados() : Promise.resolve([]),
    editor ? mensagensPendentes() : Promise.resolve(0),
  ]);

  const pareceresAbertos = pareceres.filter((p) => ["convidado", "aceito"].includes(p.status));
  const minhasAbertas = minhas.filter((s) => ABERTOS.includes(s.status as Status));
  const precisaAcao = minhas.filter((s) => s.status === "ajustes_solicitados");

  return (
    <>
      <header style={{ marginBottom: "2.5rem" }}>
        <p className="eyebrow" style={{ marginBottom: "0.9rem" }}>Painel</p>
        <h1 style={{ fontSize: "var(--step-3)" }}>{u.name}</h1>
        <p className="mono" style={{ color: "var(--ink-4)", marginTop: "0.5rem", fontSize: "var(--step--2)" }}>
          {u.papeis.map((p) => p).join(" · ")}
          {u.orcid && <> · ORCID {u.orcid}</>}
        </p>
      </header>

      {/* ---------- o que exige ação ---------- */}
      {precisaAcao.length > 0 && (
        <div className="aviso aviso--erro" style={{ marginBottom: "2rem" }}>
          <strong>Ajustes solicitados.</strong>{" "}
          {precisaAcao.map((s) => (
            <Link key={s.id} href={`/painel/submissao/${s.code}`} style={{ borderBottom: "1px solid currentColor" }}>
              {s.code}
            </Link>
          )).reduce((a, b) => <>{a}, {b}</>)}
          {" "}aguarda{precisaAcao.length > 1 ? "m" : ""} nova versão.
        </div>
      )}

      {pareceresAbertos.length > 0 && (
        <section style={{ marginBottom: "3rem" }}>
          <p className="eyebrow" style={{ marginBottom: "1.1rem" }}>Pareceres com você</p>
          <table className="tabela">
            <thead>
              <tr><th>Manuscrito</th><th>Situação</th><th>Prazo</th></tr>
            </thead>
            <tbody>
              {pareceresAbertos.map((p) => {
                const prazo = prazoTexto(p.dueAt);
                return (
                  <tr key={p.id}>
                    <td>
                      <span className="mono" style={{ color: "var(--ember)", fontSize: "var(--step--2)" }}>{p.submission.code}</span>
                      <br />{p.submission.title}
                    </td>
                    <td><SituacaoParecer status={p.status} /></td>
                    <td className="mono" style={{ color: prazo.atrasado ? "var(--ember)" : "var(--ink-3)", whiteSpace: "nowrap" }}>
                      {prazo.texto}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="campo__ajuda" style={{ marginTop: "0.85rem" }}>
            O acesso ao formulário de parecer é pelo link enviado no convite por e-mail.
          </p>
        </section>
      )}

      {/* ---------- visão da editoria ---------- */}
      {editor && contagens && (
        <>
          <section style={{ marginBottom: "2.5rem" }}>
            <p className="eyebrow" style={{ marginBottom: "1.25rem" }}>Fila editorial</p>
            <div className="numeros" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(9rem, 1fr))" }}>
              {(["submetido", "em_avaliacao", "aguardando_decisao", "ajustes_solicitados"] as Status[]).map((st) => (
                <div className="numeros__item" key={st} style={{ borderRight: "1px solid var(--rule)", paddingInline: "0 1rem" }}>
                  <span className="numeros__valor" style={{ fontSize: "var(--step-3)" }}>
                    {num(contagens.porStatus[st] ?? 0)}
                  </span>
                  <span className="numeros__rotulo">{STATUS[st].rotulo}</span>
                </div>
              ))}
            </div>
          </section>

          {atrasados.length > 0 && (
            <div className="aviso aviso--erro" style={{ marginBottom: "2rem" }}>
              <strong>{atrasados.length} {atrasados.length === 1 ? "parecer atrasado" : "pareceres atrasados"}.</strong>
              <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.1rem" }}>
                {atrasados.slice(0, 5).map((a) => (
                  <li key={a.id}>
                    <Link href={`/painel/submissao/${a.submission.code}`} style={{ borderBottom: "1px solid currentColor" }}>
                      {a.submission.code}
                    </Link>{" "}
                    — {a.reviewerName}, venceu em {dataCurta(a.dueAt)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {pendentes > 0 && (
            <div className="aviso" style={{ marginBottom: "2rem" }}>
              <strong>{pendentes} {pendentes === 1 ? "mensagem" : "mensagens"} na fila de envio.</strong>{" "}
              Sem SMTP configurado, as mensagens ficam aqui para serem copiadas e enviadas.{" "}
              <Link href="/painel/mensagens" style={{ color: "var(--ember)" }}>Abrir a fila →</Link>
            </div>
          )}

          <section style={{ marginBottom: "3rem" }}>
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "1rem", marginBottom: "1.1rem" }}>
              <p className="eyebrow" style={{ margin: 0 }}>Submissões abertas</p>
              <Link className="mono" href="/painel/fila" style={{ color: "var(--ember)", fontSize: "var(--step--2)" }}>
                ver todas →
              </Link>
            </header>
            <FilaSubmissoes itens={fila.slice(0, 12)} vazio="Nenhuma submissão aguardando a editoria." />
          </section>
        </>
      )}

      {/* ---------- submissões do autor ---------- */}
      <section>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "1rem", marginBottom: "1.1rem" }}>
          <p className="eyebrow" style={{ margin: 0 }}>Minhas submissões</p>
          <Link className="btn btn--quiet btn--sm" href="/submeter">Nova submissão</Link>
        </header>
        <FilaSubmissoes
          itens={minhasAbertas.length ? minhasAbertas : minhas.slice(0, 10)}
          vazio="Você ainda não submeteu nenhum manuscrito."
        />
      </section>
    </>
  );
}
