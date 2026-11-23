import Link from "next/link";
import { notFound } from "next/navigation";
import { usuarioAtual, ehEditor } from "@/lib/auth";
import { db } from "@/lib/db";
import Formulario from "@/components/Formulario";
import { salvarCitacoes } from "@/app/acoes/citacoes";
import { buscaScholar, estadoScholar } from "@/lib/scholar";
import { dataLonga, num, listarAutores } from "@/lib/text";

export const dynamic = "force-dynamic";

/** AAAA-MM-DD para o <input type="date">, no fuso UTC em que foi guardado. */
const paraCampo = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export default async function ConferirCitacoes({ params }: { params: Promise<{ slug: string }> }) {
  const u = await usuarioAtual();
  if (!ehEditor(u)) notFound();

  const { slug } = await params;
  const a = await db.article.findUnique({
    where: { slug },
    select: {
      slug: true, title: true, doi: true, publishedAt: true,
      citationCount: true, citationSource: true, citationAt: true,
      scholarCount: true, scholarCheckedAt: true, scholarUrl: true, scholarDemo: true,
      issue: { select: { label: true } },
      scholarBy: { select: { name: true } },
      authors: { orderBy: { position: "asc" }, select: { author: { select: { name: true } } } },
    },
  });
  if (!a) notFound();

  const busca = buscaScholar(a.title, a.doi);
  const estado = estadoScholar(a.scholarCount);
  const autores = a.authors.map((x) => x.author.name);

  return (
    <div style={{ maxWidth: "42rem" }}>
      <p className="mono" style={{ marginBottom: "1.1rem", fontSize: "var(--step--2)" }}>
        <Link href="/painel/citacoes" style={{ color: "var(--ember)" }}>← Citações no Google Acadêmico</Link>
      </p>

      <header style={{ marginBottom: "1.5rem" }}>
        <p className="eyebrow" style={{ marginBottom: "0.9rem" }}>Conferência de citações</p>
        <h1 style={{ fontSize: "var(--step-2)", lineHeight: 1.2 }}>{a.title}</h1>
        <p className="mono" style={{ color: "var(--ink-3)", marginTop: "0.8rem", fontSize: "var(--step--2)" }}>
          {listarAutores(autores, 3)}
          {a.issue && <> · {a.issue.label}</>}
          {a.publishedAt && <> · {dataLonga(a.publishedAt)}</>}
        </p>
        <p className="mono" style={{ marginTop: "0.4rem", fontSize: "var(--step--2)" }}>
          {a.doi
            ? <>DOI <a href={`https://doi.org/${a.doi}`} rel="noreferrer">{a.doi}</a></>
            : <span style={{ color: "var(--ink-4)" }}>sem DOI registrado</span>}
        </p>
      </header>

      {/* ---------- o passo a passo da conferência ---------- */}
      <div className="caixa" style={{ marginBottom: "1.75rem" }}>
        <div className="caixa__titulo">Como conferir</div>
        <ol style={{ paddingLeft: "1.3rem", display: "grid", gap: "0.5rem", margin: "0 0 1rem" }}>
          <li>Abra a busca abaixo. Ela já vai com o título exato entre aspas{a.doi && " e o DOI"}.</li>
          <li>Confirme que o resultado é este trabalho, e não outro de tema parecido.</li>
          <li>Leia o número ao lado de <em>Citado por</em> e registre aqui.</li>
          <li>Se houver lista de trabalhos citantes, copie o endereço dela no campo próprio.</li>
        </ol>
        <a className="btn btn--solid btn--sm" href={busca} rel="noreferrer nofollow" target="_blank">
          Buscar artigo no Google Acadêmico
        </a>
      </div>

      {/* ---------- estado atual ---------- */}
      <div className="caixa" style={{ marginBottom: "1.75rem" }}>
        <div className="caixa__titulo">O que a página pública mostra agora</div>
        {estado === "sem_conferencia" ? (
          <p style={{ margin: 0 }}>
            <strong>Contagem indisponível</strong>, com o botão de busca no Google Acadêmico.
            Nenhuma conferência foi registrada.
          </p>
        ) : (
          <p style={{ margin: 0 }}>
            <strong>{num(a.scholarCount ?? 0)}</strong>{" "}
            {estado === "zero"
              ? "citações, com a observação de que a conferência confirmou o registro sem citações"
              : a.scholarCount === 1 ? "citação" : "citações"}
            {a.scholarCheckedAt && <>, conferido em {dataLonga(a.scholarCheckedAt)}</>}
            {a.scholarBy?.name && <> por {a.scholarBy.name}</>}
            {a.scholarDemo && <> · marcado como valor de demonstração</>}.
          </p>
        )}
        {a.citationSource && (
          <p style={{ marginTop: "0.8rem", marginBottom: 0, color: "var(--ink-3)", fontSize: "var(--step--1)" }}>
            Para comparar: o {a.citationSource} registra {num(a.citationCount)}{" "}
            {a.citationCount === 1 ? "citação" : "citações"}
            {a.citationAt && <>, em consulta de {dataLonga(a.citationAt)}</>}. É normal
            os dois números não baterem, porque as bases cobrem fontes diferentes.
          </p>
        )}
      </div>

      {/* ---------- formulário ---------- */}
      <Formulario acao={salvarCitacoes} rotulo="Registrar conferência">
        <input type="hidden" name="slug" value={a.slug} />

        <fieldset className="grupo">
          <legend>Contagem conferida</legend>

          <div className="linha-campos">
            <div className="campo">
              <label htmlFor="contagem">Número em “Citado por”</label>
              <input id="contagem" name="contagem" type="number" min="0" step="1" inputMode="numeric"
                     defaultValue={a.scholarCount ?? ""} placeholder="ex.: 12" />
              <span className="campo__ajuda">
                Digite <strong>0</strong> quando a conferência mostrar que o registro
                existe e não tem citações. Zero é diferente de não conferido.
              </span>
            </div>

            <div className="campo">
              <label htmlFor="data">Data da conferência</label>
              <input id="data" name="data" type="date" defaultValue={paraCampo(a.scholarCheckedAt)} />
              <span className="campo__ajuda">
                Aparece ao leitor junto do número. Em branco, vale hoje.
              </span>
            </div>
          </div>

          <div className="campo">
            <label htmlFor="url">Lista de trabalhos citantes</label>
            <input id="url" name="url" type="url" defaultValue={a.scholarUrl ?? ""}
                   placeholder="https://scholar.google.com/scholar?cites=…" />
            <span className="campo__ajuda">
              O endereço do próprio “Citado por”. Com ele, a página do artigo
              ganha o link <em>Ver trabalhos que citaram este artigo</em>. Só são
              aceitos endereços do Google Acadêmico.
            </span>
          </div>

          <label className="caixa-marcar">
            <input type="checkbox" name="demonstracao" defaultChecked={a.scholarDemo} />
            <span>
              Este é um valor de demonstração. A página pública exibe o aviso
              <em> valor de demonstração</em> junto do número.
            </span>
          </label>

          {estado !== "sem_conferencia" && (
            <label className="caixa-marcar">
              <input type="checkbox" name="limpar" />
              <span>
                Apagar a conferência e voltar a mostrar “Contagem indisponível”.
                Marque esta caixa sozinha; os campos acima são ignorados.
              </span>
            </label>
          )}
        </fieldset>
      </Formulario>

      <p className="mono" style={{ marginTop: "1.5rem", fontSize: "var(--step--2)" }}>
        <Link href={`/artigo/${a.slug}`} style={{ color: "var(--ember)" }}>
          Ver a página pública deste artigo →
        </Link>
      </p>
    </div>
  );
}
