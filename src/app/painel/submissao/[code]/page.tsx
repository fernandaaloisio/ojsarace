import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { usuarioAtual, ehEditor } from "@/lib/auth";
import { submissaoPorCodigo } from "@/lib/painel";
import Situacao, { SituacaoParecer } from "@/components/Situacao";
import Formulario from "@/components/Formulario";
import { triar, convidarParecerista, decidir, cancelarConvite, lembrarParecerista } from "@/app/acoes/editor";
import { enviarVersaoNova, retirarSubmissao } from "@/app/acoes/submissao";
import { formatarTamanho } from "@/lib/editorial";
import { dataCurta, dataLonga, listarAutores, IDIOMAS } from "@/lib/text";
import {
  STATUS, DECISOES, RECOMENDACOES, CRITERIOS, TIPOS_ARQUIVO, SECOES,
  prazoTexto, type Status,
} from "@/lib/fluxo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  return { title: `Submissão ${code}`, robots: { index: false } };
}

export default async function DetalheSubmissao({
  params, searchParams,
}: { params: Promise<{ code: string }>; searchParams: Promise<{ novo?: string }> }) {
  const [{ code }, sp, u] = await Promise.all([params, searchParams, usuarioAtual()]);
  const s = await submissaoPorCodigo(code);
  if (!s || !u) notFound();

  const editor = ehEditor(u);
  const souAutor = s.submittedById === u.id;
  if (!editor && !souAutor) notFound();

  const encerrada = ["publicado", "recusado", "retirado", "arquivado"].includes(s.status);
  const naTriagem = ["submetido", "em_triagem"].includes(s.status);
  const pareceresRodada = s.assignments.filter((a) => a.round === s.round);
  const concluidos = s.assignments.filter((a) => a.status === "concluido");
  const eventos = editor ? s.events : s.events.filter((e) => e.publico);
  const prazo = prazoTexto(s.dueAt);

  return (
    <>
      {sp.novo && (
        <div className="aviso aviso--ok">
          <strong>Submissão recebida.</strong> O código {s.code} é a referência em toda a comunicação.
          Uma confirmação foi gerada para o autor correspondente.
        </div>
      )}

      {/* ---------- cabeçalho ---------- */}
      <header style={{ borderBottom: "1px solid var(--ink)", paddingBottom: "1.5rem", marginBottom: "2rem" }}>
        <p className="eyebrow" style={{ marginBottom: "0.9rem" }}>
          <span className="mono" style={{ color: "var(--ember)" }}>{s.code}</span>
          <span aria-hidden>·</span>
          Rodada {s.round}
        </p>
        <h1 style={{ fontSize: "var(--step-2)", maxWidth: "40ch" }}>{s.title}</h1>
        {s.subtitle && <p style={{ color: "var(--ink-3)", marginTop: "0.5rem" }}>{s.subtitle}</p>}

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "1.25rem", alignItems: "center" }}>
          <Situacao status={s.status} />
          <span className="selo">{SECOES[s.sectionCode as keyof typeof SECOES] ?? s.sectionCode}</span>
          <span className="selo">{s.tipo}</span>
          <span className="selo">{IDIOMAS[s.language] ?? s.language}</span>
          <span className="selo">Submetido em {dataCurta(s.submittedAt)}</span>
          {s.dueAt && (
            <span className={`selo${prazo.atrasado ? " selo--forte" : ""}`}>Prazo {prazo.texto}</span>
          )}
        </div>
        <p style={{ color: "var(--ink-3)", fontSize: "var(--step--1)", marginTop: "0.85rem", marginBottom: 0 }}>
          {STATUS[s.status as Status]?.descricao}
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 19rem)", gap: "clamp(1.5rem, 4vw, 3rem)", alignItems: "start" }}>
        <main>
          {/* ---------- resumo e dados ---------- */}
          <section style={{ marginBottom: "2.5rem" }}>
            <p className="eyebrow" style={{ marginBottom: "1rem" }}>Resumo</p>
            <p style={{ color: "var(--ink-2)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{s.abstract}</p>
            <div className="filtros" style={{ paddingTop: "0.5rem" }}>
              {s.keywords.split(";").map((k) => <span key={k} className="tag">{k.trim()}</span>)}
            </div>
          </section>

          {/* ---------- autoria: oculta de quem avalia, visível à editoria ---------- */}
          <section style={{ marginBottom: "2.5rem" }}>
            <p className="eyebrow" style={{ marginBottom: "1rem" }}>Autoria</p>
            <table className="tabela">
              <thead>
                <tr><th>Nome</th><th>Vínculo</th><th>ORCID</th></tr>
              </thead>
              <tbody>
                {s.authors.map((a) => (
                  <tr key={a.id}>
                    <td>
                      {a.name}
                      {a.isCorresponding && <span className="selo selo--forte" style={{ marginLeft: "0.5rem" }}>correspondente</span>}
                      <br /><span className="mono" style={{ fontSize: "var(--step--2)", color: "var(--ink-4)" }}>{a.email}</span>
                    </td>
                    <td>{[a.affiliation, a.country].filter(Boolean).join(" · ") || "—"}<br />
                        <span style={{ fontSize: "var(--step--2)", color: "var(--ink-4)" }}>{a.titulacao ?? ""}</span></td>
                    <td className="mono" style={{ fontSize: "var(--step--2)" }}>
                      {a.orcid
                        ? <a href={`https://orcid.org/${a.orcid}`} rel="noreferrer" style={{ color: "var(--moss)" }}>{a.orcid}</a>
                        : <span style={{ color: "var(--ember)" }}>ausente</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* ---------- declarações ---------- */}
          {(s.cep || s.financiamento || s.conflito || s.declaraIA || s.mensagem) && (
            <section style={{ marginBottom: "2.5rem" }}>
              <p className="eyebrow" style={{ marginBottom: "1rem" }}>Declarações</p>
              <dl className="tabela" style={{ display: "grid", gap: "0.75rem" }}>
                {([["Parecer do CEP", s.cep], ["Financiamento", s.financiamento],
                   ["Conflito de interesses", s.conflito], ["Uso de IA", s.declaraIA],
                   ["Mensagem à editoria", s.mensagem]] as const)
                  .filter(([, v]) => v)
                  .map(([rotulo, valor]) => (
                    <div key={rotulo} style={{ borderBottom: "1px solid var(--rule-soft)", paddingBottom: "0.6rem" }}>
                      <dt className="rotulo">{rotulo}</dt>
                      <dd style={{ margin: "0.3rem 0 0", color: "var(--ink-2)", whiteSpace: "pre-wrap" }}>{valor}</dd>
                    </div>
                  ))}
              </dl>
            </section>
          )}

          {/* ---------- pareceres ---------- */}
          {(editor || (souAutor && s.decisions.length > 0)) && concluidos.length > 0 && (
            <section style={{ marginBottom: "2.5rem" }}>
              <p className="eyebrow" style={{ marginBottom: "1.1rem" }}>
                Pareceres recebidos ({concluidos.length})
              </p>
              {concluidos.map((a, i) => {
                const notas: Record<string, number> = a.scores ? JSON.parse(a.scores) : {};
                return (
                  <article key={a.id} className="caixa" style={{ marginBottom: "1rem" }}>
                    <div className="caixa__titulo" style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
                      <span>Parecerista {String.fromCharCode(65 + i)} · rodada {a.round}</span>
                      {a.recommendation && (
                        <span className="selo selo--forte">
                          {RECOMENDACOES[a.recommendation as keyof typeof RECOMENDACOES]}
                        </span>
                      )}
                    </div>

                    {Object.keys(notas).length > 0 && (
                      <div className="notas" style={{ marginBottom: "1rem" }}>
                        {CRITERIOS.filter((c) => notas[c.chave]).map((c) => (
                          <div className="nota-linha" key={c.chave}>
                            <span>{c.rotulo}</span>
                            <span className="mono" style={{ color: "var(--ember)" }}>{notas[c.chave]}/5</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="rotulo" style={{ marginBottom: "0.4rem" }}>Para os autores</p>
                    <p style={{ whiteSpace: "pre-wrap", color: "var(--ink-2)", fontSize: "var(--step--1)", lineHeight: 1.65 }}>
                      {a.commentsToAuthor}
                    </p>

                    {editor && a.commentsToEditor && (
                      <>
                        <p className="rotulo" style={{ marginBottom: "0.4rem", color: "var(--ember)" }}>
                          Confidencial, só para a editoria
                        </p>
                        <p style={{ whiteSpace: "pre-wrap", color: "var(--ink-2)", fontSize: "var(--step--1)", lineHeight: 1.65, marginBottom: 0 }}>
                          {a.commentsToEditor}
                        </p>
                      </>
                    )}
                    {editor && (
                      <p className="mono" style={{ fontSize: "var(--step--2)", color: "var(--ink-4)", marginTop: "0.75rem", marginBottom: 0 }}>
                        {a.reviewerName} · {a.reviewerEmail} · entregue em {a.completedAt ? dataCurta(a.completedAt) : "—"}
                      </p>
                    )}
                  </article>
                );
              })}
            </section>
          )}

          {/* ---------- decisões ---------- */}
          {s.decisions.length > 0 && (
            <section style={{ marginBottom: "2.5rem" }}>
              <p className="eyebrow" style={{ marginBottom: "1.1rem" }}>Decisões editoriais</p>
              {s.decisions.map((d) => (
                <article key={d.id} className="caixa" style={{ marginBottom: "0.85rem" }}>
                  <div className="caixa__titulo">
                    Rodada {d.round} · {DECISOES[d.decision as keyof typeof DECISOES] ?? d.decision}
                  </div>
                  <p style={{ whiteSpace: "pre-wrap", color: "var(--ink-2)", fontSize: "var(--step--1)", lineHeight: 1.65, marginBottom: "0.5rem" }}>
                    {d.message}
                  </p>
                  <p className="mono" style={{ fontSize: "var(--step--2)", color: "var(--ink-4)", margin: 0 }}>
                    {d.editor.name} · {dataLonga(d.createdAt)}
                  </p>
                </article>
              ))}
            </section>
          )}

          {/* ---------- linha do tempo ---------- */}
          <section>
            <p className="eyebrow" style={{ marginBottom: "1.25rem" }}>Histórico</p>
            <div className="tempo">
              {eventos.map((e, i) => (
                <div key={e.id} className={`tempo__item${i === 0 ? " tempo__item--forte" : ""}`}>
                  <div className="tempo__quando">{dataLonga(e.createdAt)}</div>
                  <div className="tempo__texto">{e.message}</div>
                  {e.actor && <div className="tempo__quem">{e.actor.name}</div>}
                </div>
              ))}
            </div>
          </section>
        </main>

        {/* ================= coluna de ações ================= */}
        <aside style={{ display: "grid", gap: "1.25rem" }}>
          {/* arquivos */}
          <div className="caixa">
            <div className="caixa__titulo">Arquivos</div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.7rem" }}>
              {s.files.map((f) => (
                <li key={f.id} style={{ borderBottom: "1px solid var(--rule-soft)", paddingBottom: "0.6rem" }}>
                  <a href={`/api/arquivo/${f.id}`} style={{ color: "var(--ember)", fontSize: "var(--step--1)" }}>
                    {TIPOS_ARQUIVO[f.kind as keyof typeof TIPOS_ARQUIVO] ?? f.kind}
                  </a>
                  <p className="mono" style={{ fontSize: "var(--step--2)", color: "var(--ink-4)", margin: "0.2rem 0 0", wordBreak: "break-all" }}>
                    {f.originalName} · {formatarTamanho(f.size)} · rodada {f.round}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* ---- ações do editor ---- */}
          {editor && naTriagem && (
            <div className="caixa">
              <div className="caixa__titulo">Triagem editorial</div>
              <p className="campo__ajuda" style={{ marginBottom: "0.85rem" }}>
                Confira escopo, formato, originalidade e as declarações antes de liberar para avaliação.
              </p>
              <Formulario acao={triar} rotulo="Aprovar na triagem" compacto>
                <input type="hidden" name="code" value={s.code} />
                <input type="hidden" name="acao" value="aprovar" />
                <div className="campo">
                  <label htmlFor="nota-ap">Observação (opcional)</label>
                  <textarea id="nota-ap" name="nota" rows={2} />
                </div>
              </Formulario>
              <details style={{ marginTop: "1rem" }}>
                <summary className="mono" style={{ fontSize: "var(--step--2)", color: "var(--ink-3)", cursor: "pointer" }}>
                  Recusar na triagem
                </summary>
                <div style={{ marginTop: "0.85rem" }}>
                  <Formulario acao={triar} rotulo="Recusar" variante="quieto" compacto
                              confirmar="Recusar este manuscrito na triagem? O autor será notificado.">
                    <input type="hidden" name="code" value={s.code} />
                    <input type="hidden" name="acao" value="recusar" />
                    <div className="campo">
                      <label htmlFor="nota-rec">Justificativa para o autor</label>
                      <textarea id="nota-rec" name="nota" rows={4} required />
                    </div>
                  </Formulario>
                </div>
              </details>
            </div>
          )}

          {editor && !encerrada && !naTriagem && (
            <div className="caixa">
              <div className="caixa__titulo">Pareceristas da rodada {s.round}</div>

              {pareceresRodada.length === 0 && (
                <p className="campo__ajuda" style={{ marginBottom: "1rem" }}>
                  Nenhum convite nesta rodada. A política editorial pede no mínimo dois pareceristas.
                </p>
              )}

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.25rem", display: "grid", gap: "0.8rem" }}>
                {pareceresRodada.map((a) => {
                  const p = prazoTexto(a.dueAt);
                  return (
                    <li key={a.id} style={{ borderBottom: "1px solid var(--rule-soft)", paddingBottom: "0.7rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "center" }}>
                        <span style={{ fontSize: "var(--step--1)" }}>{a.reviewerName}</span>
                        <SituacaoParecer status={a.status} />
                      </div>
                      <p className="mono" style={{ fontSize: "var(--step--2)", color: p.atrasado ? "var(--ember)" : "var(--ink-4)", margin: "0.25rem 0 0" }}>
                        {a.reviewerEmail} · prazo {p.texto}
                      </p>
                      {a.declineReason && (
                        <p className="campo__ajuda" style={{ marginTop: "0.25rem" }}>Recusa: {a.declineReason}</p>
                      )}
                      {["convidado", "aceito"].includes(a.status) && (
                        <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.5rem" }}>
                          <Formulario acao={lembrarParecerista} rotulo="Lembrar" variante="quieto" compacto>
                            <input type="hidden" name="id" value={a.id} />
                          </Formulario>
                          <Formulario acao={cancelarConvite} rotulo="Cancelar" variante="quieto" compacto
                                      confirmar={`Cancelar o convite a ${a.reviewerName}?`}>
                            <input type="hidden" name="id" value={a.id} />
                          </Formulario>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              <Formulario acao={convidarParecerista} rotulo="Convidar" compacto>
                <input type="hidden" name="code" value={s.code} />
                <div className="campo">
                  <label htmlFor="pn">Nome do parecerista</label>
                  <input id="pn" name="nome" type="text" required />
                </div>
                <div className="campo">
                  <label htmlFor="pe">E-mail</label>
                  <input id="pe" name="email" type="email" required />
                </div>
                <div className="campo">
                  <label htmlFor="pp">Prazo (dias)</label>
                  <input id="pp" name="prazo" type="number" defaultValue={30} min={5} max={120} />
                </div>
              </Formulario>
            </div>
          )}

          {editor && !encerrada && !naTriagem && (
            <div className="caixa">
              <div className="caixa__titulo">Decisão editorial</div>
              <p className="campo__ajuda" style={{ marginBottom: "0.85rem" }}>
                {concluidos.length} {concluidos.length === 1 ? "parecer concluído" : "pareceres concluídos"}.
                {concluidos.length < 2 && " A política pede ao menos dois antes de decidir."}
              </p>
              <Formulario acao={decidir} rotulo="Registrar decisão" compacto
                          confirmar="Registrar esta decisão? O autor será notificado e os convites abertos serão cancelados.">
                <input type="hidden" name="code" value={s.code} />
                <div className="campo">
                  <label htmlFor="dec">Decisão</label>
                  <select id="dec" name="decisao" required defaultValue="">
                    <option value="" disabled>Escolha</option>
                    {Object.entries(DECISOES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="campo">
                  <label htmlFor="decm">Comunicação aos autores</label>
                  <textarea id="decm" name="mensagem" rows={6} required
                            placeholder="Síntese dos pareceres e orientações objetivas." />
                </div>
              </Formulario>
            </div>
          )}

          {/* ---- ações do autor ---- */}
          {souAutor && s.status === "ajustes_solicitados" && (
            <div className="caixa" style={{ borderColor: "var(--ember)" }}>
              <div className="caixa__titulo" style={{ color: "var(--ember)" }}>Enviar nova versão</div>
              <Formulario acao={enviarVersaoNova} rotulo="Enviar versão reformulada" compacto>
                <input type="hidden" name="code" value={s.code} />
                <div className="campo">
                  <label htmlFor="vf">Arquivo reformulado</label>
                  <input id="vf" name="versao" type="file" required accept=".docx,.doc,.odt,.pdf" />
                </div>
                <div className="campo">
                  <label htmlFor="vr">Resposta aos pareceres</label>
                  <textarea id="vr" name="resposta" rows={7} required
                            placeholder="Item a item: o que foi apontado e como foi atendido." />
                </div>
              </Formulario>
            </div>
          )}

          {souAutor && !encerrada && (
            <details>
              <summary className="mono" style={{ fontSize: "var(--step--2)", color: "var(--ink-4)", cursor: "pointer" }}>
                Retirar submissão
              </summary>
              <div className="caixa" style={{ marginTop: "0.75rem" }}>
                <Formulario acao={retirarSubmissao} rotulo="Retirar" variante="quieto" compacto
                            confirmar="Retirar esta submissão? A ação encerra o processo.">
                  <input type="hidden" name="code" value={s.code} />
                  <div className="campo">
                    <label htmlFor="mot">Motivo</label>
                    <textarea id="mot" name="motivo" rows={3} />
                  </div>
                </Formulario>
              </div>
            </details>
          )}

          {editor && (
            <div className="caixa">
              <div className="caixa__titulo">Mensagens geradas</div>
              {s.notifications.length === 0
                ? <p className="campo__ajuda">Nenhuma mensagem gerada ainda.</p>
                : (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.5rem" }}>
                    {s.notifications.slice(0, 6).map((n) => (
                      <li key={n.id} className="mono" style={{ fontSize: "var(--step--2)", color: "var(--ink-3)" }}>
                        <span style={{ color: n.status === "pendente" ? "var(--dawn)" : "var(--moss)" }}>●</span>{" "}
                        {n.subject}
                      </li>
                    ))}
                  </ul>
                )}
              <p style={{ marginTop: "0.85rem", marginBottom: 0 }}>
                <Link className="mono" href="/painel/mensagens" style={{ color: "var(--ember)", fontSize: "var(--step--2)" }}>
                  Abrir a fila de envio →
                </Link>
              </p>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
