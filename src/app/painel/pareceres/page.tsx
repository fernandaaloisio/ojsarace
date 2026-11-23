import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/auth";
import { meusPareceres } from "@/lib/painel";
import { SituacaoParecer } from "@/components/Situacao";
import { dataCurta } from "@/lib/text";
import { prazoTexto, RECOMENDACOES, SECOES } from "@/lib/fluxo";

export default async function MeusPareceres() {
  const u = await usuarioAtual();
  if (!u) redirect("/entrar?destino=/painel/pareceres");
  const itens = await meusPareceres(u);

  return (
    <>
      <header style={{ marginBottom: "1.75rem" }}>
        <p className="eyebrow" style={{ marginBottom: "0.9rem" }}>Avaliação por pares</p>
        <h1 style={{ fontSize: "var(--step-3)" }}>Meus pareceres</h1>
      </header>

      {itens.length === 0 ? (
        <div className="vazio">
          <strong>Nenhum convite</strong>
          Marque a opção de parecerista no seu perfil para receber convites da editoria.
        </div>
      ) : (
        <>
          <table className="tabela">
            <thead>
              <tr><th>Manuscrito</th><th>Situação</th><th>Prazo</th><th>Recomendação</th></tr>
            </thead>
            <tbody>
              {itens.map((p) => {
                const prazo = prazoTexto(p.dueAt);
                const aberto = ["convidado", "aceito"].includes(p.status);
                return (
                  <tr key={p.id}>
                    <td>
                      <span className="mono" style={{ color: "var(--ember)", fontSize: "var(--step--2)" }}>
                        {p.submission.code}
                      </span>
                      <br />{p.submission.title}
                      <br /><span style={{ fontSize: "var(--step--2)", color: "var(--ink-4)" }}>
                        {SECOES[p.submission.sectionCode as keyof typeof SECOES] ?? p.submission.sectionCode}
                        {" · rodada "}{p.round}
                        {" · convite de "}{dataCurta(p.invitedAt)}
                      </span>
                    </td>
                    <td><SituacaoParecer status={p.status} /></td>
                    <td className="mono" style={{ whiteSpace: "nowrap", color: aberto && prazo.atrasado ? "var(--ember)" : "var(--ink-3)" }}>
                      {aberto ? prazo.texto : p.completedAt ? dataCurta(p.completedAt) : "—"}
                    </td>
                    <td>
                      {p.recommendation
                        ? RECOMENDACOES[p.recommendation as keyof typeof RECOMENDACOES]
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <p className="campo__ajuda" style={{ marginTop: "1.25rem" }}>
            O formulário de parecer abre pelo link enviado no convite por e-mail. O link não
            exige conta e vale enquanto o convite estiver aberto.
          </p>
        </>
      )}
    </>
  );
}
