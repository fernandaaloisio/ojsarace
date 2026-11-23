import type { Metadata } from "next";
import { indexadores, revista, panorama, ultimaColeta } from "@/lib/queries";
import { num, dataLonga, SITE_URL } from "@/lib/text";

// Renderizada sob demanda, e não no build: o conteúdo muda quando a editoria
// publica, e o build não pode depender do banco já estar populado.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Indexação e dados abertos",
  description: "Bases em que a revista está indexada, protocolos de coleta disponíveis e estado de cada sincronização.",
};

const KINDS: Record<string, { rotulo: string; explicacao: string }> = {
  push: { rotulo: "Depósito", explicacao: "A revista envia os metadados para a base." },
  pull: { rotulo: "Coleta", explicacao: "A revista busca dados na base e atualiza o acervo." },
  harvest: { rotulo: "Colheita", explicacao: "A base coleta os metadados pelo nosso OAI-PMH." },
};

export default async function Indexacao() {
  const [idx, r, p, coleta] = await Promise.all([indexadores(), revista(), panorama(), ultimaColeta()]);

  const porTipo = new Map<string, typeof idx>();
  for (const i of idx) {
    if (!porTipo.has(i.kind)) porTipo.set(i.kind, []);
    porTipo.get(i.kind)!.push(i);
  }

  return (
    <>
      <header className="shell cabeca-pagina">
        <p className="eyebrow">Interoperabilidade</p>
        <h1>Indexação e dados abertos</h1>
        <p className="cabeca-pagina__linha">
          Todo o acervo é exposto em protocolos abertos. As bases abaixo coletam ou recebem
          os metadados dos {num(p.artigos)} artigos publicados.
        </p>
      </header>

      <div className="shell"><hr className="horizonte" style={{ ["--sol" as string]: "30%" }} /></div>

      <section className="shell" style={{ paddingBlock: "clamp(2rem, 4vw, 3rem)" }}>
        {[...porTipo.entries()].map(([kind, lista]) => (
          <div key={kind} style={{ marginBottom: "2.75rem" }}>
            <p className="eyebrow" style={{ marginBottom: "0.5rem" }}>
              {KINDS[kind]?.rotulo ?? kind}
            </p>
            <p style={{ color: "var(--ink-3)", fontSize: "var(--step--1)", marginBottom: "1.25rem", maxWidth: "48ch" }}>
              {KINDS[kind]?.explicacao}
            </p>

            <div className="indice">
              {lista.map((i) => (
                <div key={i.id} className="item" style={{ gridTemplateColumns: "minmax(0, 1fr) auto" }}>
                  <div>
                    <h3 className="item__titulo" style={{ fontSize: "var(--step-1)" }}>
                      {i.url ? <a href={i.url} rel="noreferrer">{i.name}</a> : i.name}
                    </h3>
                    <p className="item__autores">
                      {i.lastMessage ?? "Sem registro de sincronização."}
                      {i.identifier && <> · <span className="mono">{i.identifier}</span></>}
                    </p>
                    <div className="item__meta">
                      {i.lastSyncAt && <span className="selo">Última sincronização em {dataLonga(i.lastSyncAt)}</span>}
                      {i.recordCount > 0 && <span className="selo"><b>{num(i.recordCount)}</b> registros</span>}
                      {i.autoSync && <span className="selo selo--forte">Sincronização automática</span>}
                    </div>
                  </div>
                  <div className="item__lado">
                    <span className="indexador" data-status={i.status}>{i.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section style={{ background: "var(--paper-2)", borderBlock: "1px solid var(--rule)", paddingBlock: "clamp(2.5rem, 5vw, 3.5rem)" }}>
        <div className="shell">
          <p className="eyebrow" style={{ marginBottom: "1.5rem" }}>Pontos de acesso aos metadados</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))", gap: "1rem" }}>
            <Ponto titulo="OAI-PMH 2.0" href="/api/oai?verb=Identify"
                   descricao="Protocolo padrão de colheita. É por aqui que DOAJ, BASE, LA Referencia e o Google Scholar leem o acervo." />
            <Ponto titulo="Dublin Core" href="/api/oai?verb=ListRecords&metadataPrefix=oai_dc"
                   descricao="Todos os registros em oai_dc, paginados por token de retomada." />
            <Ponto titulo="Sitemap XML" href="/sitemap.xml"
                   descricao="Todas as URLs de artigos, edições e temas para os rastreadores." />
            <Ponto titulo="RSS" href="/feed.xml"
                   descricao="Os artigos mais recentes, para leitores e agregadores." />
            <Ponto titulo="Crossref" href={`https://api.crossref.org/journals/${r.issn}/works`}
                   descricao={`Registros de DOI sob o prefixo ${r.doiPrefix}, com citações e referências.`} />
          </div>

          {coleta && (
            <p className="mono" style={{ marginTop: "2rem", color: "var(--ink-3)", fontSize: "var(--step--2)" }}>
              Última coleta registrada: {dataLonga(coleta.startedAt)} · fonte {coleta.source} ·{" "}
              {num(coleta.fetched)} registros lidos, {num(coleta.created)} gravados · {coleta.message}
            </p>
          )}
          <p className="mono" style={{ color: "var(--ink-4)", fontSize: "var(--step--2)" }}>
            baseURL do OAI-PMH: {SITE_URL}/api/oai
          </p>
        </div>
      </section>
    </>
  );
}

function Ponto({ titulo, href, descricao }: { titulo: string; href: string; descricao: string }) {
  return (
    <a className="caixa" href={href} style={{ display: "block", background: "var(--paper)" }}>
      <div className="caixa__titulo" style={{ marginBottom: "0.5rem" }}>{titulo}</div>
      <p style={{ color: "var(--ink-3)", fontSize: "var(--step--1)", margin: 0, lineHeight: 1.55 }}>{descricao}</p>
    </a>
  );
}
