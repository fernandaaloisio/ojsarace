import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Formulario from "@/components/Formulario";
import { SituacaoParecer } from "@/components/Situacao";
import { convitePorToken, responderConvite, enviarParecer } from "@/app/acoes/parecer";
import { formatarTamanho } from "@/lib/editorial";
import { dataLonga, IDIOMAS } from "@/lib/text";
import { CRITERIOS, RECOMENDACOES, SECOES, TIPOS_ARQUIVO, prazoTexto } from "@/lib/fluxo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Parecer", robots: { index: false, follow: false } };

export default async function Parecer({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const a = await convitePorToken(token);
  if (!a) notFound();

  const s = a.submission;
  const prazo = prazoTexto(a.dueAt);
  const encerrado = ["recusado", "cancelado", "concluido"].includes(a.status);

  return (
    <section className="shell" style={{ maxWidth: "46rem", paddingBlock: "clamp(2rem, 5vw, 3.5rem) clamp(2rem, 5vw, 4rem)" }}>
      <p className="eyebrow" style={{ marginBottom: "1.25rem" }}>
        Avaliação por pares
        <span aria-hidden>·</span>
        ARACÊ
      </p>

      <h1 style={{ fontSize: "var(--step-3)", marginBottom: "1rem" }}>
        {a.status === "convidado" ? "Convite para parecer" : "Parecer"}
      </h1>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center", marginBottom: "1.5rem" }}>
        <SituacaoParecer status={a.status} />
        <span className={`selo${prazo.atrasado ? " selo--forte" : ""}`}>
          Prazo: {dataLonga(a.dueAt)} ({prazo.texto})
        </span>
        <span className="selo">Rodada {a.round}</span>
      </div>

      <div className="aviso">
        A avaliação é <strong>duplo-cega</strong>: a identidade dos autores não é revelada a você,
        nem a sua a eles. Se houver qualquer conflito de interesse — vínculo institucional,
        coautoria recente ou orientação —, recuse o convite indicando o motivo.
      </div>

      {/* ---------- o manuscrito, sem autoria ---------- */}
      <article style={{ borderTop: "1px solid var(--ink)", paddingTop: "1.5rem", marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "var(--step-2)", maxWidth: "36ch" }}>{s.title}</h2>
        {s.subtitle && <p style={{ color: "var(--ink-3)", marginTop: "0.5rem" }}>{s.subtitle}</p>}

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", margin: "1rem 0 1.5rem" }}>
          <span className="selo">{SECOES[s.sectionCode as keyof typeof SECOES] ?? s.sectionCode}</span>
          <span className="selo">{s.tipo}</span>
          <span className="selo">{IDIOMAS[s.language] ?? s.language}</span>
        </div>

        <p className="eyebrow" style={{ marginBottom: "0.85rem" }}>Resumo</p>
        <p style={{ color: "var(--ink-2)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{s.abstract}</p>

        <div className="filtros" style={{ padding: "0.5rem 0 1.5rem" }}>
          {s.keywords.split(";").map((k) => <span key={k} className="tag">{k.trim()}</span>)}
        </div>

        <p className="eyebrow" style={{ marginBottom: "0.85rem" }}>Arquivos</p>
        {s.files.length === 0 ? (
          <div className="aviso aviso--erro">
            A versão anonimizada ainda não está disponível. A editoria foi avisada;
            aguarde o arquivo antes de emitir o parecer.
          </div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.6rem" }}>
            {s.files.map((f) => (
              <li key={f.id}>
                <a className="btn btn--quiet btn--sm" href={`/api/arquivo/${f.id}?t=${token}`}>
                  Baixar {TIPOS_ARQUIVO[f.kind as keyof typeof TIPOS_ARQUIVO] ?? f.kind}
                </a>
                <span className="mono" style={{ fontSize: "var(--step--2)", color: "var(--ink-4)", marginLeft: "0.6rem" }}>
                  {formatarTamanho(f.size)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </article>

      {/* ---------- responder ao convite ---------- */}
      {a.status === "convidado" && (
        <div style={{ borderTop: "1px solid var(--rule)", paddingTop: "1.75rem", marginBottom: "2rem" }}>
          <p className="eyebrow" style={{ marginBottom: "1.25rem" }}>Você aceita avaliar?</p>
          <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(15rem, 1fr))" }}>
            <Formulario acao={responderConvite} rotulo="Aceitar o convite">
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="acao" value="aceitar" />
              <p className="campo__ajuda" style={{ marginBottom: "0.85rem" }}>
                Ao aceitar, o formulário de parecer é liberado nesta mesma página.
              </p>
            </Formulario>

            <Formulario acao={responderConvite} rotulo="Recusar" variante="quieto">
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="acao" value="recusar" />
              <div className="campo">
                <label htmlFor="motivo">Motivo da recusa</label>
                <textarea id="motivo" name="motivo" rows={3}
                          placeholder="Indisponibilidade, conflito de interesse, tema fora da minha área…" />
              </div>
            </Formulario>
          </div>
        </div>
      )}

      {/* ---------- formulário de parecer ---------- */}
      {a.status === "aceito" && (
        <div style={{ borderTop: "1px solid var(--ink)", paddingTop: "1.75rem" }}>
          <p className="eyebrow" style={{ marginBottom: "1.25rem" }}>Parecer</p>

          <Formulario acao={enviarParecer} rotulo="Enviar parecer"
                      confirmar="Enviar o parecer? Depois do envio não é possível editar.">
            <input type="hidden" name="token" value={token} />

            <fieldset className="grupo">
              <legend>Avaliação por critério</legend>
              <p className="campo__ajuda" style={{ marginBottom: "1.1rem" }}>
                De 1 (insuficiente) a 5 (excelente). Opcional, mas ajuda a editoria a comparar pareceres.
              </p>
              <div className="notas">
                {CRITERIOS.map((c) => (
                  <div className="nota-linha" key={c.chave}>
                    <span>{c.rotulo}</span>
                    <span className="escala">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <label key={n} title={`${n} de 5`}>
                          <input type="radio" name={`nota-${c.chave}`} value={n} />
                          {n}
                        </label>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </fieldset>

            <fieldset className="grupo">
              <legend>Parecer para os autores</legend>
              <div className="campo">
                <label htmlFor="autores" className="sr">Comentários para os autores</label>
                <textarea id="autores" name="autores" rows={14} required
                          placeholder="Apontamentos objetivos e fundamentados sobre o problema de pesquisa, a metodologia, os resultados, a discussão e as referências. Indique também os trabalhos relevantes que deveriam ter sido citados." />
                <span className="campo__ajuda">
                  Este texto é repassado integralmente aos autores, sem a sua identificação.
                  Evite crítica pessoal: avalie o manuscrito.
                </span>
              </div>
            </fieldset>

            <fieldset className="grupo">
              <legend>Confidencial, só para a editoria</legend>
              <div className="campo">
                <label htmlFor="editor" className="sr">Comentários confidenciais</label>
                <textarea id="editor" name="editor" rows={4}
                          placeholder="Suspeita de plágio, problema ético, ressalvas que não cabem aos autores." />
                <span className="campo__ajuda">Os autores nunca veem este campo.</span>
              </div>
            </fieldset>

            <fieldset className="grupo">
              <legend>Recomendação</legend>
              <div className="campo">
                <label htmlFor="rec" className="sr">Recomendação</label>
                <select id="rec" name="recomendacao" required defaultValue="">
                  <option value="" disabled>Escolha a recomendação</option>
                  {Object.entries(RECOMENDACOES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </fieldset>
          </Formulario>
        </div>
      )}

      {encerrado && (
        <div className={`aviso ${a.status === "concluido" ? "aviso--ok" : ""}`}>
          {a.status === "concluido" && (
            <>
              <strong>Parecer entregue.</strong> Obrigado pela colaboração com a ARACÊ.
              {a.completedAt && <> Enviado em {dataLonga(a.completedAt)}.</>}
            </>
          )}
          {a.status === "recusado" && <>Você recusou este convite. Obrigado por responder.</>}
          {a.status === "cancelado" && <>Este convite foi cancelado pela editoria.</>}
        </div>
      )}

      <p className="mono" style={{ fontSize: "var(--step--2)", color: "var(--ink-4)", marginTop: "3rem", paddingTop: "1rem", borderTop: "1px solid var(--rule)" }}>
        Guarde este endereço: é o seu acesso ao parecer, e não exige conta.
      </p>
    </section>
  );
}
